import { Package, AlertTriangle, Brain, DollarSign, RefreshCw } from "lucide-react"
import { MetricCard } from "@/components/MetricCard"
import { LineChart } from "@/components/charts/LineChart"
import { BarChart } from "@/components/charts/BarChart"
import { useEffect, useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import { CriticalProduct } from "@/types/product"
import { toast } from "@/components/ui/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { StockChart } from "@/components/stocks/StockChart"
import { mockStocks } from '@/utils/stocksApi'

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
}

interface StockApiResponse {
  data?: {
    count?: number
    results?: ProductData[]
  }
}

interface DashboardStats {
  total_produits: number
  total_stock_value: number
  total_stock_faible: number
  total_stock_rupture: number
}

interface RevenueItem {
  month: string
  actual: number
  predicted?: number
  [key: string]: string | number | undefined
}

const authHeaders = () => ({
    headers: {
        'Authorization': `Token ${localStorage.getItem('token')}`
    }
})

// Données de prédiction fictives (en attendant l'intégration du modèle IA)
const MOCK_PREDICTIONS: Record<string, number> = {
  "Jan": 2200, "Fév": 1500, "Mar": 9500, "Avr": 4000, "Mai": 4600, "Juin": 4200,
  "Juil": 5000, "Août": 5500, "Sep": 4800, "Oct": 4200, "Nov": 3800, "Déc": 4500
}

interface StockData {
  product: string
  current: number
  critical: number
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [stockData, setStockData] = useState<StockData[]>([])
  const [criticalProductsState, setCriticalProductsState] = useState<CriticalProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [salesData, setSalesData] = useState<RevenueItem[]>([])
  


  // Fonction pour calculer le statut du produit
  const calculateStatus = useCallback((current: number, threshold: number) => {
    const ratio = current / threshold
    if (ratio <= 0.25) return "critical"
    if (ratio <= 0.5) return "warning"
    if (ratio <= 0.75) return "low"
    if (ratio <= 1) return "ok"
    return "good"
  }, [])

  // Fonction pour calculer les jours restants avant rupture
  const calculateDaysUntilStockout = useCallback((current: number, avgDailyUse: number) => {
    if (avgDailyUse <= 0) return 30
    return Math.round(current / avgDailyUse)
  }, [])

