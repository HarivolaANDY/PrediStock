import { useState, useCallback, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { categoryAPI } from '@/services/api'
import { Package, Plus, Search, Edit, Eye, Trash2, BarChart3, DollarSign, Download, Upload, Filter, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ProductForm } from "@/components/ProductForm"
import { MetricCard } from "@/components/MetricCard"
import { BarChart } from "@/components/charts/BarChart"
import { LineChart } from "@/components/charts/LineChart"
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal"
import { saveProduct } from "@/components/productApi"
import { useProducts, StockStatusFilter } from "@/hooks/useProducts"
import ImportModal from "@/components/ImportModal"
import { CategoryForm } from "@/components/CategoryForm"
import { parseAxiosBlobResponse, downloadAll, AxiosResponseWithBlob } from "@/utils/blobUtils"
import API from '@/services/axios'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RotateCcw } from "lucide-react"
import { Category, ProductStats, InventaireItem, HistoriqueInventaire } from '@/types/types'
import { toast } from '@/components/ui/use-toast'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

type Product = {
  id: number
  product_img: string | null
  name: string
  sku: string
  description: string
  price: string
  stock_threshold: number
  current_stock: number
  unite_mesure: string
  is_active: boolean
  created_at: string
  updated_at: string
  category: number | null
  supplier: number | null
}

// ── Statut stock réel — aligné sur filter_stock_status (filters.py) ─────────
// rupture     : stock = 0
// critique    : 0 < stock <= 25% du seuil
// stock_faible: 25% < stock <= 50% du seuil
// en_stock    : stock > 50% du seuil (ou seuil = 0)
function getStockStatus(current_stock: number, stock_threshold: number): "rupture" | "critique" | "stock_faible" | "en_stock" {
  if (current_stock === 0) return "rupture"
  if (stock_threshold <= 0) return "en_stock"
  const ratio = current_stock / stock_threshold
  if (ratio <= 0.25) return "critique"
  if (ratio <= 0.50) return "stock_faible"
  return "en_stock"
}

const MOCK_REVENUE_DATA = [
  { month: "Jan", electronics: 32000, clothing: 21000, furniture: 14000 },
  { month: "Fév", electronics: 41000, clothing: 18000, furniture: 17000 },
  { month: "Mar", electronics: 28000, clothing: 25000, furniture: 12000 },
  { month: "Avr", electronics: 55000, clothing: 30000, furniture: 22000 },
  { month: "Mai", electronics: 47000, clothing: 27000, furniture: 19000 },
  { month: "Jun", electronics: 62000, clothing: 35000, furniture: 25000 },
]

const MetricCardsStats = ({ stats }: { stats: ProductStats | null }) => {
  if (!stats) return <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"><MetricCard title="Nombre de types de produits" value="Loading..." icon={<Package className="h-4 w-4" />} /></div>
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard title="Nombre de types de produits" value={stats.total_produits?.toString() || "0"} icon={<Package className="h-4 w-4" />} />
      <MetricCard title="Total Stock" value={stats.total_stock?.toString() || "0"} icon={<DollarSign className="h-4 w-4" />} variant="success" />
      <MetricCard
        title="Produits en Rupture"
        value={stats.total_stock_rupture?.toString() || "0"}
        description={stats.total_produits > 0 ? `${((stats.total_stock_rupture * 100) / stats.total_produits).toFixed(2)}% du catalogue` : "0%"}
        icon={<BarChart3 className="h-4 w-4" />}
        variant="destructive"
      />

      {/* ✅ Carte Alertes splitée — identique au Dashboard */}
      <div className="rounded-2xl border bg-white p-6 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm text-muted-foreground font-medium">Alertes Stock</p>
            <p className="text-xs text-muted-foreground">Produits sous seuil</p>
          </div>
          <AlertTriangle className="h-5 w-5 text-amber-500" />
        </div>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div className="rounded-lg border p-3 text-center">
            <p className="text-xs text-muted-foreground">Faible</p>
            <p className="text-xl font-bold text-orange-500">{stats.total_stock_faible ?? 0}</p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <p className="text-xs text-muted-foreground">Critique</p>
            <p className="text-xl font-bold text-red-500">{stats.total_stock_critique ?? 0}</p>
          </div>
        </div>
        <div className="mt-4 text-xs text-muted-foreground">Surveillance des stocks critiques</div>
      </div>
    </div>
  )
}

