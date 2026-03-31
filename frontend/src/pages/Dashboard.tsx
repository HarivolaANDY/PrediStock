import { Package, AlertTriangle, Brain, DollarSign, ShoppingCart } from "lucide-react"
import { MetricCard } from "@/components/MetricCard"
import { LineChart } from "@/components/charts/LineChart"
import { BarChart } from "@/components/charts/BarChart"
import { useEffect } from "react"
import axios from "axios"
import { CriticalProduct } from "@/types/product"
import { toast } from "@/components/ui/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
// import { StockCard } from "@/components/stocks/StockCard"
import { StockChart } from "@/components/stocks/StockChart"
import { mockStocks } from '@/utils/stocksApi';
import { useState } from "react"
import { useProducts } from "@/hooks/useProducts"

const authHeaders = () => ({
    headers: {
        'Authorization': `Token ${localStorage.getItem('token')}`
    }
});

// Données fictives
const salesData = [
  { month: "Jan", actual: 2400, predicted: 2200 },
  { month: "Feb", actual: 1398, predicted: 1500 },
  { month: "Mar", actual: 9800, predicted: 9500 },
  { month: "Apr", actual: 3908, predicted: 4000 },
  { month: "May", actual: 4800, predicted: 4600 },
  { month: "Jun", actual: 3800, predicted: 4200 },
]

interface StockData {
  product: string;
  current: number;
  critical: number;
}

export default function Dashboard() {

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedStock, setSelectedStock] = useState(mockStocks[0]);
  const { products, loading, error, refetch } = useProducts();
  const [ searchTerm, setSearchTerm ] = useState("")

  const [stockData, setStockData] = useState<StockData[]>([]);
  // const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  // const [selectedStock, setSelectedStock] = useState(mockStocks[0]);
  const [criticalProductsState, setCriticalProductsState] = useState<CriticalProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalProducts, setTotalProducts] = useState<number>(0);
  const [totalStockValue, setTotalStockValue] = useState<number>(0);
  const [criticalCount, setCriticalCount] = useState<number>(0);
  
  const filteredProducts = products?.filter((product: any) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(product.category).toLowerCase().includes(searchTerm.toLowerCase())
  ) ?? []
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

  // Fonction pour récupérer les données de stock pour le graphique
  const fetchStockData = async () => {
    try {
        const response = await axios.get('http://localhost:8000/api/catalogue/products/', authHeaders());
        if (response.data?.data && Array.isArray(response.data.data.results)) {
            const products = response.data.data.results
                .map((product: any) => ({
                    ratio: Math.abs(product.current_stock - product.stock_threshold),
                    data: {
                        product: product.name,
                        current: product.current_stock,
                        critical: product.stock_threshold
                    }
                }))
                .sort((a, b) => b.ratio - a.ratio)
                .map(item => item.data);
            setStockData(products);
        }
    } catch (error) {
        console.error('Erreur lors de la récupération des données de stock:', error);
    }
};

  // Fonction pour récupérer les produits critiques
  const fetchCriticalProducts = async () => {
    setIsLoading(true);
    try {
        // Pas de route /critical/, on filtre côté client
        const response = await axios.get('http://localhost:8000/api/catalogue/products/', authHeaders());
        if (response.data && response.data.data && Array.isArray(response.data.data.results)) {
            const criticalProducts = response.data.data.results
                .filter((product: any) => product.current_stock <= product.stock_threshold)
                .map((product: any) => ({
                    id: product.id,
                    name: product.name,
                    stock: product.current_stock,
                    current_stock: product.current_stock,
                    critical: product.stock_threshold,
                    stock_threshold: product.stock_threshold,
                    status: calculateStatus(product.current_stock, product.stock_threshold),
                    days: calculateDaysUntilStockout(product.current_stock, 2),
                    product_img: product.product_img
                }));
            setCriticalProductsState(criticalProducts);
            setCriticalCount(criticalProducts.length);
        }
    } catch (error) {
        console.error('Erreur lors de la récupération des produits critiques:', error);
        toast({
            title: "Erreur",
            description: "Impossible de charger les produits critiques",
            variant: "destructive",
        });
    } finally {
        setIsLoading(false);
    }
};

  // Fonction pour récupérer le nombre total de produits
  const fetchTotalProducts = async () => {
    try {
        const response = await axios.get('http://localhost:8000/api/catalogue/products/', authHeaders());
        if (response.data?.data?.count) {
            setTotalProducts(response.data.data.count);
        }
    } catch (error) {
        console.error('Erreur lors de la récupération du nombre total de produits:', error);
    }
};
  // Fonction pour calculer la valeur totale des stocks
  const calculateTotalStockValue = async () => {
    try {
        const response = await axios.get('http://localhost:8000/api/catalogue/products/', authHeaders());
        if (response.data?.data && Array.isArray(response.data.data.results)) {
            const totalValue = response.data.data.results.reduce((sum: number, product: any) =>
                sum + (product.current_stock * (product.price || 0)), 0
            );
            setTotalStockValue(totalValue);
        }
    } catch (error) {
        console.error('Erreur lors du calcul de la valeur totale des stocks:', error);
    }
};

  // Effet pour charger les données au montage du composant
  useEffect(() => {
    fetchCriticalProducts();
    fetchStockData();
    fetchTotalProducts();
    calculateTotalStockValue();
  }, []);

  const handleRestock = async (product: CriticalProduct) => {
    const quantity = parseInt(prompt(`Combien d'unités réapprovisionner pour ${product.name} ?`) || '0', 10);
    
    if (isNaN(quantity) || quantity <= 0) {
        toast({ title: "Erreur", description: "Quantité invalide.", variant: "destructive" });
        return;
    }

    try {
        const response = await axios.patch(
            `http://localhost:8000/api/catalogue/products/${product.id}/`,
            { current_stock: product.current_stock + quantity }, // ← body ici
            authHeaders()                                         // ← headers en 3ème argument
        );

        if (response.data) {
            await fetchCriticalProducts();
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
          value={totalProducts.toString()}
          description="Articles actifs en inventaire"
          icon={<Package />}
          trend={{ value: 12, label: "depuis le mois dernier" }}
        />
        
        <MetricCard
          title="Valeur du Stock"
          value={`${totalStockValue.toLocaleString()} Ariary`}
          description="Valeur totale des produits en stock"
          icon={<DollarSign />}
          variant="prediction"
          trend={{ value: 0, label: "valeur actuelle" }}
        />
        
        <MetricCard
          title="Stock Critique"
          value={criticalCount.toString()}
          description="Articles sous le seuil critique"
          icon={<AlertTriangle />}
          variant="destructive"
          trend={{ value: criticalProductsState.length - criticalCount, label: "depuis hier" }}
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
                onClick={fetchStockData}
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
                    data={stockData}
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