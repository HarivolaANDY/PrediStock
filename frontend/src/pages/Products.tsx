import { useState, useCallback, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { categoryAPI } from '@/services/api'
import { Package, Plus, Search, Edit, Eye, Trash2, BarChart3, DollarSign, TriangleAlert, Download, Upload } from "lucide-react"
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
import { useProducts } from "@/hooks/useProducts"
import ImportModal from "@/components/ImportModal"
import { CategoryForm } from "@/components/CategoryForm"
import { parseAxiosBlobResponse, downloadAll, AxiosResponseWithBlob } from "@/utils/blobUtils"
import API from '@/services/axios'

type Product = {
  id: number
  product_img: string | null
  name: string
  sku: string
  description: string
  price: string
  stock_threshold: number
  current_stock: number
  unite_mesure: string        // ← ligne ajoutée
  is_active: boolean
  created_at: string
  updated_at: string
  category: number | null
  supplier: number | null
}

import { Category as CategoryType } from '@/types/types'
import { toast } from '@/components/ui/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

// ---------------------------------------------------------------------------
// Données fictives de fallback — utilisées UNIQUEMENT si l'API ne renvoie rien
// ---------------------------------------------------------------------------
const MOCK_STOCK_MOVEMENT_DATA = [
  { month: "Jan", inbound: 450, outbound: 380, net: 70 },
  { month: "Fév", inbound: 520, outbound: 420, net: 100 },
  { month: "Mar", inbound: 380, outbound: 480, net: -100 },
  { month: "Avr", inbound: 680, outbound: 520, net: 160 },
  { month: "Mai", inbound: 590, outbound: 450, net: 140 },
  { month: "Jun", inbound: 720, outbound: 580, net: 140 },
]

const MOCK_REVENUE_DATA = [
  { month: "Jan", electronics: 32000, clothing: 21000, furniture: 14000 },
  { month: "Fév", electronics: 41000, clothing: 18000, furniture: 17000 },
  { month: "Mar", electronics: 28000, clothing: 25000, furniture: 12000 },
  { month: "Avr", electronics: 55000, clothing: 30000, furniture: 22000 },
  { month: "Mai", electronics: 47000, clothing: 27000, furniture: 19000 },
  { month: "Jun", electronics: 62000, clothing: 35000, furniture: 25000 },
]
// ---------------------------------------------------------------------------

export default function Products() {
  // ── States ──
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
  const { products, loading, error, refetch, totalCount, hasNextPage, hasPreviousPage } = useProducts(currentPage)
  
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [inventaire, setInventaire] = useState<InventaireItem[]>([])
  const [currentHistoriqueId, setCurrentHistoriqueId] = useState<number>(0)
  const [currentHistoriquedesc, setCurrentHistoriqueDesc] = useState("")
  const [list_histo, setList_histo] = useState<HistoriqueInventaire[]>([])
  const [redressID, setRedressID] = useState<number | string>()
  const [showInventoryForm, setShowInventoryForm] = useState(false)
  const [inventoryDescription, setInventoryDescription] = useState("")
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [downloadedFiles, setDownloadedFiles] = useState<{ blob: Blob; filename: string }[]>([])

  // ── États pour les données réelles des graphiques ──────────────────────────
  interface ChartDataPoint {
    [key: string]: unknown;
  }
  const [stockMovements, setStockMovements] = useState<ChartDataPoint[]>([])
  const [revenueData, setRevenueData] = useState<ChartDataPoint[]>([])

  // ───────────────────────────────────────────────────────────────────────────

  const loadCategories = useCallback(async () => {
    try {
      const response = await categoryAPI.getCategories()
      if (response && response.data) {
        const categoryMap = (response.data as Category[]).reduce((acc: Record<string, string>, category: Category) => {
          if (category.id) acc[category.id] = category.name
          return acc
        }, {} as Record<string, string>)
        setCategories(categoryMap)
      }
    } catch (error) {
      console.error("Erreur rechargement catégories:", error)
    }
  }, [])

  // Données effectives : réelles si disponibles, fictives sinon
  const stockMovementChartData = stockMovements.length > 0 ? stockMovements : MOCK_STOCK_MOVEMENT_DATA
  const revenueChartData = revenueData.length > 0 ? revenueData : MOCK_REVENUE_DATA
  const isStockMovementMock = stockMovements.length === 0
  const isRevenueMock = revenueData.length === 0
  // ───────────────────────────────────────────────────────────────────────────

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getStatusBadge = (current_stock: number, threshold: number) => {
    const pourcentage = (threshold * 15) / 100
    if (current_stock === 0) return <Badge variant="destructive">Rupture</Badge>
    if (current_stock <= pourcentage) return <Badge variant="secondary" className="bg-warning text-warning-foreground">Stock faible</Badge>
    return <Badge variant="default" className="bg-success text-success-foreground">En stock</Badge>
  }

  // ── Appels API ─────────────────────────────────────────────────────────────
  const getStats = useCallback(async () => {
    try {
      const res = await API.get('catalogue/products/stats/')
      setStats(res.data.data)
      setIsLoadingStats(false)
    } catch (error) {
      console.error('Erreur stats:', error)
    }
  }, [])

  /** Mouvements de stock mensuels — fallback sur MOCK_STOCK_MOVEMENT_DATA si vide */
  const getStockMovements = useCallback(async () => {
    try {
      const response = await API.get('stock/mouvements/')
      const data = response.data?.data || response.data?.results || response.data || []
      setStockMovements(Array.isArray(data) && data.length > 0 ? data : [])
    } catch (error) {
      console.error('Erreur mouvements de stock:', error)
      setStockMovements([])
    }
  }, [])

  /** Revenus par catégorie mensuels — fallback sur MOCK_REVENUE_DATA si vide */
  const getRevenueData = useCallback(async () => {
    try {
      const response = await API.get('catalogue/revenues/mensuel/') // Missing path: api/catalogue/revenues/mensuel/
      const data = response.data?.data || response.data?.results || response.data || []
      setRevenueData(Array.isArray(data) && data.length > 0 ? data : [])
    } catch (error) {
      console.error('Erreur revenus:', error)
      setRevenueData([]) // déclenche le fallback fictif
    }
  }, [])

  const getInventaire = async (id_histo: number) => {
    try {
      const params = id_histo !== 0 ? { historique: id_histo } : {}
      const response = await API.get('stock/inventaire/par_historique/', { params })
      const data = response.data?.data || response.data?.results || response.data || []
      setInventaire(Array.isArray(data) ? data : [])
      setIsLoadingStats(false)
    } catch (error) {
      console.error('Erreur inventaire:', error)
    }
  }

  const Redresser_Inventaire = async (id_histo: number) => {
    await API.post("stock/inventaire/redresser/", { historique: id_histo })
    getListeHisto()
    getInventaire(id_histo)
  }

  const getListeHisto = useCallback(async () => {
    try {
      const response = await API.get('stock/historique-inventaire/')
      const data = response.data?.data || response.data?.results || response.data || []
      if (!Array.isArray(data)) { console.warn('Format inattendu:', response.data); return }
      setList_histo(data)
      if (data.length > 0) {
        const latest = data[0]
        setRedressID(latest.id)
        setCurrentHistoriqueId(latest.id)
        setCurrentHistoriqueDesc(latest.description)
        getInventaire(latest.id)
      }
    } catch (error) {
      console.error('Erreur historique:', error)
    }
  }, [])

  const Telecharger_pdf = async (historiqueId?: number, description?: string) => {
    if (!historiqueId) return
    setIsDownloadingPdf(true)
    try {
      const details = {
        table: "Inventaire",
        year: "2025",
        month: "",
        day: "",
        specific: historiqueId,
        titre: `Inventaire - ${description || 'Historique ' + historiqueId} - ${Date.now()}.pdf`,
      }
      const res = (await API.post("core/pdf/dynamic/", details, { responseType: 'blob' })) as unknown as AxiosResponseWithBlob
      const parsed = await parseAxiosBlobResponse(res, details.titre)
      if (parsed.files?.length) {
        setDownloadedFiles(prev => [...prev, ...parsed.files])
        downloadAll(parsed.files)
      }
      toast({ title: "Succès", description: "PDF téléchargé avec succès.", variant: "default" })
    } catch (err) {
      console.error("Erreur PDF:", err)
      toast({ title: "Erreur", description: "Échec du téléchargement du PDF.", variant: "destructive" })
    } finally {
      setIsDownloadingPdf(false)
    }
  }

  const handlePdfUpload = async () => {
    if (!selectedPdfFile || !currentHistoriqueId) return
    setIsUploading(true)
    const formData = new FormData()
    formData.append('pdf_file', selectedPdfFile)
    formData.append('historique_id', currentHistoriqueId.toString())
    try {
      await API.post('core/pdf/upload-pdf/', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast({ title: "Succès", description: "PDF uploadé avec succès !", variant: "default" })
      setShowUploadModal(false)
      setSelectedPdfFile(null)
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } };
      console.error(err)
      toast({ title: "Erreur", description: axiosError.response?.data?.error || "Échec de l'upload.", variant: "destructive" })
    } finally {
      setIsUploading(false)
    }
  }

  // ── Filtres produits ───────────────────────────────────────────────────────
  const filteredProductsList = useMemo(() => {
    return products?.filter((product: Product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(product.category).toLowerCase().includes(searchTerm.toLowerCase())
    ) ?? []
  }, [products, searchTerm])

  const allFilteredProducts = filteredProductsList

  // ── Handlers UI ────────────────────────────────────────────────────────────
  const handleAddProduct = () => { setEditingProduct(null); setShowProductForm(true); refetch() }
  const handleViewDetails = (id: string) => navigate(`/product/${id}`)
  const handleEditProduct = (product: Product) => { setEditingProduct(product); setShowProductForm(true); refetch() }
  const handleCloseForm = () => { setShowProductForm(false); setEditingProduct(null); refetch() }
  const handleAddCategory = () => { setEditingCategory(null); setShowCategoryForm(true) }
  const handleCloseCategoryForm = () => { setShowCategoryForm(false); setEditingCategory(null) }
  const handleImportModal = () => setShowImportModal(true)
  const handleDeleteClick = (product: Product) => { setProductToDelete(product); setShowDeleteModal(true); refetch() }
  const handleConfirmDelete = () => { setShowDeleteModal(false); setProductToDelete(null); refetch() }

  const handleSubmitCategory = async (data: Category) => {
    setShowCategoryForm(false)
    setEditingCategory(null)
    if (typeof refetch === 'function') refetch()
    try {
      const response = await categoryAPI.getCategories()
      if (response && response.data) {
        const categoryMap = (response.data as Category[]).reduce((acc: Record<string, string>, category: Category) => {
          if (category.id) acc[category.id] = category.name
          return acc
        }, {} as Record<string, string>)
        setCategories(categoryMap)
      }
    } catch (error) {
      console.error("Erreur rechargement catégories:", error)
    }
    toast({ title: "Succès", description: `La catégorie ${data.name} a été ${data.id ? 'modifiée' : 'créée'} avec succès.`, variant: "default" })
  }

  const handleSubmitProduct = async (data: FormData | Record<string, unknown>) => {
    try {
      await saveProduct(data)
      setShowProductForm(false)
      setEditingProduct(null)
    } catch (error) {
      console.error(error)
    } finally {
      refetch()
    }
  }

  const handleSubmitInventory = async () => {
    try {
      const response = await API.post('stock/inventaire/lancer/', { description: inventoryDescription })
      setShowInventoryForm(false)
      setInventoryDescription("")
      getListeHisto()
      toast({ title: "Succès", description: "Inventaire préparé avec succès.", variant: "default" })
      const newHistoriqueId = response.data.id || response.data.data.id
      const newDescription = inventoryDescription || response.data.description
      if (newHistoriqueId) Telecharger_pdf(newHistoriqueId, newDescription)
    } catch (error) {
      console.error("Erreur inventaire:", error)
      toast({ title: "Erreur", description: "Échec de la préparation de l'inventaire.", variant: "destructive" })
    }
  }

  // Navigation historiques
  const handlePreviousHistorique = () => {
    const idx = list_histo.findIndex(h => h.id === currentHistoriqueId)
    if (idx > 0) {
      setCurrentHistoriqueId(list_histo[idx - 1].id)
      setCurrentHistoriqueDesc(list_histo[idx - 1].description)
      getInventaire(list_histo[idx - 1].id)
    }
  }
  const handleNextHistorique = () => {
    const idx = list_histo.findIndex(h => h.id === currentHistoriqueId)
    if (idx < list_histo.length - 1) {
      setCurrentHistoriqueId(list_histo[idx + 1].id)
      setCurrentHistoriqueDesc(list_histo[idx + 1].description)
      getInventaire(list_histo[idx + 1].id)
    }
  }
  const hasPreviousHistorique = list_histo?.length > 0 && list_histo.findIndex(h => h.id === currentHistoriqueId) > 0
  const hasNextHistorique = list_histo?.length > 0 && list_histo.findIndex(h => h.id === currentHistoriqueId) < list_histo.length - 1

  // ── Effet initial ──────────────────────────────────────────────────────────
  useEffect(() => {
    getListeHisto()
    getStats()
    getStockMovements()
    getRevenueData()
    loadCategories()
  }, [getListeHisto, getStats, getStockMovements, getRevenueData, loadCategories])


  // ── Composant MetricCards ──────────────────────────────────────────────────
  const MetricCardsStats = () => {
    if (!stats) return <div>Loading...</div>
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Nombre de type des produits"
          value={stats.total_produits?.toString() || "0"}
          icon={<Package className="h-4 w-4" />}
        />
        <MetricCard
          title="Calcul Total Stock"
          value={stats.total_stock?.toString() || "0"}
          icon={<DollarSign className="h-4 w-4" />}
          variant="success"
        />
        <MetricCard
          title="En Stock Faible"
          value={stats.total_stock_faible?.toString() || "0"}
          description={stats.total_produits && (stats.total_produits as number) > 0 ? ((((stats.total_stock_faible as number) * 100) / (stats.total_produits as number)).toFixed(2) + "% du stock total") : "0% du stock total"}
          icon={<TriangleAlert className="h-4 w-4" />}
          variant="warning"
        />
        <MetricCard
          title="Produits en Rupture"
          value={stats.total_stock_rupture?.toString() || "0"}
          description={stats.total_produits && (stats.total_produits as number) > 0 ? ((((stats.total_stock_rupture as number) * 100) / (stats.total_produits as number)).toFixed(2) + "% du stock total") : "0% du stock total"}
          icon={<BarChart3 className="h-4 w-4" />}
          variant="destructive"
        />
      </div>
    )
  }

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-xl font-medium">Chargement...</div>
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center h-screen">
      <div className="max-w-md p-6 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-xl font-bold text-red-700 mb-2">Erreur</h2>
        <p className="text-red-600">{error}</p>
        {error.includes("token") && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h3 className="text-lg font-semibold text-amber-700 mb-2">Comment résoudre ce problème :</h3>
            <ol className="list-decimal list-inside text-amber-600 space-y-2">
              <li>Créez un fichier <code className="bg-amber-100 px-1 rounded">.env.local</code> à la racine du projet frontend</li>
              <li>Ajoutez la variable <code className="bg-amber-100 px-1 rounded">VITE_DEFAULT_AUTH_TOKEN=votre_token_ici</code></li>
              <li>Redémarrez l'application</li>
            </ol>
            <p className="mt-2 text-amber-600">Consultez le README pour plus d'informations.</p>
          </div>
        )}
      </div>
    </div>
  )

  // ── Rendu ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Produits</h1>
          <p className="text-muted-foreground">
            Gérez votre inventaire de produits, vos analyses et vos indicateurs de performance
          </p>
        </div>
        <div className="flex gap-2">
          <Button className="gap-2 text-white bg-bouton hover:bg-bouton-hover" variant="outline" onClick={handleAddCategory}>
            <Plus className="h-4 w-4" />
            Nouvelle Catégorie
          </Button>
          <Button className="gap-2 text-white bg-bouton hover:bg-bouton-hover" variant="outline" onClick={handleAddProduct}>
            <Plus className="h-4 w-4" />
            Nouveau Produit
          </Button>
          <Button className="gap-2 text-white bg-bouton hover:bg-bouton-hover" variant="outline" onClick={() => setShowInventoryForm(true)}>
            Preparer un inventaire
          </Button>
        </div>
      </div>

      {/* Overview Metrics */}
      {stats && !isloadingStats ? <MetricCardsStats /> : <div>Loading...</div>}

      <Tabs defaultValue="inventory" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="inventory">Inventaire des Produits</TabsTrigger>
          <TabsTrigger value="analytics">Analyses</TabsTrigger>
          <TabsTrigger value="metrics">Inventaire</TabsTrigger>
        </TabsList>

        {/* ── Onglet Inventaire des produits ── */}
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
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button variant="outline" className="gap-2">
                  <Search className="h-4 w-4" />
                  Filtrer
                </Button>
                <Button variant="outline" className="gap-2" onClick={handleImportModal}>Importer</Button>
                <Button variant="outline" className="gap-2">Exporter</Button>
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
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allFilteredProducts.map((product) => (
                      <TableRow
                        key={product.id}
                        onClick={() => handleViewDetails(String(product.id))}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                      >
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
                        <TableCell>
                          {product.category ? (categories[product.category] || "Catégorie inconnue") : "Non catégorisé"}
                        </TableCell>
                        <TableCell>{parseFloat(product.price).toLocaleString()} Ariary</TableCell>
                        <TableCell>{product.current_stock}</TableCell>
                        <TableCell>{product.unite_mesure || "—"}</TableCell>
                        <TableCell>{getStatusBadge(product.current_stock, product.stock_threshold)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="cursor-pointer" title="Voir les détails" onClick={(e) => { e.stopPropagation(); handleViewDetails(String(product.id)) }}>
                              <Eye className="h-4 w-4" />
                            </div>
                            <div className="cursor-pointer text-blue-600" title="Modifier" onClick={(e) => { e.stopPropagation(); handleEditProduct(product) }}>
                              <Edit className="h-4 w-4" />
                            </div>
                            <div className="cursor-pointer text-red-600" title="Supprimer" onClick={(e) => { e.stopPropagation(); handleDeleteClick(product) }}>
                              <Trash2 className="h-4 w-4" />
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">{allFilteredProducts.length} produits sur {totalCount}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={!hasPreviousPage}>
                    Page précédente
                  </Button>
                  <p className="flex items-center text-sm text-muted-foreground px-2">Page {currentPage}</p>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(currentPage + 1)} disabled={!hasNextPage}>
                    Page suivante
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Onglet Analyses ── */}
        <TabsContent value="analytics">
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher dans les analyses..."
                    value={analyticsSearchTerm}
                    onChange={(e) => setAnalyticsSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Graphique 1 : Mouvements de stock — réel ou fictif */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Tendances des mouvements boursiers
                    {isStockMovementMock && (
                      <span className="text-xs font-normal text-muted-foreground italic">(données fictives)</span>
                    )}
                  </CardTitle>
                  <CardDescription>Mouvements mensuels des stocks entrants et sortants</CardDescription>
                </CardHeader>
                <CardContent>
                  <BarChart
                    data={stockMovementChartData}
                    xAxisKey="month"
                    bars={[
                      { key: "inbound", name: "Entrant", color: "rgb(67, 110, 240)" },
                      { key: "outbound", name: "Sortant", color: "hsl(var(--destructive))" },
                      { key: "net", name: "Changement net", color: "hsl(var(--success))" },
                    ]}
                    height={350}
                  />
                </CardContent>
              </Card>

              {/* Graphique 2 : Performance du produit — toujours réel */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance du Produit</CardTitle>
                  <CardDescription>Stock actuel vs seuil de stock par produit</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto" style={{ maxWidth: '100%' }}>
                    <div style={{ minWidth: '800px', width: `${allFilteredProducts.length * 80}px` }}>
                      <BarChart
                        data={allFilteredProducts
                          .filter(p => p.name.toLowerCase().includes(analyticsSearchTerm.toLowerCase()))
                          .map(product => ({
                            ...product,
                            name: product.name,
                            stock_threshold: product.stock_threshold,
                            current_stock_ok: product.current_stock >= product.stock_threshold ? product.current_stock : 0,
                            current_stock_low: product.current_stock < product.stock_threshold ? product.current_stock : 0,
                          }))}
                        xAxisKey="name"
                        bars={[
                          { key: "stock_threshold", name: "Seuil de stock", color: "rgb(67, 110, 240)" },
                          { key: "current_stock_ok", name: "Stock actuel (OK)", color: "hsl(var(--success))" },
                          { key: "current_stock_low", name: "Stock actuel (Faible)", color: "hsl(var(--destructive))" },
                        ]}
                        height={350}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Graphique 3 : Revenus par catégorie — réel ou fictif */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Tendances des revenus
                  {isRevenueMock && (
                    <span className="text-xs font-normal text-muted-foreground italic">(données fictives)</span>
                  )}
                </CardTitle>
                <CardDescription>Tendances des revenus par catégorie de produits au fil du temps</CardDescription>
              </CardHeader>
              <CardContent>
                <LineChart
                  data={revenueChartData}
                  xAxisKey="month"
                  lines={[
                    { key: "electronics", name: "Electronique", color: "rgb(67, 110, 240)" },
                    { key: "clothing", name: "Vêtements", color: "hsl(var(--success))" },
                    { key: "furniture", name: "Meubles", color: "hsl(var(--warning))" },
                  ]}
                  height={400}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Onglet Inventaire périodique ── */}
        <TabsContent value="metrics">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Inventaire périodique</CardTitle>
                <CardDescription>Quantité des produits disponibles dans l'inventaire</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-4 border-t">
                  <div className="flex items-center gap-2 flex-1 justify-center sm:justify-start">
                    <Button variant="outline" size="sm" onClick={handlePreviousHistorique} disabled={!hasPreviousHistorique} className="min-w-[100px] bg-blue-100 hover:bg-blue-200 text-blue-800">
                      Précédente
                    </Button>
                    <span className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-foreground bg-accent/50 rounded-md min-w-[180px] justify-center text-center">
                      Historique - <span className="font-bold text-secondary truncate max-w-[120px] inline-block">{currentHistoriquedesc || `ID: ${currentHistoriqueId}`}</span>
                    </span>
                    <Button variant="outline" size="sm" onClick={handleNextHistorique} disabled={!hasNextHistorique} className="min-w-[100px] bg-blue-100 hover:bg-blue-200 text-blue-800">
                      Suivante
                    </Button>
                  </div>

                  <div className="flex gap-2 justify-center sm:justify-end">
                    {redressID === currentHistoriqueId ? (
                      <Button className="text-sm font-medium" onClick={() => Redresser_Inventaire(currentHistoriqueId)} size="sm">
                        Redresser
                      </Button>
                    ) : (
                      <span className="text-sm font-medium text-destructive flex items-center">Action impossible</span>
                    )}
                    <Button variant="default" size="sm" onClick={() => Telecharger_pdf(currentHistoriqueId, currentHistoriquedesc)} disabled={!currentHistoriqueId || isDownloadingPdf} className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2">
                      {isDownloadingPdf ? <>⏳ Téléchargement...</> : <><Download className="h-4 w-4" /> PDF</>}
                    </Button>
                    <Button variant="default" size="sm" onClick={() => setShowUploadModal(true)} disabled={!currentHistoriqueId} className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2">
                      <Upload className="h-4 w-4" /> Upload PDF
                    </Button>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground sm:hidden text-center mt-2">{inventaire.length} lignes dans cet inventaire</p>

                <div className="rounded-md border mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produit</TableHead>
                        <TableHead>Désignation</TableHead>
                        <TableHead>Quantité théorique/Unité</TableHead>
                        <TableHead>Quantité physique/Unité</TableHead>
                        <TableHead>Ecart</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inventaire?.length > 0 ? (
                        inventaire.map((item: InventaireItem, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.produit_info?.product_mere?.name || "Inconnu"}</TableCell>
                            <TableCell>{item.produit_info?.designation || "N/A"}</TableCell>
                            <TableCell>{item.quantite_theo}</TableCell>
                            <TableCell>{item.quantite_phy}</TableCell>
                            <TableCell style={{
                              backgroundColor: item.quantite_theo > item.quantite_phy
                                ? 'rgba(255, 0, 0, 0.1)'
                                : (item.ecart != 0 ? 'rgba(255, 221, 0, 0.1)' : 'rgba(7, 227, 62, 0.1)'),
                            }}>
                              {item.ecart}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            Aucun inventaire disponible pour cet historique.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Modales ── */}
      {showProductForm && (
        <ProductForm onClose={handleCloseForm} onSubmit={handleSubmitProduct} initialData={editingProduct || undefined} />
      )}

      {showDeleteModal && productToDelete && (
        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => { setShowDeleteModal(false); setProductToDelete(null) }}
          onConfirm={handleConfirmDelete}
          productName={productToDelete.name}
        />
      )}

      {showCategoryForm && (
        <CategoryForm onClose={handleCloseCategoryForm} onSubmit={handleSubmitCategory} initialData={editingCategory} />
      )}

      {showImportModal && (
        <ImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImport={() => setShowImportModal(false)}
          onSuccess={() => refetch()}
        />
      )}

      {/* Modal upload PDF */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Uploader un PDF d'inventaire</DialogTitle>
            <DialogDescription>Sélectionnez un fichier PDF à associer à l'historique actuel.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="pdf-upload">Fichier PDF</Label>
              <Input
                id="pdf-upload"
                type="file"
                accept=".pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file && file.type === 'application/pdf') {
                    setSelectedPdfFile(file)
                  } else {
                    toast({ title: "Erreur", description: "Veuillez sélectionner un fichier PDF.", variant: "destructive" })
                  }
                }}
                className="cursor-pointer"
              />
              {selectedPdfFile && (
                <p className="text-sm text-muted-foreground">Fichier sélectionné : <strong>{selectedPdfFile.name}</strong></p>
              )}
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

      {/* Modal inventaire */}
      <Dialog open={showInventoryForm} onOpenChange={setShowInventoryForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Préparer un inventaire</DialogTitle>
            <DialogDescription>Entrez la description de l'inventaire.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">Description</Label>
              <Input
                id="description"
                value={inventoryDescription}
                onChange={(e) => setInventoryDescription(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleSubmitInventory}>Soumettre</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}