export default function Products() {
  const navigate = useNavigate()
  const [currentPage, setCurrentPage] = useState(1)
  const [categories, setCategories] = useState<{ [key: number]: string }>({})
  const [searchTerm, setSearchTerm] = useState("")
  const [isloadingStats, setIsLoadingStats] = useState(true)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [analyticsSearchTerm, setAnalyticsSearchTerm] = useState("")
  const [showProductForm, setShowProductForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  const [showImportModal, setShowImportModal] = useState(false)

  // ── Filtres ────────────────────────────────────────────────────────────────
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [filterUnit, setFilterUnit] = useState("")
  const [filterStatus, setFilterStatus] = useState<StockStatusFilter>("all")

  const { products, loading, error, refetch, totalCount, hasNextPage, hasPreviousPage } = useProducts({
    page: currentPage,
    category: filterCategory === "all" ? undefined : filterCategory,
    unite_mesure: filterUnit || undefined,
    search: searchTerm || undefined,
    status: filterStatus,
  })

  const [stats, setStats] = useState<ProductStats | null>(null)
  const [inventaire, setInventaire] = useState<InventaireItem[]>([])
  const [currentHistoriqueId, setCurrentHistoriqueId] = useState(0)
  const [currentHistoriqueDesc, setCurrentHistoriqueDesc] = useState("")
  const [list_histo, setList_histo] = useState<HistoriqueInventaire[]>([])
  const [redressID, setRedressID] = useState<number | string>()
  const [showInventoryForm, setShowInventoryForm] = useState(false)
  const [inventoryDescription, setInventoryDescription] = useState("")
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  // ── Graphique mouvements ───────────────────────────────────────────────────
  interface StockMovement {
    period: string
    inbound: number
    outbound: number
    net: number
    [key: string]: string | number
  }
  const [timeRange, setTimeRange] = useState<"day" | "month" | "year">("month")
  // ✅ Données réelles depuis /stock/mouvements/chart/?range=...
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([])
  const [stockMovementsLoading, setStockMovementsLoading] = useState(true)

  // ── Revenus ────────────────────────────────────────────────────────────────
  interface ChartDataPoint { [key: string]: unknown }
  const [revenueData, setRevenueData] = useState<ChartDataPoint[]>([])
  const isRevenueMock = revenueData.length === 0

  // ── Mouvements par produit ─────────────────────────────────────────────────
  interface ProductMovement {
    product: string
    inbound: number
    outbound: number
    net: number
    [key: string]: string | number
  }
  const [productMovements, setProductMovements] = useState<ProductMovement[]>([])
  const [productMovementsLoading, setProductMovementsLoading] = useState(true)
  const isFirstMount = useRef(true)

  // ── Pagination ─────────────────────────────────────────────────────────────
  const PAGE_SIZE = 10
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  const getVisiblePages = () => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const half = 2
    let start = Math.max(1, currentPage - half)
    let end = Math.min(totalPages, currentPage + half)
    if (currentPage <= half + 1) end = Math.min(totalPages, 5)
    if (currentPage >= totalPages - half) start = Math.max(1, totalPages - 4)
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }

  // Nombre de filtres actifs
  const activeFilterCount = [filterCategory !== "all", filterUnit !== "", filterStatus !== "all"].filter(Boolean).length

  const statusLabel: Record<StockStatusFilter, string> = {
    all: "Tous",
    en_stock: "En stock",
    stock_faible: "Stock faible",
    critique: "Critique",
    rupture: "Rupture",
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getStatusBadge = (current_stock: number, threshold: number) => {
    switch (getStockStatus(current_stock, threshold)) {
      case "rupture":      return <Badge variant="destructive">Rupture</Badge>
      case "critique":     return <Badge className="bg-orange-600 hover:bg-orange-600 text-white">Critique</Badge>
      case "stock_faible": return <Badge variant="secondary" className="bg-warning text-warning-foreground">Stock faible</Badge>
      case "en_stock":     return <Badge variant="default" className="bg-success text-success-foreground">En stock</Badge>
    }
  }

  // ── Appels API ─────────────────────────────────────────────────────────────
  const loadCategories = useCallback(async () => {
    try {
      const response = await categoryAPI.getCategories()
      if (response?.data) {
        const map = (response.data as Category[]).reduce((acc: Record<string, string>, c: Category) => {
          if (c.id) acc[c.id] = c.name; return acc
        }, {})
        setCategories(map)
      }
    } catch (e) { console.error("Erreur catégories:", e) }
  }, [])

  const getStats = useCallback(async () => {
    try {
      const res = await API.get('catalogue/products/stats/')
      setStats(res.data.data)
      setIsLoadingStats(false)
    } catch (e) { console.error('Erreur stats:', e) }
  }, [])

  // ✅ Données réelles — endpoint /stock/mouvements/chart/?range=...
  // Backend (views.py stock) : TruncMonth/Day/Year sur 'timestamp'
  const getStockMovements = useCallback(async (isInitial = false) => {
    if (!isInitial) setStockMovementsLoading(true)
    try {
      const response = await API.get('stock/mouvements/chart/', {
        params: { range: timeRange }
      })
      const data = response.data?.data || []
      setStockMovements(
        Array.isArray(data)
          ? data.map((item: StockMovement) => ({
              period: item.period ?? "—",
              inbound: item.inbound ?? 0,
              outbound: item.outbound ?? 0,
              net: item.net ?? 0,
            }))
          : []
      )
    } catch (e) {
      console.error('Erreur mouvements chart:', e)
      setStockMovements([])
    } finally {
      setStockMovementsLoading(false)
    }
  }, [timeRange])

  const getRevenueData = useCallback(async () => {
    try {
      const response = await API.get('catalogue/revenues/mensuel/')
      const data = response.data?.data || response.data?.results || response.data || []
      setRevenueData(Array.isArray(data) && data.length > 0 ? data : [])
    } catch { setRevenueData([]) }
  }, [])

  const getProductMovements = useCallback(async (isInitial = false) => {
    if (!isInitial) setProductMovementsLoading(true)
    try {
      const response = await API.get('stock/mouvements/chart_by_product/', {
        params: { limit: 20 }
      })
      const data = response.data?.data || []
      setProductMovements(
        Array.isArray(data)
          ? data.map((item: ProductMovement) => ({
              product: item.product ?? "Inconnu",
              inbound: item.inbound ?? 0,
              outbound: item.outbound ?? 0,
              net: item.net ?? 0,
            }))
          : []
      )
    } catch (e) {
      console.error('Erreur mouvements par produit:', e)
      setProductMovements([])
    } finally {
      setProductMovementsLoading(false)
    }
  }, [])

  const getInventaire = useCallback(async (id_histo: number) => {
    try {
      const response = await API.get('stock/inventaire/par_historique/', {
        params: id_histo !== 0 ? { historique: id_histo } : {}
      })
      const data = response.data?.data || response.data?.results || response.data || []
      setInventaire(Array.isArray(data) ? data : [])
      setIsLoadingStats(false)
    } catch (e) { console.error('Erreur inventaire:', e) }
  }, [])

  const Redresser_Inventaire = async (id_histo: number) => {
    await API.post("stock/inventaire/redresser/", { historique: id_histo })
    getListeHisto(); getInventaire(id_histo)
  }

  const getListeHisto = useCallback(async () => {
    try {
      const response = await API.get('stock/historique-inventaire/')
      const data = response.data?.data || response.data?.results || response.data || []
      if (!Array.isArray(data)) return
      setList_histo(data)
      if (data.length > 0) {
        setRedressID(data[0].id)
        setCurrentHistoriqueId(data[0].id)
        setCurrentHistoriqueDesc(data[0].description)
        getInventaire(data[0].id)
      }
    } catch (e) { console.error('Erreur historique:', e) }
  }, [])

  const Telecharger_pdf = async (historiqueId?: number, description?: string) => {
    if (!historiqueId) return
    setIsDownloadingPdf(true)
    try {
      const details = { table: "Inventaire", year: "2025", month: "", day: "", specific: historiqueId,
        titre: `Inventaire - ${description || 'Historique ' + historiqueId} - ${Date.now()}.pdf` }
      const res = (await API.post("core/pdf/dynamic/", details, { responseType: 'blob' })) as unknown as AxiosResponseWithBlob
      const parsed = await parseAxiosBlobResponse(res, details.titre)
      if (parsed.files?.length) downloadAll(parsed.files)
      toast({ title: "Succès", description: "PDF téléchargé." })
    } catch { toast({ title: "Erreur", description: "Échec du téléchargement.", variant: "destructive" }) }
    finally { setIsDownloadingPdf(false) }
  }

  const handlePdfUpload = async () => {
    if (!selectedPdfFile || !currentHistoriqueId) return
    setIsUploading(true)
    const formData = new FormData()
    formData.append('pdf_file', selectedPdfFile)
    formData.append('historique_id', currentHistoriqueId.toString())
    try {
      await API.post('core/pdf/upload-pdf/', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast({ title: "Succès", description: "PDF uploadé !" })
      setShowUploadModal(false); setSelectedPdfFile(null)
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } } }
      toast({ title: "Erreur", description: e.response?.data?.error || "Échec upload.", variant: "destructive" })
    } finally { setIsUploading(false) }
  }

  const handleResetFilters = () => {
    setSearchTerm(""); setFilterCategory("all"); setFilterUnit(""); setFilterStatus("all"); setCurrentPage(1)
  }

  const handleAddProduct = () => { setEditingProduct(null); setShowProductForm(true) }
  const handleViewDetails = (id: string) => navigate(`/product/${id}`)
  const handleEditProduct = (product: Product) => { setEditingProduct(product); setShowProductForm(true) }
  const handleCloseForm = () => { setShowProductForm(false); setEditingProduct(null); refetch() }
  const handleAddCategory = () => { setEditingCategory(null); setShowCategoryForm(true) }
  const handleCloseCategoryForm = () => { setShowCategoryForm(false); setEditingCategory(null) }
  const handleDeleteClick = (product: Product) => { setProductToDelete(product); setShowDeleteModal(true) }
  const handleConfirmDelete = async () => {
    if (!productToDelete) return
    try {
      await API.delete(`catalogue/products/${productToDelete.id}/`)
      toast({ title: "Succès", description: "Produit supprimé." })
      setShowDeleteModal(false)
      setProductToDelete(null)
      refetch() // ← rafraîchit la liste
    } catch (error) {
      console.error("Erreur suppression:", error)
      toast({ 
        title: "Erreur", 
        description: "Impossible de supprimer le produit.", 
        variant: "destructive" 
      })
    }
  }

  const handleSubmitCategory = async (data: Category) => {
    setShowCategoryForm(false); setEditingCategory(null); refetch()
    try {
      const response = await categoryAPI.getCategories()
      if (response?.data) {
        const map = (response.data as Category[]).reduce((acc: Record<string, string>, c: Category) => {
          if (c.id) acc[c.id] = c.name; return acc
        }, {})
        setCategories(map)
      }
    } catch (e) { console.error("Erreur catégories:", e) }
    toast({ title: "Succès", description: `Catégorie "${data.name}" ${data.id ? 'modifiée' : 'créée'}.` })
  }

  const handleSubmitProduct = async (data: FormData | Record<string, unknown>) => {
    try { await saveProduct(data); setShowProductForm(false); setEditingProduct(null) }
    catch (e) { console.error(e) }
    finally { refetch() }
  }

  const handleSubmitInventory = async () => {
    try {
      const response = await API.post('stock/inventaire/lancer/', { description: inventoryDescription })
      setShowInventoryForm(false); setInventoryDescription(""); getListeHisto()
      toast({ title: "Succès", description: "Inventaire préparé." })
      const newId = response.data.id || response.data.data?.id
      if (newId) Telecharger_pdf(newId, inventoryDescription)
    } catch { toast({ title: "Erreur", description: "Échec inventaire.", variant: "destructive" }) }
  }

  const handleExportCSV = async () => {
    try {
      const res = await API.get('catalogue/products/', { params: { page_size: 100 } })
      const allProducts = res.data?.data?.results || res.data?.data || []
      if (allProducts.length === 0) { toast({ title: "Exportation", description: "Aucune donnée." }); return }
      const headers = ["Produit", "Catégorie", "Prix", "Quantité", "Statut"]
      const rows = allProducts.map((p: Product) => {
        const sl = { rupture: "Rupture", critique: "Critique", stock_faible: "Stock faible", en_stock: "En stock" }[getStockStatus(p.current_stock, p.stock_threshold)]
        const cat = p.category ? (categories[p.category] || "Catégorie inconnue") : "Non catégorisé"
        return [`"${p.name.replace(/"/g, '""')}"`, `"${cat}"`, p.price, p.current_stock, sl]
      })
      const csv = [headers.join(";"), ...rows.map((r: (string | number)[]) => r.join(";"))].join("\n")
      const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' })
      const now = new Date()
      const filename = `products_${String(now.getDate()).padStart(2,'0')}${String(now.getMonth()+1).padStart(2,'0')}${now.getFullYear()}.csv`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.setAttribute('download', filename)
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
      toast({ title: "Succès", description: `${allProducts.length} produits exportés.` })
    } catch { toast({ title: "Erreur", description: "Échec export CSV.", variant: "destructive" }) }
  }

  const handlePreviousHistorique = () => {
    const idx = list_histo.findIndex(h => h.id === currentHistoriqueId)
    if (idx > 0) { setCurrentHistoriqueId(list_histo[idx-1].id); setCurrentHistoriqueDesc(list_histo[idx-1].description); getInventaire(list_histo[idx-1].id) }
  }
  const handleNextHistorique = () => {
    const idx = list_histo.findIndex(h => h.id === currentHistoriqueId)
    if (idx < list_histo.length - 1) { setCurrentHistoriqueId(list_histo[idx+1].id); setCurrentHistoriqueDesc(list_histo[idx+1].description); getInventaire(list_histo[idx+1].id) }
  }
  const hasPreviousHistorique = list_histo.length > 0 && list_histo.findIndex(h => h.id === currentHistoriqueId) > 0
  const hasNextHistorique = list_histo.length > 0 && list_histo.findIndex(h => h.id === currentHistoriqueId) < list_histo.length - 1

  // ── Effets ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      // Exécuter les appels initiaux en parallèle
      await Promise.all([
        getListeHisto(),
        getStats(),
        getRevenueData(),
        getProductMovements(true),
        loadCategories(),
        getStockMovements(true) // Appel initial sans déclencher setStockMovementsLoading(true)
      ])
    }
    init()
  }, [getListeHisto, getStats, getRevenueData, getProductMovements, loadCategories, getStockMovements])

  // Re-fetch mouvements quand timeRange change (après le premier mount)
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false
      return
    }
    getStockMovements()
  }, [timeRange, getStockMovements])


  if (loading) return <div className="flex items-center justify-center h-screen"><div className="text-xl font-medium">Chargement...</div></div>
  if (error) return <div className="flex flex-col items-center justify-center h-screen"><div className="max-w-md p-6 bg-red-50 border border-red-200 rounded-lg"><h2 className="text-xl font-bold text-red-700 mb-2">Erreur</h2><p className="text-red-600">{error}</p></div></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Produits</h1>
          <p className="text-muted-foreground">Gérez votre inventaire, vos analyses et vos indicateurs de performance</p>
        </div>
        <div className="flex gap-2">
          <Button className="gap-2 text-white bg-bouton hover:bg-bouton-hover" variant="outline" onClick={handleAddCategory}>
            <Plus className="h-4 w-4" />Nouvelle Catégorie
          </Button>
          <Button className="gap-2 text-white bg-bouton hover:bg-bouton-hover" variant="outline" onClick={handleAddProduct}>
            <Plus className="h-4 w-4" />Nouveau Produit
          </Button>
          <Button className="gap-2 text-white bg-bouton hover:bg-bouton-hover" variant="outline" onClick={() => setShowInventoryForm(true)}>
            Préparer un inventaire
          </Button>
        </div>
      </div>

      {stats && !isloadingStats ? <MetricCardsStats stats={stats} /> : <div>Loading...</div>}

      <Tabs defaultValue="inventory" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="inventory">Inventaire des Produits</TabsTrigger>
          <TabsTrigger value="analytics">Analyses</TabsTrigger>
          <TabsTrigger value="metrics">Inventaire périodique</TabsTrigger>
        </TabsList>

        {/* ── Inventaire ── */}
        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle>Liste des Produits</CardTitle>
              <CardDescription>Gérez votre inventaire et visualisez les niveaux de stock</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div className="relative w-full sm:w-auto flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher un produit ou une catégorie..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
                    className="pl-10"
                  />
                </div>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Filter className="h-4 w-4" />
                      Filtrer
                      {activeFilterCount > 0 && (
                        <Badge variant="secondary" className="ml-1 px-1 h-5 min-w-5 justify-center">{activeFilterCount}</Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <h4 className="font-medium leading-none">Filtres</h4>
                        <p className="text-sm text-muted-foreground">Affinez votre liste de produits</p>
                      </div>
                      <div className="grid gap-2">
                        <div className="grid gap-1">
                          <Label htmlFor="category">Catégorie</Label>
                          <Select value={filterCategory} onValueChange={(val) => { setFilterCategory(val); setCurrentPage(1) }}>
                            <SelectTrigger id="category"><SelectValue placeholder="Toutes les catégories" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Toutes les catégories</SelectItem>
                              {Object.entries(categories).map(([id, name]) => (
                                <SelectItem key={id} value={id}>{name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-1">
                          <Label htmlFor="unit">Unité</Label>
                          <Input id="unit" placeholder="kg, pièces, litres..." value={filterUnit}
                            onChange={(e) => { setFilterUnit(e.target.value); setCurrentPage(1) }} />
                        </div>
                        <div className="grid gap-1">
                          <Label htmlFor="status">Statut stock</Label>
                          <Select value={filterStatus} onValueChange={(val) => { setFilterStatus(val as StockStatusFilter); setCurrentPage(1) }}>
                            <SelectTrigger id="status"><SelectValue placeholder="Tous les statuts" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Tous les statuts</SelectItem>
                              <SelectItem value="en_stock">
                                <span className="flex items-center gap-2"><span className="inline-block w-2 h-2 rounded-full bg-green-500" />En stock</span>
                              </SelectItem>
                              <SelectItem value="stock_faible">
                                <span className="flex items-center gap-2"><span className="inline-block w-2 h-2 rounded-full bg-yellow-500" />Stock faible</span>
                              </SelectItem>
                              <SelectItem value="critique">
                                <span className="flex items-center gap-2"><span className="inline-block w-2 h-2 rounded-full bg-orange-500" />Critique</span>
                              </SelectItem>
                              <SelectItem value="rupture">
                                <span className="flex items-center gap-2"><span className="inline-block w-2 h-2 rounded-full bg-red-500" />Rupture</span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Button variant="ghost" className="w-full gap-2 text-muted-foreground hover:text-foreground" onClick={handleResetFilters}>
                        <RotateCcw className="h-4 w-4" />Réinitialiser les filtres
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>

                <Button variant="outline" className="gap-2" onClick={() => setShowImportModal(true)}>Importer</Button>
                <Button variant="outline" className="gap-2" onClick={handleExportCSV}>Exporter</Button>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produit</TableHead>
                      <TableHead>Catégorie</TableHead>
                      <TableHead>Prix</TableHead>
                      <TableHead>Quantité</TableHead>
                      <TableHead>Unité</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Aucun produit{filterStatus !== "all" ? ` avec le statut "${statusLabel[filterStatus]}"` : ""} trouvé
                        </TableCell>
                      </TableRow>
                    ) : products.map((product) => (
                      <TableRow key={product.id} onClick={() => handleViewDetails(String(product.id))} className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                              {product.product_img
                                ? <img src={product.product_img} alt={product.name} className="h-8 w-8 rounded-lg object-cover" />
                                : <Package className="h-4 w-4 text-muted-foreground" />}
                            </div>
                            <p className="font-medium">{product.name}</p>
                          </div>
                        </TableCell>
                        <TableCell>{product.category ? (categories[product.category] || "Catégorie inconnue") : "Non catégorisé"}</TableCell>
                        <TableCell>{parseFloat(product.price).toLocaleString()} Ariary</TableCell>
                        <TableCell>{product.current_stock}</TableCell>
                        <TableCell>{product.unite_mesure || "—"}</TableCell>
                        <TableCell>{getStatusBadge(product.current_stock, product.stock_threshold)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="cursor-pointer" onClick={(e) => { e.stopPropagation(); handleViewDetails(String(product.id)) }}><Eye className="h-4 w-4" /></div>
                            <div className="cursor-pointer text-blue-600" onClick={(e) => { e.stopPropagation(); handleEditProduct(product) }}><Edit className="h-4 w-4" /></div>
                            <div className="cursor-pointer text-red-600" onClick={(e) => { e.stopPropagation(); handleDeleteClick(product) }}><Trash2 className="h-4 w-4" /></div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* ✅ Pagination avec numéros de pages + ellipses */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Page <span className="font-medium">{currentPage}</span> sur{" "}
                  <span className="font-medium">{totalPages}</span> · {totalCount} produit{totalCount > 1 ? 's' : ''}
                  {filterStatus !== "all" && <> · filtre : <strong>{statusLabel[filterStatus]}</strong></>}
                </p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(currentPage - 1)} disabled={!hasPreviousPage} className="h-8 w-8 p-0">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  {/* Première page + ellipse */}
                  {getVisiblePages()[0] > 1 && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} className="h-8 w-8 p-0 text-xs">1</Button>
                      {getVisiblePages()[0] > 2 && <span className="px-1 text-muted-foreground text-sm">…</span>}
                    </>
                  )}

                  {getVisiblePages().map(page => (
                    <Button key={page} variant={page === currentPage ? "default" : "outline"} size="sm"
                      onClick={() => setCurrentPage(page)} className="h-8 w-8 p-0 text-xs">
                      {page}
                    </Button>
                  ))}

                  {/* Dernière page + ellipse */}
                  {getVisiblePages()[getVisiblePages().length - 1] < totalPages && (
                    <>
                      {getVisiblePages()[getVisiblePages().length - 1] < totalPages - 1 && <span className="px-1 text-muted-foreground text-sm">…</span>}
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalPages)} className="h-8 w-8 p-0 text-xs">{totalPages}</Button>
                    </>
                  )}

                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(currentPage + 1)} disabled={!hasNextPage} className="h-8 w-8 p-0">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Analyses ── */}
        <TabsContent value="analytics">
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Rechercher dans les analyses..." value={analyticsSearchTerm}
                    onChange={(e) => setAnalyticsSearchTerm(e.target.value)} className="pl-10" />
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* ✅ Graphique mouvements — données réelles avec sélecteur jour/mois/année */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        Tendances des mouvements de stock
                        {stockMovements.length === 0 && !stockMovementsLoading && (
                          <span className="text-xs font-normal text-muted-foreground italic">(aucune donnée)</span>
                        )}
                        {stockMovementsLoading && (
                          <span className="text-xs font-normal text-muted-foreground italic">Chargement...</span>
                        )}
                      </CardTitle>
                      <CardDescription>
                        {timeRange === "day" ? "Mouvements journaliers" : timeRange === "year" ? "Mouvements annuels" : "Mouvements mensuels"} · données réelles
                      </CardDescription>
                    </div>
                    <div className="flex gap-1">
                      {(["day", "month", "year"] as const).map(r => (
                        <Button key={r} size="sm" variant={timeRange === r ? "default" : "outline"}
                          onClick={() => setTimeRange(r)} className="h-7 px-2 text-xs">
                          {r === "day" ? "Jour" : r === "month" ? "Mois" : "Année"}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {stockMovements.length === 0 ? (
                    <div className="flex items-center justify-center h-[350px] text-muted-foreground text-sm">
                      {stockMovementsLoading ? "Chargement des données..." : "Aucun mouvement pour cette période"}
                    </div>
                  ) : (
                    <BarChart
                      data={stockMovements}
                      xAxisKey="period"
                      bars={[
                        { key: "inbound", name: "Entrées", color: "rgb(67, 110, 240)" },
                        { key: "outbound", name: "Sorties", color: "hsl(var(--destructive))" },
                        { key: "net", name: "Net", color: "hsl(var(--success))" },
                      ]}
                      height={350}
                    />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        Mouvements par produit
                        {productMovements.length === 0 && !productMovementsLoading && (
                          <span className="text-xs font-normal text-muted-foreground italic">(aucune donnée)</span>
                        )}
                        {productMovementsLoading && (
                          <span className="text-xs font-normal text-muted-foreground italic">Chargement...</span>
                        )}
                      </CardTitle>
                      <CardDescription>Entrées, sorties et net par produit · données réelles</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {productMovements.length === 0 ? (
                    <div className="flex items-center justify-center h-[350px] text-muted-foreground text-sm">
                      {productMovementsLoading ? "Chargement des données..." : "Aucun mouvement par produit disponible"}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <div style={{ minWidth: '800px', width: `${productMovements.length * 80}px` }}>
                        <BarChart
                          data={productMovements.filter((p) =>
                            p.product.toLowerCase().includes(analyticsSearchTerm.toLowerCase())
                          )}
                          xAxisKey="product"
                          bars={[
                            { key: "inbound", name: "Entrées", color: "rgb(67, 110, 240)" },
                            { key: "outbound", name: "Sorties", color: "hsl(var(--destructive))" },
                            { key: "net", name: "Net", color: "hsl(var(--success))" },
                          ]}
                          height={350}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Revenus */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Revenus par catégorie
                  {isRevenueMock
                    ? <span className="text-xs font-normal text-muted-foreground italic">(données fictives)</span>
                    : <span className="text-xs font-normal text-green-600 italic">données réelles</span>
                  }
                </CardTitle>
                <CardDescription>Revenus mensuels par catégorie de produit</CardDescription>
              </CardHeader>
              <CardContent>
                {revenueData.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-8">Aucune donnée de revenus disponible</div>
                ) : (
                  <LineChart
                    data={isRevenueMock ? MOCK_REVENUE_DATA : revenueData}
                    xAxisKey="month"
                    lines={
                      isRevenueMock
                        ? [
                            { key: "electronics", name: "Électronique", color: "rgb(67,110,240)" },
                            { key: "clothing", name: "Vêtements", color: "hsl(var(--success))" },
                            { key: "furniture", name: "Meubles", color: "hsl(var(--warning))" },
                          ]
                        : Object.keys(revenueData[0] || {})
                            .filter(k => k !== "month" && k !== "actual")
                            .map((key, i) => ({
                              key, name: key,
                              color: ["rgb(67,110,240)", "hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--destructive))"][i % 4],
                            }))
                    }
                    height={400}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Inventaire périodique ── */}
        <TabsContent value="metrics">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Inventaire périodique</CardTitle>
                <CardDescription>Suivi des quantités théoriques et physiques</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-4 border-t">
                  <div className="flex items-center gap-2 flex-1 justify-center sm:justify-start">
                    <Button variant="outline" size="sm" onClick={handlePreviousHistorique} disabled={!hasPreviousHistorique} className="min-w-[100px] bg-blue-100 hover:bg-blue-200 text-blue-800">Précédente</Button>
                    <span className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-foreground bg-accent/50 rounded-md min-w-[180px] justify-center text-center">
                      Historique - <span className="font-bold text-secondary truncate max-w-[120px] inline-block">{currentHistoriqueDesc || `ID: ${currentHistoriqueId}`}</span>
                    </span>
                    <Button variant="outline" size="sm" onClick={handleNextHistorique} disabled={!hasNextHistorique} className="min-w-[100px] bg-blue-100 hover:bg-blue-200 text-blue-800">Suivante</Button>
                  </div>
                  <div className="flex gap-2">
                    {redressID === currentHistoriqueId
                      ? <Button size="sm" onClick={() => Redresser_Inventaire(currentHistoriqueId)}>Redresser</Button>
                      : <span className="text-sm text-destructive flex items-center">Action impossible</span>
                    }
                    <Button variant="default" size="sm" onClick={() => Telecharger_pdf(currentHistoriqueId, currentHistoriqueDesc)} disabled={!currentHistoriqueId || isDownloadingPdf} className="bg-green-600 hover:bg-green-700 text-white gap-2">
                      {isDownloadingPdf ? "⏳ Téléchargement..." : <><Download className="h-4 w-4" /> PDF</>}
                    </Button>
                    <Button variant="default" size="sm" onClick={() => setShowUploadModal(true)} disabled={!currentHistoriqueId} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                      <Upload className="h-4 w-4" /> Upload PDF
                    </Button>
                  </div>
                </div>
                <div className="rounded-md border mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produit</TableHead>
                        <TableHead>Désignation</TableHead>
                        <TableHead>Qté théorique</TableHead>
                        <TableHead>Qté physique</TableHead>
                        <TableHead>Écart</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inventaire.length > 0 ? inventaire.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.produit_info?.product_mere?.name || "Inconnu"}</TableCell>
                          <TableCell>{item.produit_info?.designation || "N/A"}</TableCell>
                          <TableCell>{item.quantite_theo}</TableCell>
                          <TableCell>{item.quantite_phy}</TableCell>
                          <TableCell style={{ backgroundColor: item.quantite_theo > item.quantite_phy ? 'rgba(255,0,0,0.1)' : item.ecart !== 0 ? 'rgba(255,221,0,0.1)' : 'rgba(7,227,62,0.1)' }}>
                            {item.ecart}
                          </TableCell>
                        </TableRow>
                      )) : (
                        <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Aucun inventaire disponible.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {showProductForm && <ProductForm onClose={handleCloseForm} onSubmit={handleSubmitProduct} initialData={editingProduct || undefined} />}
      {showDeleteModal && productToDelete && (
        <DeleteConfirmationModal isOpen={showDeleteModal} onClose={() => { setShowDeleteModal(false); setProductToDelete(null) }} onConfirm={handleConfirmDelete} productName={productToDelete.name} />
      )}
      {showCategoryForm && <CategoryForm onClose={handleCloseCategoryForm} onSubmit={handleSubmitCategory} initialData={editingCategory} />}
      {showImportModal && <ImportModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} onImport={() => setShowImportModal(false)} onSuccess={() => refetch()} />}

      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Uploader un PDF d'inventaire</DialogTitle><DialogDescription>Sélectionnez un PDF à associer à l'historique actuel.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="pdf-upload">Fichier PDF</Label>
              <Input id="pdf-upload" type="file" accept=".pdf" className="cursor-pointer"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file?.type === 'application/pdf') setSelectedPdfFile(file)
                  else toast({ title: "Erreur", description: "Fichier PDF requis.", variant: "destructive" })
                }} />
              {selectedPdfFile && <p className="text-sm text-muted-foreground">Fichier : <strong>{selectedPdfFile.name}</strong></p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadModal(false)}>Annuler</Button>
            <Button onClick={handlePdfUpload} disabled={!selectedPdfFile || isUploading} className="bg-green-600 hover:bg-green-700 text-white">
              {isUploading ? "Upload en cours..." : "Uploader"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showInventoryForm} onOpenChange={setShowInventoryForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Préparer un inventaire</DialogTitle><DialogDescription>Entrez la description de l'inventaire.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">Description</Label>
              <Input id="description" value={inventoryDescription} onChange={(e) => setInventoryDescription(e.target.value)} className="col-span-3" />
            </div>
          </div>
          <DialogFooter><Button onClick={handleSubmitInventory}>Soumettre</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}