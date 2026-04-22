import { useState, useEffect, useCallback } from "react"
import { Package, AlertTriangle, Brain, DollarSign } from "lucide-react"
import { MetricCard } from "@/components/MetricCard"
import { LineChart } from "@/components/charts/LineChart"
import { BarChart } from "@/components/charts/BarChart"
import { StockChart } from "@/components/stocks/StockChart"
import { toast } from "@/components/ui/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import API from '@/services/axios'
import { Product, CriticalProduct, DashboardStats } from "@/types/types"

// Données fictives
const salesData = [
  { month: "Jan", actual: 2400, predicted: 2200 },
  { month: "Feb", actual: 1398, predicted: 1500 },
  { month: "Mar", actual: 9800, predicted: 9500 },
  { month: "Apr", actual: 3908, predicted: 4000 },
  { month: "May", actual: 4800, predicted: 4600 },
  { month: "Jun", actual: 3800, predicted: 4200 },
]

export default function Dashboard() {

  const [stockData, setStockData] = useState<{product: string; current: number; critical: number}[]>([]);
  const [criticalProductsState, setCriticalProductsState] = useState<CriticalProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  
  // Fonction pour calculer le statut du produit
  const calculateStatus = (current: number, threshold: number) => {
    const ratio = current / threshold;
    if (ratio <= 0.25) return "critical";
    if (ratio <= 0.5) return "warning";
    if (ratio <= 0.75) return "low";
    if (ratio <= 1) return "ok";
    return "good";
  };

  // Fonction pour calculer les jours restants avant rupture
  const calculateDaysUntilStockout = (current: number, avgDailyUse: number) => {
    if (avgDailyUse <= 0) return 30; // Valeur par défaut si pas de consommation
    return Math.round(current / avgDailyUse);
  };

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Stats
      const statsRes = await API.get('catalogue/products/stats/');
      if (statsRes.data && statsRes.data.data) {
        setStats(statsRes.data.data);
      }

      // 2. Fetch Products for Stock Chart and Critical List
      const productsRes = await API.get('catalogue/products/');
      const results = productsRes.data?.data?.results || [];
      
      if (Array.isArray(results)) {
        // Stock Data for BarChart
        const topCritical = [...results]
          .map((p: Product) => ({
            ratio: Math.abs(p.current_stock - p.stock_threshold),
            data: {
              product: p.name,
              current: p.current_stock,
              critical: p.stock_threshold
            }
          }))
          .sort((a, b) => b.ratio - a.ratio)
          .slice(0, 5)
          .map(item => item.data);
        setStockData(topCritical);

        // Critical Products List
        const criticals: CriticalProduct[] = results
          .filter((p: Product) => p.current_stock <= p.stock_threshold)
          .map((p: Product) => ({
            id: p.id,
            name: p.name,
            current_stock: p.current_stock,
            stock_threshold: p.stock_threshold,
            status: calculateStatus(p.current_stock, p.stock_threshold) as "critical" | "warning" | "low" | "ok" | "good",
            days: calculateDaysUntilStockout(p.current_stock, 2),
            product_img: p.product_img,
            stock: p.current_stock,
            critical: p.stock_threshold
          }));
        setCriticalProductsState(criticals);
      }
    } catch (err) {
      console.error('Erreur dashboard data:', err);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données du tableau de bord",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleRestock = async (product: CriticalProduct) => {
    const quantity = parseInt(prompt(`Combien d'unités réapprovisionner pour ${product.name} ?`) || '0', 10);
    
    if (isNaN(quantity) || quantity <= 0) {
        toast({ title: "Erreur", description: "Quantité invalide.", variant: "destructive" });
        return;
    }

    try {
        const response = await API.patch(
            `catalogue/products/${product.id}/`,
            { current_stock: product.current_stock + quantity }
        );

        if (response.data) {
            await fetchDashboardData();
            toast({
                title: "Succès",
                description: `Réapprovisionnement réussi. Nouveau stock : ${product.current_stock + quantity}`,
            });
        }
    } catch (error) {
        toast({ title: "Erreur", description: "Impossible de mettre à jour le stock", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tableau de Bord des Stocks</h1>
        <p className="text-muted-foreground">
          Aperçu en temps réel de l'inventaire et prévisions IA pour une gestion optimisée des stocks.
        </p>
      </div>

      {/* Grille des métriques */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Produits Totaux"
          value={stats?.total_produits?.toString() || "0"}
          description="Articles actifs en inventaire"
          icon={<Package />}
          trend={{ value: 12, label: "depuis le mois dernier" }}
        />
        
        <MetricCard
          title="Valeur du Stock"
          value={`${(stats?.total_stock || 0).toLocaleString()} Ariary`}
          description="Valeur totale des produits en stock"
          icon={<DollarSign />}
          variant="prediction"
          trend={{ value: 0, label: "valeur actuelle" }}
        />
        
        <MetricCard
          title="Stock Critique"
          value={stats?.total_stock_rupture?.toString() || "0"}
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
        <Card>
          <CardHeader>
            <CardTitle>Ventes vs Prévisions</CardTitle>
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

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Niveaux de Stock Actuels</CardTitle>
                <CardDescription>
                  État des stocks pour les 5 produits les plus critiques
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={fetchDashboardData}
                className="gap-2"
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
        <Card className="lg:col-span-2">
          <StockChart
            symbol="STOCK-001"
            name="Évolution du stock global"
            currentPrice={10000}
            volatility={1.5}
          />
        </Card>
      </div>

      {/* Tableau des produits critiques */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Produits à Priorité Critique</CardTitle>
            <CardDescription>
              Produits nécessitant une attention immédiate selon les niveaux de stock et les prévisions
            </CardDescription>
          </div>
          <Button variant="outline" size="sm">
            Voir Tous les Produits
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-4">Chargement des produits critiques...</div>
            ) : criticalProductsState.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                Aucun produit critique trouvé
              </div>
            ) : (
              criticalProductsState.map((product) => (
                <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="flex items-center space-x-4">
                    {product.product_img && (
                      <img 
                        src={`http://localhost:8000${product.product_img}`}
                        alt={product.name}
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                    )}
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Stock : {product.current_stock} unités | Seuil : {product.stock_threshold}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <Badge variant={
                      product.status === "critical" ? "destructive" :
                      product.status === "warning" ? "secondary" :
                      product.status === "low" ? "outline" :
                      "default"
                    }>
                      {product.status === "critical" ? "Critique" :
                       product.status === "warning" ? "Stock Faible" :
                       product.status === "low" ? "À Surveiller" :
                       product.status === "ok" ? "OK" : "Bon"}
                    </Badge>
                    
                    <div className="text-right">
                      <p className="text-sm font-medium">{product.days} jours</p>
                      <p className="text-xs text-muted-foreground">avant rupture</p>
                    </div>
                    
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleRestock(product)}
                      className="hover:bg-primary hover:text-primary-foreground"
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