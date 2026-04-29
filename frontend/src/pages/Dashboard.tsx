import { Package, AlertTriangle, Brain, DollarSign, RefreshCw, ChevronLeft, ChevronRight} from "lucide-react"
import { MetricCard } from "@/components/MetricCard"
import { LineChart } from "@/components/charts/LineChart"
import { BarChart } from "@/components/charts/BarChart"
import { useEffect, useState, useCallback, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import { CriticalProduct } from "@/types/product"
import { toast } from "@/components/ui/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DashboardSkeleton } from "@/components/SkeletonLoader"
import { API_BASE_URL } from "@/services/api"

interface ProductData {
  id: number
  name: string
  current_stock: number
  stock_threshold: number
  price?: string
  product_img?: string
  category?: string
  category_name?: string
}

interface StockApiResponse {
  data?: {
    count?: number
    results?: ProductData[]
  }
}

// MODIF : ajout total_stock_critique et total_stock_faible séparés
interface DashboardStats {
  total_produits: number
  total_stock_value: number
  total_stock_faible: number    // 25% < stock <= 50% du seuil
  total_stock_critique: number  // 0 < stock <= 25% du seuil
  total_stock_rupture: number   // stock = 0
}

interface RevenueItem {
  month: string
  actual: number
  predicted?: number
  [key: string]: string | number | undefined
}

const MOCK_PREDICTIONS: Record<string, number> = {
  "Jan": 2200, "Fév": 1500, "Mar": 9500, "Avr": 4000, "Mai": 4600, "Juin": 4200,
  "Juil": 5000, "Août": 5500, "Sep": 4800, "Oct": 4200, "Nov": 3800, "Déc": 4500
}

interface StockData {
  product: string
  current: number
  critical: number
}

interface CategoryStockData {
  category: string
  stock: number
}

const ITEMS_PER_PAGE = 10

const authHeaders = () => ({
  headers: {
    'Authorization': `Token ${localStorage.getItem('token')}`
  }
})

// MODIF : calculateStatus aligné sur la nouvelle logique à 4 niveaux
// critique    : 0 < stock <= 25% du seuil
// warning     : 25% < stock <= 50% du seuil  (stock faible)
// low         : 50% < stock <= 75% du seuil
// ok          : 75% < stock <= 100% du seuil
// good        : stock > seuil
function calculateStatus(current: number, threshold: number): CriticalProduct['status'] {
  if (current === 0) return "critical"
  if (threshold <= 0) return "good"
  const ratio = current / threshold
  if (ratio <= 0.25) return "critical"
  if (ratio <= 0.50) return "warning"
  if (ratio <= 0.75) return "low"
  if (ratio <= 1.00) return "ok"
  return "good"
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [stockData, setStockData] = useState<StockData[]>([])
  const [criticalProductsState, setCriticalProductsState] = useState<CriticalProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [salesData, setSalesData] = useState<RevenueItem[]>([])
  const [categoryStockData, setCategoryStockData] = useState<CategoryStockData[]>([])

  // ── Pagination produits critiques ──────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1)

  const totalPages = useMemo(
    () => Math.ceil(criticalProductsState.length / ITEMS_PER_PAGE),
    [criticalProductsState.length]
  )

  const pagedCriticalProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return criticalProductsState.slice(start, start + ITEMS_PER_PAGE)
  }, [criticalProductsState, currentPage])

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }, [totalPages])

  const calculateDaysUntilStockout = useCallback((current: number, avgDailyUse: number) => {
    if (avgDailyUse <= 0) return 30
    return Math.round(current / avgDailyUse)
  }, [])

  // ── Appels API ─────────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/catalogue/products/stats/`, authHeaders())
      if (response.data?.data) setStats(response.data.data)
    } catch (error) {
      console.error('Erreur stats:', error)
    }
  }, [])

  const fetchRevenueData = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/catalogue/revenues/mensuel/`, authHeaders())
      if (response.data?.data && Array.isArray(response.data.data)) {
        setSalesData(response.data.data.map((item: RevenueItem) => ({
          ...item,
          predicted: MOCK_PREDICTIONS[item.month] || 0
        })))
      }
    } catch (error) {
      console.error('Erreur revenus:', error)
    }
  }, [])

  const fetchStockData = useCallback(async () => {
    try {
      const response = await axios.get<StockApiResponse>(
        `${API_BASE_URL}/api/catalogue/products/?page_size=100`, authHeaders()
      )
      if (response.data?.data && Array.isArray(response.data.data.results)) {
        const products = response.data.data.results
          .map((p: ProductData) => ({
            ratio: Math.abs(p.current_stock - p.stock_threshold),
            data: { product: p.name, current: p.current_stock, critical: p.stock_threshold }
          }))
          .sort((a, b) => b.ratio - a.ratio)
          .map(item => item.data)
        setStockData(products)
      }
    } catch (error) {
      console.error('Erreur stock data:', error)
    }
  }, [])

  const fetchCategoryStockData = useCallback(async () => {
    try {
      const response = await axios.get<StockApiResponse>(
        `${API_BASE_URL}/api/catalogue/products/?page_size=1000`, authHeaders()
      )
      if (response.data?.data && Array.isArray(response.data.data.results)) {
        const categoryMap: Record<string, number> = {}
        response.data.data.results.forEach((p: ProductData) => {
          const cat = p.category_name || p.category?.toString() || 'Non catégorisé'
          categoryMap[cat] = (categoryMap[cat] || 0) + p.current_stock
        })
        setCategoryStockData(
          Object.entries(categoryMap)
            .map(([category, stock]) => ({ category, stock }))
            .sort((a, b) => b.stock - a.stock)
        )
      }
    } catch (error) {
      console.error('Erreur catégorie stock:', error)
    }
  }, [])

  const fetchCriticalProducts = useCallback(async () => {
    try {
      const firstRes = await axios.get<any>(
        `${API_BASE_URL}/api/catalogue/products/?page_size=50&page=1`, authHeaders()
      )
      const firstData = firstRes.data?.data ?? firstRes.data
      const total: number = firstData?.count ?? 0
      let allResults: ProductData[] = Array.isArray(firstData?.results) ? firstData.results : []

      if (total > 50) {
        const pages = Math.ceil(total / 50)
        const responses = await Promise.all(
          Array.from({ length: pages - 1 }, (_, i) =>
            axios.get<any>(`${API_BASE_URL}/api/catalogue/products/?page_size=50&page=${i + 2}`, authHeaders())
          )
        )
        responses.forEach(res => {
          const d = res.data?.data ?? res.data
          if (Array.isArray(d?.results)) allResults = allResults.concat(d.results)
        })
      }

      // Inclut critique (<=25%) + stock_faible (25%-50%) + ok (50%-100%)
      // = tout ce qui est <= seuil
      const criticalProducts = allResults
        .filter((p) => {
          const ratio = p.stock_threshold > 0 ? p.current_stock / p.stock_threshold : 1
          return p.current_stock === 0 || ratio <= 0.50  // rupture + critique + faible uniquement
        })
        .map((p: ProductData) => ({
          id: p.id,
          name: p.name,
          stock: p.current_stock,
          current_stock: p.current_stock,
          critical: p.stock_threshold,
          stock_threshold: p.stock_threshold,
          status: calculateStatus(p.current_stock, p.stock_threshold),
          days: calculateDaysUntilStockout(p.current_stock, 2),
          product_img: p.product_img
        }))

      setCriticalProductsState(criticalProducts)
      setCurrentPage(1)
    } catch (error) {
      console.error('Erreur produits critiques:', error)
      toast({ title: "Erreur", description: "Impossible de charger les produits critiques", variant: "destructive" })
    }
  }, [calculateDaysUntilStockout])

  const refreshAllData = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([fetchStats(), fetchRevenueData(), fetchCriticalProducts(), fetchStockData(), fetchCategoryStockData()])
      toast({ title: "Succès", description: "Données actualisées avec succès" })
    } catch {
      toast({ title: "Erreur", description: "Impossible de rafraîchir les données", variant: "destructive" })
    } finally {
      setIsRefreshing(false)
    }
  }, [fetchCriticalProducts, fetchStockData, fetchStats, fetchRevenueData, fetchCategoryStockData])

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        await Promise.all([fetchStats(), fetchRevenueData(), fetchCriticalProducts(), fetchStockData(), fetchCategoryStockData()])
      } catch (error) {
        console.error('Erreur chargement:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [fetchCriticalProducts, fetchStockData, fetchStats, fetchRevenueData, fetchCategoryStockData])

  const handleRestock = async (product: CriticalProduct) => {
    const quantity = parseInt(prompt(`Combien d'unités réapprovisionner pour ${product.name} ?`) || '0', 10)
    if (isNaN(quantity) || quantity <= 0) {
      toast({ title: "Erreur", description: "Quantité invalide.", variant: "destructive" })
      return
    }
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/api/catalogue/products/${product.id}/`,
        { current_stock: product.current_stock + quantity },
        authHeaders()
      )
      if (response.data) {
        await fetchCriticalProducts()
        toast({ title: "Succès", description: `Réapprovisionnement réussi. Nouveau stock : ${product.current_stock + quantity}` })
      }
    } catch {
      toast({ title: "Erreur", description: "Impossible de mettre à jour le stock", variant: "destructive" })
    }
  }

  if (isLoading) return <DashboardSkeleton />

  const getVisiblePages = () => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const half = 2
    let start = Math.max(1, currentPage - half)
    let end = Math.min(totalPages, currentPage + half)
    if (currentPage <= half + 1) end = Math.min(totalPages, 5)
    if (currentPage >= totalPages - half) start = Math.max(1, totalPages - 4)
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }

  // Badge couleur selon statut aligné sur la nouvelle logique
  const getStatusBadge = (status: CriticalProduct['status']) => {
    switch (status) {
      case "critical":
        return <Badge variant="destructive" className="px-3 py-1">Critique</Badge>
      case "warning":
        return <Badge className="px-3 py-1 bg-orange-500 hover:bg-orange-500 text-white">Stock Faible</Badge>
      case "low":
        return <Badge variant="outline" className="px-3 py-1">À Surveiller</Badge>
      case "ok":
        return <Badge variant="secondary" className="px-3 py-1">OK</Badge>
      default:
        return <Badge variant="default" className="px-3 py-1">Bon</Badge>
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Tableau de Bord des Stocks</h1>
          <p className="text-slate-500 mt-1">Aperçu en temps réel de l'inventaire et prévisions IA.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={refreshAllData} disabled={isRefreshing} className="shadow-sm hover:bg-slate-50 transition-all duration-300">
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Actualisation...' : 'Actualiser'}
          </Button>
          <Button onClick={() => navigate('/products')} className="bg-primary text-white shadow-md hover:shadow-lg transition-all duration-300">
            <Package className="h-4 w-4 mr-2" />
            Gérer les Produits
          </Button>
        </div>
      </div>

      {/* ── Métriques — 5 cartes sur 2 lignes ──────────────────────────────── */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Produits Totaux"
          value={stats?.total_produits?.toString() || "0"}
          description="Articles actifs en inventaire"
          icon={<Package />}
          variant="blue"
          trend={{ value: stats?.total_produits || 0, label: "produits enregistrés" }}
        />

        <MetricCard
          title="Valeur du Stock"
          value={`${(stats?.total_stock_value || 0).toLocaleString()} Ariary`}
          description="Valeur totale des produits en stock"
          icon={<DollarSign />}
          variant="prediction"
          trend={{ value: 0, label: "valeur actuelle" }}
        />

        <MetricCard
          title="Précision des Prévisions"
          value="94,2 %"
          description="Performance du modèle (fictif)"
          icon={<Brain />}
          variant="success"
          trend={{ value: 2.1, label: "amélioration" }}
        />

        {/* 🔥 Alertes version MetricCard-like — 3 colonnes */}
        <div className="rounded-2xl border bg-white p-6 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
          
          {/* Header comme MetricCard */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-muted-foreground font-medium">
                Alertes Stock
              </p>
              <p className="text-xs text-muted-foreground">
                Produits sous seuil
              </p>
            </div>
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </div>

          {/* Contenu : 3 colonnes */}
          <div className="grid grid-cols-3 gap-3 mt-2">
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground">Faible</p>
              <p className="text-xl font-bold text-orange-500">
                {stats?.total_stock_faible ?? 0}
              </p>
            </div>

            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground">Critique</p>
              <p className="text-xl font-bold text-red-500">
                {stats?.total_stock_critique ?? 0}
              </p>
            </div>

            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground">Rupture</p>
              <p className="text-xl font-bold text-red-700">
                {stats?.total_stock_rupture ?? 0}
              </p>
            </div>
          </div>

          {/* Trend style comme MetricCard */}
          <div className="mt-4 text-xs text-muted-foreground">
            {stats
              ? `${stats.total_stock_rupture} rupture · ${stats.total_stock_critique} critique · ${stats.total_stock_faible} faible`
              : "Surveillance des stocks critiques"}
          </div>
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
              Ventes vs Prévisions
            </CardTitle>
            <CardDescription>Performances réelles comparées aux prévisions IA</CardDescription>
          </CardHeader>
          <CardContent>
            <LineChart
              data={salesData}
              xAxisKey="month"
              lines={[
                { key: "actual", name: "Ventes Réelles", color: "rgb(67, 110, 240)" },
                { key: "predicted", name: "Prévisions (fictives)", color: "hsl(var(--prediction))" }
              ]}
              height={320}
            />
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-2 h-6 bg-indigo-500 rounded-full"></span>
                  Niveaux de Stock Actuels
                </CardTitle>
                <CardDescription>État des stocks pour les produits les plus critiques</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchStockData} className="gap-2 transition-all duration-300">
                <Package className="h-4 w-4" />
                Actualiser
              </Button>
            </div>
          </CardHeader>
          <CardContent className="relative">
            {stockData.length === 0 ? (
              <div className="flex items-center justify-center h-[320px] text-muted-foreground">
                Aucune donnée de stock disponible
              </div>
            ) : (
              <div className="overflow-x-auto pb-4">
                <div style={{ minWidth: Math.max(600, stockData.length * 100) + 'px' }}>
                  <BarChart
                    data={stockData as unknown as Record<string, unknown>[]}
                    xAxisKey="product"
                    bars={[
                      { key: "current", name: "Stock Actuel", color: "rgb(67, 110, 240)", tooltip: (value) => `Stock actuel : ${value} unités` },
                      { key: "critical", name: "Seuil Critique", color: "hsl(var(--destructive))", tooltip: (value) => `Seuil critique : ${value} unités` }
                    ]}
                    height={320} showLegend showGrid showTooltip className="mt-4"
                    xAxisProps={{ angle: -45, textAnchor: "end", dominantBaseline: "auto", fontSize: 12, interval: 0, dy: 8, dx: -8 }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="lg:col-span-2 border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-2 h-6 bg-emerald-500 rounded-full"></span>
                  Stock Global par Catégorie
                </CardTitle>
                <CardDescription>Répartition réelle des stocks actuels par catégorie de produits</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchCategoryStockData} className="gap-2 transition-all duration-300">
                <Package className="h-4 w-4" />
                Actualiser
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {categoryStockData.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Aucune donnée de catégorie disponible
              </div>
            ) : (
              <div className="overflow-x-auto pb-4">
                <div style={{ minWidth: Math.max(600, categoryStockData.length * 120) + 'px' }}>
                  <BarChart
                    data={categoryStockData as unknown as Record<string, unknown>[]}
                    xAxisKey="category"
                    bars={[{ key: "stock", name: "Stock Total (unités)", color: "rgb(16, 185, 129)", tooltip: (value) => `Stock : ${value} unités` }]}
                    height={300} showLegend showGrid showTooltip className="mt-4"
                    xAxisProps={{ angle: -30, textAnchor: "end", dominantBaseline: "auto", fontSize: 12, interval: 0, dy: 8, dx: -4 }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Tableau produits critiques avec pagination ─────────────────────── */}
      <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <span className="w-2 h-6 bg-red-500 rounded-full"></span>
              Produits à Priorité Critique
            </CardTitle>
            <CardDescription>
              Produits sous le seuil —{" "}
              <span className="font-medium text-foreground">
                {Math.min(currentPage * ITEMS_PER_PAGE, criticalProductsState.length)}
              </span>
              {" "}/ {criticalProductsState.length} affichés
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" className="transition-all duration-300" onClick={() => navigate('/products')}>
            Voir Tous les Produits
          </Button>
        </CardHeader>

        <CardContent>
          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center py-4">
                <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-2">Chargement des produits critiques...</span>
              </div>
            ) : criticalProductsState.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucun produit critique trouvé</p>
                <p className="text-sm mt-1">Tous vos stocks sont en bon état</p>
              </div>
            ) : (
              <>
                {pagedCriticalProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-4 border rounded-xl hover:bg-accent/50 transition-all duration-300 group"
                  >
                    <div className="flex items-center space-x-4">
                      {product.product_img && (
                        <img
                          src={`http://localhost:8000${product.product_img}`}
                          alt={product.name}
                          className="h-12 w-12 rounded-lg object-cover shadow-sm"
                        />
                      )}
                      <div>
                        <p className="font-semibold text-base">{product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Stock : <span className="font-medium text-slate-700">{product.current_stock}</span> unités |
                          Seuil : <span className="font-medium text-slate-700">{product.stock_threshold}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      {getStatusBadge(product.status)}

                      <div className="text-right">
                        <p className="text-sm font-semibold">{product.days} jours</p>
                        <p className="text-xs text-muted-foreground">avant rupture</p>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestock(product)}
                        className="hover:bg-primary hover:text-primary-foreground transition-all duration-300 group-hover:scale-105"
                      >
                        Réapprovisionner
                      </Button>
                    </div>
                  </div>
                ))}

                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t mt-2">
                    <p className="text-sm text-muted-foreground">
                      Page <span className="font-medium text-foreground">{currentPage}</span> sur{" "}
                      <span className="font-medium text-foreground">{totalPages}</span>
                      {" "}· {criticalProductsState.length} produits
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
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}