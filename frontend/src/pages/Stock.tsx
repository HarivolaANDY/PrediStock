import { useState, useEffect, useMemo, useCallback } from "react"
import { Package, TrendingDown, AlertTriangle, Search, DollarSign, RefreshCw, ChevronDown, ChevronRight, ChevronLeft, Download } from "lucide-react"
import { stockMouvementService } from "@/services/stockMouvementService"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LineChart } from "@/components/charts/LineChart"
import { BarChart } from "@/components/charts/BarChart"
import { useProducts } from "@/hooks/useProducts"
import { MetricCard } from "@/components/MetricCard"
import { StockMouvementForm } from "@/components/StockMouvementForm"
import ImportModalGenerer from "@/components/ImportModalGenerer"
import API from "@/services/axios"
import { parseAxiosBlobResponse, downloadAll, AxiosResponseWithBlob } from "@/utils/blobUtils"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { exportToCSV } from "@/utils/csvUtils"
import { toast } from "@/hooks/use-toast"
import { Category, StockMouvement, PDV, StockTrendPoint } from "@/types/types"


function resolveProductName(mouvement: StockMouvement, PDVs: PDV[]): string {
  // 1. Champ unifié calculé côté backend (couvre tous les cas : dv seul, parent seul, les deux)
  if ((mouvement as any).produit_display_name) return (mouvement as any).produit_display_name
  // 2. Nom du sous-produit (variante)
  if ((mouvement as any).produit_dv_name) return (mouvement as any).produit_dv_name
  // 3. Détails embarqués
  const details = mouvement.product_details
  if (details) {
    if (details.designation) return details.designation
    if (details.name) return details.name
    if (details.nom) return details.nom
  }
  if (mouvement.product_name) return mouvement.product_name
  if (mouvement.produit_nom) return mouvement.produit_nom
  // 4. Résolution par ID via liste PDV
  const produitId = mouvement.produit ?? mouvement.product ?? null
  if (produitId !== null) {
    const match = PDVs.find((p) => p.product === produitId || p.id === produitId)
    if (match) return match.designation || match.infos?.name || ""
  }
  return "Produit inconnu"
}

// ── Statut stock aligné sur filter_stock_status (filters.py) ─────────────
// rupture     : stock = 0
// critical    : 0 < stock <= 25% du seuil
// warning     : 25% < stock <= 50% du seuil
// low         : 50% < stock <= seuil (ok dans la logique du tableau)
function getAlertStatus(current_stock: number, stock_threshold: number): "rupture" | "critical" | "warning" | "low" {
  if (current_stock === 0) return "rupture"
  if (stock_threshold <= 0) return "low"
  const ratio = current_stock / stock_threshold
  if (ratio <= 0.25) return "critical"
  if (ratio <= 0.50) return "warning"
  return "low"
}

interface ProductStats {
  total_produits: number
  total_stock: number
  total_stock_faible: number    // 25% < stock <= 50% du seuil
  total_stock_critique: number  // 0 < stock <= 25% du seuil
  total_stock_rupture: number   // stock = 0
  total_stock_value?: number    // valeur totale du stock
}

const ITEMS_PER_PAGE = 10
const HISTORY_PER_PAGE = 20