  // Fonction pour récupérer les statistiques globales
  const fetchStats = useCallback(async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/api/catalogue/products/stats/`, authHeaders())
        if (response.data?.data) {
            setStats(response.data.data)
        }
    } catch (error) {
        console.error('Erreur lors de la récupération des stats:', error)
    }
  }, [])

  // Fonction pour récupérer les données de revenus
  const fetchRevenueData = useCallback(async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/api/catalogue/revenues/mensuel/`, authHeaders())
        if (response.data?.data && Array.isArray(response.data.data)) {
            const enrichedData = response.data.data.map((item: RevenueItem) => ({
                ...item,
                predicted: MOCK_PREDICTIONS[item.month] || 0
            }))
            setSalesData(enrichedData)
        }
    } catch (error) {
        console.error('Erreur lors de la récupération des revenus:', error)
    }
  }, [])

  // Fonction pour récupérer les données de stock pour le graphique
  const fetchStockData = useCallback(async () => {
    try {
        const response = await axios.get<StockApiResponse>(`${API_BASE_URL}/api/catalogue/products/`, authHeaders())
        if (response.data?.data && Array.isArray(response.data.data.results)) {
            const products = response.data.data.results
                .map((product: ProductData) => ({
                    ratio: Math.abs(product.current_stock - product.stock_threshold),
                    data: {
                        product: product.name,
                        current: product.current_stock,
                        critical: product.stock_threshold
                    }
                }))
                .sort((a, b) => b.ratio - a.ratio)
                .map(item => item.data)
            setStockData(products)
        }
    } catch (error) {
        console.error('Erreur lors de la récupération des données de stock:', error)
    }
  }, [])

  // Fonction pour récupérer les produits critiques
  const fetchCriticalProducts = useCallback(async () => {
    try {
        const response = await axios.get<StockApiResponse>(`${API_BASE_URL}/api/catalogue/products/`, authHeaders())
        if (response.data && response.data.data && Array.isArray(response.data.data.results)) {
            const criticalProducts = response.data.data.results
                .filter((product: ProductData) => product.current_stock <= product.stock_threshold)
                .map((product: ProductData) => ({
                    id: product.id,
                    name: product.name,
                    stock: product.current_stock,
                    current_stock: product.current_stock,
                    critical: product.stock_threshold,
                    stock_threshold: product.stock_threshold,
                    status: calculateStatus(product.current_stock, product.stock_threshold) as CriticalProduct['status'],
                    days: calculateDaysUntilStockout(product.current_stock, 2),
                    product_img: product.product_img
                }))
            setCriticalProductsState(criticalProducts)
        }
    } catch (error) {
        console.error('Erreur lors de la récupération des produits critiques:', error)
        toast({
            title: "Erreur",
            description: "Impossible de charger les produits critiques",
            variant: "destructive",
        })
    }
  }, [calculateStatus, calculateDaysUntilStockout])

  // Fonction pour rafraîchir toutes les données
  const refreshAllData = useCallback(async () => {
    setIsRefreshing(true)
    try {
        await Promise.all([
            fetchStats(),
            fetchRevenueData(),
            fetchCriticalProducts(),
            fetchStockData()
        ])
        toast({
            title: "Succès",
            description: "Données actualisées avec succès",
        })
    } catch (error) {
        toast({
            title: "Erreur",
            description: "Impossible de rafraîchir les données",
            variant: "destructive",
        })
    } finally {
        setIsRefreshing(false)
    }
  }, [fetchCriticalProducts, fetchStockData, fetchStats, fetchRevenueData])

  useEffect(() => {
    const loadData = async () => {
        setIsLoading(true)
        try {
            await Promise.all([
                fetchStats(),
                fetchRevenueData(),
                fetchCriticalProducts(),
                fetchStockData()
            ])
        } catch (error) {
            console.error('Erreur lors du chargement des données:', error)
        } finally {
            setIsLoading(false)
        }
    }
    loadData()
  }, [fetchCriticalProducts, fetchStockData, fetchStats, fetchRevenueData])

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
            toast({
                title: "Succès",
                description: `Réapprovisionnement réussi. Nouveau stock : ${product.current_stock + quantity}`,
            })
        }
    } catch (error) {
        toast({ title: "Erreur", description: "Impossible de mettre à jour le stock", variant: "destructive" })
    }
  }

  if (isLoading) {
    return <DashboardSkeleton />
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* En-tête simplifié et élégant */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Tableau de Bord des Stocks</h1>
          <p className="text-slate-500 mt-1">
            Aperçu en temps réel de l'inventaire et prévisions IA.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            onClick={refreshAllData}
            disabled={isRefreshing}
            className="shadow-sm hover:bg-slate-50 transition-all duration-300"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Actualisation...' : 'Actualiser'}
          </Button>
          <Button 
            onClick={() => navigate('/products')}
            className="bg-primary text-white shadow-md hover:shadow-lg transition-all duration-300"
          >
            <Package className="h-4 w-4 mr-2" />
            Gérer les Produits
          </Button>
        </div>
      </div>


      {/* Grille des métriques */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Produits Totaux"
          value={stats?.total_produits?.toString() || "0"}
          description="Articles actifs en inventaire"
          icon={<Package />}
          variant="blue"
          trend={{ value: 12, label: "depuis le mois dernier" }}
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
          title="Stock Critique"
          value={stats?.total_stock_faible?.toString() || "0"}
          description="Articles sous le seuil critique"
          icon={<AlertTriangle />}
          variant="destructive"
          trend={{ value: criticalProductsState.length, label: "produits" }}
        />
        
        <MetricCard
          title="Précision des Prévisions"
          value="94,2 %"
          description="Performance du modèle"
          icon={<Brain />}
          variant="success"
          trend={{ value: 2.1, label: "amélioration" }}
        />
      </div>

      {/* Ligne des graphiques */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
              Ventes vs Prévisions
            </CardTitle>
            <CardDescription>
              Performances réelles comparées aux prévisions IA
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LineChart
              data={salesData}
              xAxisKey="month"
              lines={[
                { key: "actual", name: "Ventes Réelles", color: "rgb(67, 110, 240)" },
                { key: "predicted", name: "Prévisions", color: "hsl(var(--prediction))" }
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
                <CardDescription>
                  État des stocks pour les 5 produits les plus critiques
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={fetchStockData}
                className="gap-2 transition-all duration-300"
              >
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
                      { 
                        key: "current", 
                        name: "Stock Actuel", 
                        color: "rgb(67, 110, 240)",
                        tooltip: (value) => `Stock actuel : ${value} unités`
                      },
                      { 
                        key: "critical", 
                        name: "Seuil Critique", 
                        color: "hsl(var(--destructive))",
                        tooltip: (value) => `Seuil critique : ${value} unités`
                      }
                    ]}
                    height={320}
                    showLegend
                    showGrid
                    showTooltip
                    className="mt-4"
                    xAxisProps={{
                      angle: -45,
                      textAnchor: "end",
                      dominantBaseline: "auto",
                      fontSize: 12,
                      interval: 0,
                      dy: 8,
                      dx: -8
                    }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="lg:col-span-2 border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <StockChart
            symbol="STOCK-001"
            name="Évolution du stock global"
            currentPrice={10000}
            volatility={1.5}
          />
        </Card>
      </div>

      {/* Tableau des produits critiques */}
      <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <span className="w-2 h-6 bg-red-500 rounded-full"></span>
              Produits à Priorité Critique
            </CardTitle>
            <CardDescription>
              Produits nécessitant une attention immédiate selon les niveaux de stock et les prévisions
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="transition-all duration-300"
            onClick={() => navigate('/products')}
          >
            Voir Tous les Produits
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
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
              criticalProductsState.map((product) => (
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
                    <Badge variant={
                      product.status === "critical" ? "destructive" :
                      product.status === "warning" ? "secondary" :
                      product.status === "low" ? "outline" :
                      "default"
                    } className="px-3 py-1 transition-all duration-300">
                      {product.status === "critical" ? "Critique" :
                       product.status === "warning" ? "Stock Faible" :
                       product.status === "low" ? "À Surveiller" :
                       product.status === "ok" ? "OK" : "Bon"}
                    </Badge>
                    
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
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}