export default function Stock() {
  const [categories, setCategories] = useState<Category[]>([])
  // ✅ Tous les produits pour alertItems et valeurTotaleStock
  const { products, refetch } = useProducts({ page: 1, status: "all" })
  const [alertProducts, setAlertProducts] = useState<any[]>([])
  const [alertLoading, setAlertLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [alertSearchTerm, setAlertSearchTerm] = useState("")
  const [stockMouvements, setStockMouvements] = useState<StockMouvement[]>([])
  const [stockMouvementsLoading, setStockMouvementsLoading] = useState(false)
  const [stockMouvementsError, setStockMouvementsError] = useState<string | null>(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [isloadingexport, setIsloadingexport] = useState(false)
  const [isLoadingPDVs, setIsLoadingPDVs] = useState(false)
  const [PDVs, setPDVs] = useState<PDV[]>([])
  const [seuilHistorique, setSeuilHistorique] = useState<StockTrendPoint[]>([])
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const [showStockMouvementForm, setShowStockMouvementForm] = useState(false)
  const [selectedProduct] = useState<PDV | null>(null)
  const [, setDownloadedFiles] = useState<{ blob: Blob; filename: string }[]>([])
  const [mouvementSearchTerm, setMouvementSearchTerm] = useState("")
  const [stats, setStats] = useState<ProductStats | null>(null)

  // ── Pagination Alertes ───────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1)

  // ── Pagination Historique ────────────────────────────────────────────────
  const [historyPage, setHistoryPage] = useState(1)

  const toggleRow = (id: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  // ✅ Valeur totale : depuis stats.total_stock_value si disponible, sinon calcul local
  const valeurTotaleStock = useMemo(() => {
    if (stats?.total_stock_value != null) return stats.total_stock_value
    return products.reduce((sum, p) => sum + (parseFloat(p.price as unknown as string) || 0) * p.current_stock, 0)
  }, [stats, products])

  // ✅ alertItems : depuis alertProducts (API paginée avec page_size=1000)
  const alertItems = useMemo(() =>
    alertProducts.filter(p =>
      (p.name || '').toLowerCase().includes(alertSearchTerm.toLowerCase())
    ),
    [alertProducts, alertSearchTerm]
  )

  const totalPages = useMemo(
    () => Math.ceil(alertItems.length / ITEMS_PER_PAGE),
    [alertItems.length]
  )

  const pagedAlertItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return alertItems.slice(start, start + ITEMS_PER_PAGE)
  }, [alertItems, currentPage])

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }, [totalPages])

  // Reset page quand les données ou la recherche changent
  useEffect(() => {
    setCurrentPage(1)
  }, [alertItems.length])

  const getVisiblePages = () => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const half = 2
    let start = Math.max(1, currentPage - half)
    let end = Math.min(totalPages, currentPage + half)
    if (currentPage <= half + 1) end = Math.min(totalPages, 5)
    if (currentPage >= totalPages - half) start = Math.max(1, totalPages - 4)
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }

  const stockTrendData = useMemo(() => {
    if (seuilHistorique.length === 0) return []
    return seuilHistorique.map((entry) => ({
      month: entry.date
        ? new Date(entry.date).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
        : entry.periode || "—",
      stock: entry.total_stock ?? entry.quantite ?? entry.valeur ?? 0,
    }))
  }, [seuilHistorique])

  const [categoryStockData, setCategoryStockData] = useState<{ name: string; stock: number }[]>([])

  const fetchCategoryChart = async () => {
    try {
      const res = await API.get('stock/mouvements/chart_by_category/')
      const data = res.data?.data || res.data?.results || res.data || []
      setCategoryStockData(
        (Array.isArray(data) ? data : []).map((item: any) => ({
          name: item.category,
          stock: item.stock ?? item.net ?? 0,
        }))
      )
    } catch (e) {
      console.error('Erreur chart catégorie:', e)
      setCategoryStockData([])
    }
  }

  const mouvementsByProduct = useMemo(() => {
    const map: Record<number, any[]> = {}
    stockMouvements.forEach((mvt: any) => {
      const pid: number | null = mvt.produit ?? mvt.product ?? mvt.product_details?.id ?? null
      if (pid === null) return
      if (!map[pid]) map[pid] = []
      map[pid].push(mvt)
    })
    Object.values(map).forEach(list =>
      list.sort((a, b) => (b.timestamp ?? "").localeCompare(a.timestamp ?? ""))
    )
    return map
  }, [stockMouvements])

  const mouvementStatsByProduct = useMemo(() => {
    const s: Record<number, { nbEntree: number; nbSortie: number; dernierMvt: string | null; dateDernierMvt: string | null }> = {}
    stockMouvements.forEach((mvt: any) => {
      const pid: number | null = mvt.produit ?? mvt.product ?? mvt.product_details?.id ?? null
      if (pid === null) return
      if (!s[pid]) s[pid] = { nbEntree: 0, nbSortie: 0, dernierMvt: null, dateDernierMvt: null }
      if (mvt.movement_type === 'IN' || mvt.movement_type === 'RETURN') {
        s[pid].nbEntree += Number(mvt.quantity) || 0
      } else if (mvt.movement_type === 'OUT' || mvt.movement_type === 'SCRAP') {
        s[pid].nbSortie += Number(mvt.quantity) || 0
      }
      if (!s[pid].dateDernierMvt || mvt.timestamp > s[pid].dateDernierMvt!) {
        s[pid].dernierMvt = mvt.movement_type
        s[pid].dateDernierMvt = mvt.timestamp
      }
    })
    return s
  }, [stockMouvements])

  const formatCustomDate = (dateString: string) => {
    if (!dateString) return "—"
    const d = new Date(dateString)
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  }

  const formatCurrency = (value: number) =>
    value.toLocaleString('fr-MG', { maximumFractionDigits: 0 }) + ' Ar'

  const formatMvtType = (type: string | null) => {
    if (!type) return "—"
    const map: Record<string, string> = { IN: "Entrée", OUT: "Sortie", ADJUSTMENT: "Ajustement", RETURN: "Retour", SCRAP: "Rebut" }
    return map[type] ?? type
  }

  const getStatusBadge = (status: string) => {
    if (status === "rupture") return <Badge variant="destructive">Rupture</Badge>
    if (status === "critical") return <Badge variant="destructive">Critique</Badge>
    if (status === "warning") return <Badge className="bg-orange-500 hover:bg-orange-500 text-white">Stock Faible</Badge>
    if (status === "low") return <Badge className="bg-warning text-warning-foreground">À surveiller</Badge>
    return <Badge variant="secondary">Normal</Badge>
  }

  // ── Export ─────────────────────────────────────────────────────────────────
  const exportMouvementPDF = async () => {
    setIsloadingexport(true)
    try {
      const res = (await API.post("core/pdf/PDF_mouvementStock/", {}, { responseType: 'blob' })) as AxiosResponseWithBlob
      const parsed = await parseAxiosBlobResponse(res, "Rapport_mouvement.pdf")
      if (parsed.files?.length) { setDownloadedFiles(prev => [...prev, ...parsed.files]); downloadAll(parsed.files) }
    } catch (err) { console.error(err) }
    finally { setIsloadingexport(false) }
  }

  const exportProductsCSV = () => {
    try {
      if (filteredPDVs.length === 0) {
        toast({ variant: "destructive", title: "Erreur", description: "Aucune donnée à exporter" }); return
      }
      const headers = ["Produit", "Quantité", "Date", "Produit parent"]
      const dataToExport = filteredPDVs.map(p => ({
        designation: p.designation || "",
        quantite: p.nombre ?? "0",
        date: formatCustomDate(p.date_creation),
        parent: p.infos?.name || "—"
      }))
      const now = new Date()
      const filename = `products_stock_${String(now.getDate()).padStart(2,'0')}${String(now.getMonth()+1).padStart(2,'0')}${now.getFullYear()}.csv`
      exportToCSV(dataToExport, filename, headers, ["designation", "quantite", "date", "parent"])
    } catch (error) {
      toast({ variant: "destructive", title: "Erreur d'exportation", description: "Erreur lors de l'exportation CSV." })
    }
  }

  const exportMovementsCSV = () => {
    try {
      if (filteredMovements.length === 0) {
        toast({ variant: "destructive", title: "Erreur", description: "Aucune donnée à exporter." }); return
      }
      const headers = ["Date", "Produit", "Type", "Quantité", "Référence", "Raison", "Auteur"]
      const dataToExport = filteredMovements.map(m => {
        const date = new Date(m.timestamp)
        const author = m.utilisateur_nom ? `${m.utilisateur_nom.first_name} ${m.utilisateur_nom.last_name}`.trim() : "—"
        return {
          date: `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`,
          produit: resolveProductName(m, PDVs),
          type: formatMvtType(m.movement_type),
          quantite: `${m.movement_type === "OUT" || m.movement_type === "SCRAP" ? "-" : "+"}${m.quantity}`,
          reference: m.reference || "—",
          raison: m.reason || "—",
          auteur: author
        }
      })
      const now = new Date()
      const filename = `mouvement_stock_${String(now.getDate()).padStart(2,'0')}${String(now.getMonth()+1).padStart(2,'0')}${now.getFullYear()}.csv`
      exportToCSV(dataToExport, filename, headers, ["date", "produit", "type", "quantite", "reference", "raison", "auteur"], ';')
    } catch (error) {
      toast({ variant: "destructive", title: "Erreur d'exportation", description: "Erreur lors de l'exportation CSV." })
    }
  }

  // ── Appels API ─────────────────────────────────────────────────────────────
  const fetchCategories = async () => {
    try {
      const res = await API.get('catalogue/categories/')
      setCategories(res.data?.data || res.data?.results || res.data || [])
    } catch (e) { console.error(e) }
  }

  // ✅ Stats depuis /catalogue/products/stats/ — même endpoint que Dashboard et Products
  const fetchStats = async () => {
    try {
      const res = await API.get('catalogue/products/stats/')
      setStats(res.data?.data || null)
    } catch (e) { console.error('Erreur stats:', e) }
  }

  const getListePDV = async () => {
    setIsLoadingPDVs(true)
    try {
      const res = await API.get('catalogue/produits-dv/')
      const data = res.data?.data || res.data?.results || res.data || []
      setPDVs(Array.isArray(data) ? data : [])
    } catch (e) { console.error(e); setPDVs([]) }
    finally { setIsLoadingPDVs(false) }
  }

  const fetchSeuilHistorique = async () => {
    try {
      const res = await API.get('stock/historique-seuil-stock/')
      const data = res.data?.data || res.data?.results || res.data || []
      setSeuilHistorique(Array.isArray(data) ? data : [])
    } catch (e) { console.error(e); setSeuilHistorique([]) }
  }

  const fetchStockMouvements = async (type?: string) => {
    setStockMouvementsLoading(true)
    setStockMouvementsError(null)
    try {
      const params: Record<string, string> = {}
      if (type && type !== "tout") params.movement_type = type
      const response = await stockMouvementService.getStockMouvements(params)
      if (response.status === 'success') {
        setStockMouvements(response.data)
      } else {
        const data = response.data || response.results || response
        setStockMouvements(Array.isArray(data) ? data : [])
      }
    } catch (e) {
      console.error(e)
      setStockMouvementsError("Erreur lors de la récupération des mouvements : " + (e instanceof Error ? e.message : "Erreur inconnue"))
    } finally { setStockMouvementsLoading(false) }
  }

  // ✅ Récupération des alertes par statut (page_size=1000 pour tout avoir)
  const fetchAlertProducts = async () => {
    setAlertLoading(true)
    try {
      const [rupture, critique, faible] = await Promise.all([
        API.get('catalogue/products/?stock_status=rupture&page_size=1000'),
        API.get('catalogue/products/?stock_status=critique&page_size=1000'),
        API.get('catalogue/products/?stock_status=stock_faible&page_size=1000'),
      ])

      const merge = (res: any) =>
        res.data?.data?.results ?? res.data?.results ?? res.data?.data ?? []

      const all = [
        ...merge(rupture).map((p: any) => ({ ...p, status: 'rupture' })),
        ...merge(critique).map((p: any) => ({ ...p, status: 'critical' })),
        ...merge(faible).map((p: any) => ({ ...p, status: 'warning' })),
      ]

      setAlertProducts(all)
    } catch (e) {
      console.error('Erreur fetch alertes:', e)
      setAlertProducts([])
    } finally {
      setAlertLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories(); fetchStats(); fetchStockMouvements()
    getListePDV(); fetchSeuilHistorique(); fetchCategoryChart(); fetchAlertProducts()
  }, [])

  // Produits ayant au moins un mouvement enregistré
  const filteredPDVs = useMemo(() => {
    const movedProductIds = new Set(Object.keys(mouvementsByProduct).map(Number))
    return PDVs.filter(p => {
      const produitId: number | null = (p as any).product ?? (p as any).id ?? null
      const hasMovement = produitId !== null && movedProductIds.has(produitId)
      if (!hasMovement) return false
      const term = searchTerm.toLowerCase()
      return (
        (p.designation || '').toLowerCase().includes(term) ||
        (p.infos?.name || '').toLowerCase().includes(term)
      )
    })
  }, [PDVs, mouvementsByProduct, searchTerm])

  const filteredMovements = useMemo(() =>
    stockMouvements.filter(m => {
      const productName = resolveProductName(m, PDVs).toLowerCase()
      const search = mouvementSearchTerm.toLowerCase()
      const ref = (m.reference || '').toString().toLowerCase()
      const reason = (m.reason || '').toLowerCase()
      return productName.includes(search) || ref.includes(search) || reason.includes(search)
    }),
    [stockMouvements, mouvementSearchTerm, PDVs]
  )

  // ── Pagination Historique ─────────────────────────────────────────────────
  const historyTotalPages = useMemo(
    () => Math.ceil(filteredMovements.length / HISTORY_PER_PAGE),
    [filteredMovements.length]
  )

  const pagedMovements = useMemo(() => {
    const start = (historyPage - 1) * HISTORY_PER_PAGE
    return filteredMovements.slice(start, start + HISTORY_PER_PAGE)
  }, [filteredMovements, historyPage])

  const goToHistoryPage = useCallback((page: number) => {
    setHistoryPage(Math.max(1, Math.min(page, historyTotalPages)))
  }, [historyTotalPages])

  // Reset page historique quand filtre ou données changent
  useEffect(() => {
    setHistoryPage(1)
  }, [filteredMovements.length])

  const getHistoryVisiblePages = () => {
    if (historyTotalPages <= 5) return Array.from({ length: historyTotalPages }, (_, i) => i + 1)
    const half = 2
    let start = Math.max(1, historyPage - half)
    let end = Math.min(historyTotalPages, historyPage + half)
    if (historyPage <= half + 1) end = Math.min(historyTotalPages, 5)
    if (historyPage >= historyTotalPages - half) start = Math.max(1, historyTotalPages - 4)
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analyse du Stock</h1>
          <p className="text-muted-foreground">Surveillez les niveaux de stock et les mouvements en temps réel</p>
        </div>
        <Button variant="outline" className="gap-2"
          onClick={() => { refetch(); fetchStats(); fetchStockMouvements(); getListePDV(); fetchAlertProducts() }}>
          <RefreshCw className="h-4 w-4" /> Actualiser
        </Button>
      </div>

      {/* ── Métriques — toutes depuis le backend ── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Catégories */}
        <MetricCard
          title="Catégories"
          value={categories.length.toString()}
          description={`${stats?.total_produits ?? products.length} produits au catalogue`}
          icon={<Package className="h-4 w-4" />}
        />

        {/* ✅ Carte Alertes splitée — stats viennent du backend (seuils 25%/50%) */}
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
              <p className="text-xs text-muted-foreground">Faible (25–50%)</p>
              <p className="text-xl font-bold text-orange-500">{stats?.total_stock_faible ?? "—"}</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground">Critique (&lt;25%)</p>
              <p className="text-xl font-bold text-red-500">{stats?.total_stock_critique ?? "—"}</p>
            </div>
          </div>
          <div className="mt-4 text-xs text-muted-foreground">
            {stats
              ? `${stats.total_stock_rupture} en rupture · ${(((stats.total_stock_faible + stats.total_stock_critique + stats.total_stock_rupture) / Math.max(stats.total_produits, 1)) * 100).toFixed(1)}% sous seuil`
              : "Surveillance des stocks critiques"}
          </div>
        </div>

        {/* ✅ Articles en Rupture — depuis stats.total_stock_rupture */}
        <MetricCard
          title="Articles en Rupture"
          value={stats?.total_stock_rupture?.toString() ?? "—"}
          description={stats
            ? `${((stats.total_stock_rupture / Math.max(stats.total_produits, 1)) * 100).toFixed(1)}% du catalogue`
            : "stock = 0"}
          icon={<TrendingDown className="h-4 w-4" />}
          variant="destructive"
        />

        {/* ✅ Valeur totale — depuis stats.total_stock_value si dispo, sinon calcul local */}
        <MetricCard
          title="Valeur Totale du Stock"
          value={formatCurrency(valeurTotaleStock)}
          description={stats?.total_stock_value != null ? "" : "Calculé en local"}
          icon={<DollarSign className="h-4 w-4" />}
          variant="success"
        />
      </div>

      <Tabs defaultValue="movements" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="movements">Mouvements de Stock</TabsTrigger>
          <TabsTrigger value="levels">Niveaux de Stock</TabsTrigger>
          <TabsTrigger value="alerts">Alertes de Stock Bas</TabsTrigger>
        </TabsList>

        {/* ── Onglet Mouvements ── */}
        <TabsContent value="movements">
          <Tabs defaultValue="list" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="list">Liste des Produits</TabsTrigger>
              <TabsTrigger value="historique">Historique des mouvements</TabsTrigger>
            </TabsList>

            {/* Liste PDV */}
            <TabsContent value="list">
              <Card>
                <CardHeader>
                  <CardTitle>Tous les produits</CardTitle>
                  <CardDescription>Cliquez sur une ligne pour afficher les mouvements associés.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="Rechercher des produits par nom..." value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                    </div>
                    <Button variant="outline" className="gap-2" onClick={() => setShowImportModal(true)}>Importer</Button>
                    <Button variant="outline" className="gap-2" onClick={exportProductsCSV}>Exporter</Button>
                  </div>

                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8" />
                          <TableHead>Produit</TableHead>
                          <TableHead>Nb Entrée</TableHead>
                          <TableHead>Nb Sortie</TableHead>
                          <TableHead>Dernier mvt</TableHead>
                          <TableHead>Date (dernier mvt)</TableHead>
                          <TableHead>Produit parent</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoadingPDVs ? (
                          <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Chargement des produits...</TableCell></TableRow>
                        ) : filteredPDVs.length === 0 ? (
                          <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Aucun produit disponible</TableCell></TableRow>
                        ) : (
                          filteredPDVs.map((produit: any) => {
                            const produitId: number | null = produit.product ?? produit.id ?? null
                            const mvtStats = produitId !== null ? mouvementStatsByProduct[produitId] : null
                            const mouvements = produitId !== null ? (mouvementsByProduct[produitId] ?? []) : []
                            const isExpanded = produit.id !== null && expandedRows.has(produit.id)

                            return (
                              <>
                                <TableRow key={`row-${produit.id}`}
                                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                                  onClick={() => toggleRow(produit.id)}>
                                  <TableCell className="w-8 pr-0">
                                    {isExpanded
                                      ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                      : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                                  </TableCell>
                                  <TableCell><p className="font-medium">{produit.designation}</p></TableCell>
                                  <TableCell>
                                    {mvtStats ? <span className="text-green-600 font-medium">+{mvtStats.nbEntree}</span> : <span className="text-muted-foreground">—</span>}
                                  </TableCell>
                                  <TableCell>
                                    {mvtStats ? <span className="text-red-500 font-medium">-{mvtStats.nbSortie}</span> : <span className="text-muted-foreground">—</span>}
                                  </TableCell>
                                  <TableCell>
                                    {mvtStats?.dernierMvt
                                      ? <Badge variant={mvtStats.dernierMvt === "IN" || mvtStats.dernierMvt === "RETURN" ? "success" : mvtStats.dernierMvt === "OUT" || mvtStats.dernierMvt === "SCRAP" ? "destructive" : "secondary"}>
                                          {formatMvtType(mvtStats.dernierMvt)}
                                        </Badge>
                                      : <span className="text-muted-foreground">—</span>}
                                  </TableCell>
                                  <TableCell>
                                    {mvtStats?.dateDernierMvt ? formatCustomDate(mvtStats.dateDernierMvt) : <span className="text-muted-foreground">—</span>}
                                  </TableCell>
                                  <TableCell>{produit.infos?.name || <span className="text-muted-foreground">—</span>}</TableCell>
                                </TableRow>

                                {isExpanded && (
                                  mouvements.length === 0 ? (
                                    <TableRow key={`empty-${produit.id}`} className="bg-muted/20">
                                      <TableCell /><TableCell /><TableCell />
                                      <TableCell colSpan={5} className="py-2 text-sm text-muted-foreground italic">
                                        Aucun mouvement enregistré pour ce produit.
                                      </TableCell>
                                    </TableRow>
                                  ) : mouvements.map((mvt: any, idx: number) => {
                                    const isIN  = mvt.movement_type === "IN"  || mvt.movement_type === "RETURN"
                                    const isOUT = mvt.movement_type === "OUT" || mvt.movement_type === "SCRAP"
                                    const qty   = Number(mvt.quantity) || 0
                                    const auteur = mvt.utilisateur_nom ? `${mvt.utilisateur_nom.first_name} ${mvt.utilisateur_nom.last_name}`.trim() : null
                                    const raison = mvt.reason || auteur || "—"
                                    return (
                                      <TableRow key={`mvt-${produit.id}-${mvt.id_movement ?? idx}`} className="bg-muted/20 hover:bg-muted/30">
                                        <TableCell /><TableCell /><TableCell />
                                        <TableCell>{isIN ? <span className="text-green-600 font-medium text-sm">+{qty}</span> : <span className="text-muted-foreground text-sm">—</span>}</TableCell>
                                        <TableCell>{isOUT ? <span className="text-red-500 font-medium text-sm">-{qty}</span> : <span className="text-muted-foreground text-sm">—</span>}</TableCell>
                                        <TableCell>
                                          <Badge variant={isIN ? "success" : isOUT ? "destructive" : "secondary"}>
                                            {formatMvtType(mvt.movement_type)}
                                          </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">{formatCustomDate(mvt.timestamp)}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground">{raison}</TableCell>
                                      </TableRow>
                                    )
                                  })
                                )}
                              </>
                            )
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground">{filteredPDVs.length} produit(s) avec mouvement(s) affiché(s)</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Historique mouvements */}
            <TabsContent value="historique">
              <Card>
                <CardHeader>
                  <CardTitle>Historique des Mouvements de Stock</CardTitle>
                  <CardDescription>Historique complet des entrées et sorties de stock</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
                    <div className="flex flex-1 flex-col md:flex-row items-center gap-4 w-full">
                      <div className="relative flex-1 w-full max-w-md">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input placeholder="Rechercher dans l'historique..." className="pl-10 bg-muted/30 border-muted"
                          value={mouvementSearchTerm} onChange={(e) => setMouvementSearchTerm(e.target.value)} />
                      </div>
                      <Select onValueChange={(value: string) => fetchStockMouvements(value)}>
                        <SelectTrigger className="w-full md:w-[200px] bg-muted/30 border-muted">
                          <SelectValue placeholder="Type de mouvement" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tout">Tous les mouvements</SelectItem>
                          <SelectItem value="IN">Entrées de stock</SelectItem>
                          <SelectItem value="OUT">Sorties de stock</SelectItem>
                          <SelectItem value="ADJUSTMENT">Ajustements</SelectItem>
                          <SelectItem value="RETURN">Retours</SelectItem>
                          <SelectItem value="SCRAP">Rebuts</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button variant="outline"
                      className="gap-2 text-white bg-primary hover:bg-primary/90 border-none transition-all duration-300 shadow-sm"
                      onClick={exportMovementsCSV} disabled={isloadingexport}>
                      <Download className="h-4 w-4" />Exporter
                    </Button>
                  </div>

                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead><TableHead>Produit</TableHead><TableHead>Type</TableHead>
                          <TableHead>Quantité</TableHead><TableHead>Référence</TableHead><TableHead>Raison</TableHead><TableHead>Auteur</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stockMouvementsLoading ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                              <div className="flex flex-col items-center gap-2">
                                <RefreshCw className="h-8 w-8 animate-spin opacity-20" />
                                <p>Chargement des mouvements...</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : stockMouvementsError ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                              <div className="flex flex-col items-center gap-2">
                                <AlertTriangle className="h-8 w-8 text-destructive opacity-50" />
                                <p>Aucun mouvement de stock trouvé</p>
                                <p className="text-xs opacity-50">({stockMouvementsError})</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : filteredMovements.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                              <div className="flex flex-col items-center gap-2">
                                <Search className="h-8 w-8 opacity-20" />
                                <p>Aucun mouvement de stock trouvé</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : pagedMovements.map((mouvement, index) => (
                          <TableRow key={mouvement.id ?? `mouvement-${index}`}>
                            <TableCell className="text-sm">
                              {new Date(mouvement.timestamp).toLocaleDateString()} {new Date(mouvement.timestamp).toLocaleTimeString()}
                            </TableCell>
                            <TableCell><div className="font-medium">{resolveProductName(mouvement, PDVs)}</div></TableCell>
                            <TableCell>
                              <Badge variant={mouvement.movement_type === "IN" ? "success" : mouvement.movement_type === "OUT" ? "destructive" : mouvement.movement_type === "ADJUSTMENT" ? "warning" : "secondary"}>
                                {formatMvtType(mouvement.movement_type)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className={mouvement.movement_type === "OUT" || mouvement.movement_type === "SCRAP" ? "text-red-500 font-medium" : "text-green-600 font-medium"}>
                                {mouvement.movement_type === "OUT" || mouvement.movement_type === "SCRAP" ? "-" : "+"}{mouvement.quantity}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm">{mouvement.reference || "—"}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{mouvement.reason || "—"}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {mouvement.utilisateur_nom ? `${mouvement.utilisateur_nom.first_name} ${mouvement.utilisateur_nom.last_name}` : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* ── Pagination Historique ── */}
                  <div className="flex items-center justify-between pt-4 border-t mt-2">
                    <p className="text-sm text-muted-foreground">
                      Page <span className="font-medium text-foreground">{historyPage}</span> sur{" "}
                      <span className="font-medium text-foreground">{Math.max(historyTotalPages, 1)}</span>
                      {" "}· {filteredMovements.length} mouvement(s)
                    </p>
                    {historyTotalPages > 1 && (
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="sm" onClick={() => goToHistoryPage(historyPage - 1)}
                          disabled={historyPage === 1} className="h-8 w-8 p-0" aria-label="Page précédente">
                          <ChevronLeft className="h-4 w-4" />
                        </Button>

                        {getHistoryVisiblePages()[0] > 1 && (
                          <>
                            <Button variant="outline" size="sm" onClick={() => goToHistoryPage(1)} className="h-8 w-8 p-0 text-xs">1</Button>
                            {getHistoryVisiblePages()[0] > 2 && <span className="px-1 text-muted-foreground text-sm">…</span>}
                          </>
                        )}

                        {getHistoryVisiblePages().map(page => (
                          <Button key={page} variant={page === historyPage ? "default" : "outline"} size="sm"
                            onClick={() => goToHistoryPage(page)} className="h-8 w-8 p-0 text-xs"
                            aria-current={page === historyPage ? "page" : undefined}>
                            {page}
                          </Button>
                        ))}

                        {getHistoryVisiblePages()[getHistoryVisiblePages().length - 1] < historyTotalPages && (
                          <>
                            {getHistoryVisiblePages()[getHistoryVisiblePages().length - 1] < historyTotalPages - 1 && (
                              <span className="px-1 text-muted-foreground text-sm">…</span>
                            )}
                            <Button variant="outline" size="sm" onClick={() => goToHistoryPage(historyTotalPages)} className="h-8 w-8 p-0 text-xs">{historyTotalPages}</Button>
                          </>
                        )}

                        <Button variant="outline" size="sm" onClick={() => goToHistoryPage(historyPage + 1)}
                          disabled={historyPage === historyTotalPages} className="h-8 w-8 p-0" aria-label="Page suivante">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* ── Onglet Niveaux ── */}
        <TabsContent value="levels">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>
                  Tendance des Niveaux de Stock
                  {stockTrendData.length === 0 && <span className="ml-2 text-xs font-normal text-muted-foreground italic">(aucune donnée)</span>}
                </CardTitle>
                <CardDescription>Vue historique des niveaux de stock dans le temps</CardDescription>
              </CardHeader>
              <CardContent>
                {stockTrendData.length > 0
                  ? <LineChart data={stockTrendData} xAxisKey="month" lines={[{ key: "stock", name: "Niveau de Stock", color: "rgb(67, 110, 240)" }]} />
                  : <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Aucun historique de seuil disponible</div>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  Répartition du Stock par Catégorie
                  {categoryStockData.length === 0 && <span className="ml-2 text-xs font-normal text-muted-foreground italic">(aucune donnée)</span>}
                </CardTitle>
                <CardDescription>Stock actuel (quantité) regroupé par catégorie de produit</CardDescription>
              </CardHeader>
              <CardContent>
                {categoryStockData.length > 0
                  ? <BarChart data={categoryStockData} xAxisKey="name" bars={[{ key: "stock", name: "Stock (quantité)", color: "rgb(67, 110, 240)" }]} height={300} />
                  : <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Aucune donnée de stock disponible</div>}
              </CardContent>
            </Card>
          </div>

          {categoryStockData.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Détail par Catégorie</CardTitle>
                <CardDescription>Stock total (quantité) par catégorie de produit</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Catégorie</TableHead>
                      <TableHead>Stock total</TableHead>
                      <TableHead>Nb produits DV</TableHead>
                      <TableHead>Valeur estimée</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryStockData.map((cat, index) => {
                      const catPDVs = PDVs.filter((pdv: any) => {
                        const cid = pdv.infos?.category ?? null
                        const catName = cid !== null
                          ? (categories.find(c => String(c.id) === String(cid))?.name || "Sans catégorie")
                          : "Sans catégorie"
                        return catName === cat.name
                      })
                      const valeur = catPDVs.reduce((sum: number, pdv: any) => {
                        const product = products.find(p => p.id === pdv.infos?.id)
                        return sum + (product ? parseFloat(product.price) || 0 : 0) * (Number(pdv.quantite) || 0)
                      }, 0)
                      return (
                        <TableRow key={`cat-${cat.name}-${index}`}>
                          <TableCell className="font-medium">{cat.name}</TableCell>
                          <TableCell>{cat.stock.toLocaleString()} unités</TableCell>
                          <TableCell>{catPDVs.length} produits</TableCell>
                          <TableCell>{formatCurrency(valeur)}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Onglet Alertes ── */}
        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>Alertes de Stock Bas</CardTitle>
              <CardDescription>
                Produits dont le stock est inférieur ou égal au seuil — seuils : Critique ≤25%, Faible 25–50%, À surveiller 50–100%
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative mb-4 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Rechercher un produit..." value={alertSearchTerm}
                  onChange={(e) => setAlertSearchTerm(e.target.value)} className="pl-10" />
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produit</TableHead>
                      <TableHead>Stock Actuel</TableHead>
                      <TableHead>Seuil</TableHead>
                      <TableHead>% du seuil</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Action suggérée</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alertLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          <div className="flex flex-col items-center gap-2">
                            <RefreshCw className="h-6 w-6 animate-spin opacity-30" />
                            <p>Chargement des alertes...</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : alertItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          Aucune alerte de stock — tout est en ordre ✓
                        </TableCell>
                      </TableRow>
                    ) : pagedAlertItems.map((item) => {
                      const threshold = Number(item.stock_threshold) || 0
                      const pct = threshold > 0 ? ((item.current_stock / threshold) * 100).toFixed(0) : "—"
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>{item.current_stock} unités</TableCell>
                          <TableCell>{threshold} unités</TableCell>
                          <TableCell>
                            <span className={item.status === "critical" || item.status === "rupture" ? "text-red-500 font-medium" : item.status === "warning" ? "text-orange-500 font-medium" : "text-yellow-600 font-medium"}>
                              {pct}%
                            </span>
                          </TableCell>
                          <TableCell>{getStatusBadge(item.status)}</TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {item.current_stock === 0
                                ? `Commander au moins ${threshold} unités`
                                : `Commander ${threshold - item.current_stock + Math.ceil(threshold * 0.5)} unités`}
                            </span>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* ── Pagination ── */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t mt-2">
                  <p className="text-sm text-muted-foreground">
                    Page <span className="font-medium text-foreground">{currentPage}</span> sur{" "}
                    <span className="font-medium text-foreground">{totalPages}</span>
                    {" "}· {alertItems.length} produits
                  </p>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1} className="h-8 w-8 p-0" aria-label="Page précédente">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    {getVisiblePages()[0] > 1 && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => goToPage(1)} className="h-8 w-8 p-0 text-xs">1</Button>
                        {getVisiblePages()[0] > 2 && <span className="px-1 text-muted-foreground text-sm">…</span>}
                      </>
                    )}

                    {getVisiblePages().map(page => (
                      <Button key={page} variant={page === currentPage ? "default" : "outline"} size="sm"
                        onClick={() => goToPage(page)} className="h-8 w-8 p-0 text-xs"
                        aria-current={page === currentPage ? "page" : undefined}>
                        {page}
                      </Button>
                    ))}

                    {getVisiblePages()[getVisiblePages().length - 1] < totalPages && (
                      <>
                        {getVisiblePages()[getVisiblePages().length - 1] < totalPages - 1 && (
                          <span className="px-1 text-muted-foreground text-sm">…</span>
                        )}
                        <Button variant="outline" size="sm" onClick={() => goToPage(totalPages)} className="h-8 w-8 p-0 text-xs">{totalPages}</Button>
                      </>
                    )}

                    <Button variant="outline" size="sm" onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages} className="h-8 w-8 p-0" aria-label="Page suivante">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {alertItems.length > 0 && (
                <p className="text-sm text-muted-foreground mt-3">
                  {alertItems.length} produit(s) — {alertItems.filter(i => i.status === "rupture").length} rupture · {alertItems.filter(i => i.status === "critical").length} critique · {alertItems.filter(i => i.status === "warning").length} faible · {alertItems.filter(i => i.status === "low").length} à surveiller
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {showStockMouvementForm && selectedProduct && (
        <StockMouvementForm
          onClose={() => setShowStockMouvementForm(false)}
          onSubmit={() => { setShowStockMouvementForm(false); refetch() }}
          initialData={{
            id_product: selectedProduct.id,
            product_name: selectedProduct.designation || selectedProduct.infos?.name || "",
            quantity: 0, movement_type: 'IN', reason: '', notes: ''
          }}
        />
      )}

      {showImportModal && (
        <ImportModalGenerer
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImport={(data: any) => { console.log('Données importées:', data); setShowImportModal(false) }}
        />
      )}
    </div>
  )
}