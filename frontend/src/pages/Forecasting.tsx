import { useState, useEffect } from "react"
import { Brain, TrendingUp, Calendar, Target, Download, RefreshCw, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LineChart } from "@/components/charts/LineChart"
import { MetricCard } from "@/components/MetricCard"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import recommendationService, { Recommendation } from "@/services/recommendationService"

// Mock data for the chart
const forecastData = [
  { month: "Jan", actual: 2400, predicted: 2200, upper: 2600, lower: 1800 },
  { month: "Feb", actual: 1398, predicted: 1500, upper: 1900, lower: 1100 },
  { month: "Mar", actual: 9800, predicted: 9500, upper: 10200, lower: 8800 },
  { month: "Apr", actual: 3908, predicted: 4000, upper: 4400, lower: 3600 },
  { month: "May", actual: 4800, predicted: 4600, upper: 5000, lower: 4200 },
  { month: "Jun", actual: null, predicted: 4200, upper: 4800, lower: 3600 },
  { month: "Jul", actual: null, predicted: 4500, upper: 5100, lower: 3900 },
  { month: "Aug", actual: null, predicted: 4800, upper: 5400, lower: 4200 },
]



export default function Forecasting() {
  const [selectedPeriod, setSelectedPeriod] = useState("30")
  const [selectedModel, setSelectedModel] = useState("xgboost")
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])

  const calculateDaysUntilPrediction = (predictionDate: string): number => {
    const today = new Date()
    const prediction = new Date(predictionDate)
    const diffTime = prediction.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const getRecommendationStatus = (recommendation: Recommendation): "critical" | "order_now" | "monitor" | "sufficient" => {
    const daysUntil = calculateDaysUntilPrediction(recommendation.date_prediction)
    if (daysUntil <= 0) return "critical"
    if (daysUntil <= 7) return "order_now"
    if (daysUntil <= 14) return "monitor"
    return "sufficient"
  }

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const response = await recommendationService.getAll()
        console.log("API Response:", response)
        if (response.data && Array.isArray(response.data.data)) {
          setRecommendations(response.data.data)
        } else {
          console.error("Unexpected API response format:", response)
          setRecommendations([])
        }
      } catch (error) {
        console.error("Error fetching recommendations:", error)
        setRecommendations([])
      }
    }
    fetchRecommendations()
  }, [])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "critical":
        return <Badge variant="destructive">Critical</Badge>
      case "order_now":
        return <Badge variant="secondary" className="bg-warning text-warning-foreground">Order Now</Badge>
      case "monitor":
        return <Badge variant="outline">Monitor</Badge>
      case "sufficient":
        return <Badge variant="default" className="bg-success text-success-foreground">Sufficient</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Prévisions de l'IA</h1>
          <p className="text-muted-foreground">
            Prédictions de la demande et optimisation des stocks basées sur l'apprentissage automatique
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Rapport d'exportation
          </Button>
          <Button className="gap-2 text-white bg-bouton hover:bg-bouton-hover" variant="outline">
            <RefreshCw className="h-4 w-4" />
            Modèle de recyclage
          </Button>
        </div>
      </div>

      {/* Model Performance Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Précision du modèle"
          value="94.7%"
          description="Précision moyenne des prédictions"
          icon={<Brain />}
          variant="prediction"
          trend={{ value: 2.1, label: "amélioration" }}
        />
        
        <MetricCard
          title="Score MAE"
          value="12.4"
          description="Mean Absolute Error"
          icon={<Target />}
          trend={{ value: -5.2, label: "diminuer" }}
        />
        
        <MetricCard
          title="Prévisions générées"
          value="2,341"
          description="Ce mois-ci"
          icon={<TrendingUp />}
          trend={{ value: 18, label: "du mois dernier" }}
        />
        
        <MetricCard
          title="Les jour à venir"
          value="30"
          description="Horizon de prévision actuel"
          icon={<Calendar />}
        />
      </div>

      {/* Main Forecasting Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Aperçu des prévisions de la demande</CardTitle>
              <CardDescription>
                Prédictions basées sur l'IA avec intervalles de confiance
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="xgboost">XGBoost</SelectItem>
                  <SelectItem value="linear">Regression Lineaire</SelectItem>
                  <SelectItem value="light">LightGBM</SelectItem>
                  <SelectItem value="ridge">Ridge</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 Jours</SelectItem>
                  <SelectItem value="14">14 Jours</SelectItem>
                  <SelectItem value="30">30 Jours</SelectItem>
                  <SelectItem value="90">90 Jours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <LineChart
            data={forecastData}
            xAxisKey="month"
            lines={[
              { key: "actual", name: "Demande réelle", color: "rgb(67, 110, 240)" },
              { key: "predicted", name: "Demande prévue", color: "hsl(var(--prediction))" },
              { key: "upper", name: "Limite supérieur", color: "hsl(var(--muted-foreground))" },
              { key: "lower", name: "Limite inférieur", color: "hsl(var(--muted-foreground))" }
            ]}
            height={400}
          />
        </CardContent>
      </Card>

      {/* Detailed Forecasts */}
      <Tabs defaultValue="products" className="space-y-4">
        <TabsList>
          <TabsTrigger value="products">Prévisions de produits</TabsTrigger>
          <TabsTrigger value="categories">Analyse des catégories</TabsTrigger>
          <TabsTrigger value="seasonality">Modèles de saisonnalité</TabsTrigger>
        </TabsList>
        
        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Prévisions de produits individuels</CardTitle>
              <CardDescription>
                Prévisions et recommandations détaillées pour chaque produit
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produit</TableHead>
                        <TableHead className="text-right">Stock actuel</TableHead>
                        <TableHead className="text-right">Jours avant rupture</TableHead>
                        <TableHead className="text-right">Quantité recommandée</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recommendations.map((recommendation) => (
                        <TableRow key={recommendation.id}>
                          <TableCell className="font-medium">
                            {recommendation.product_details?.name}
                          </TableCell>
                          <TableCell className="text-right">
                            {recommendation.product_details?.current_stock}
                          </TableCell>
                          <TableCell className="text-right">
                            {calculateDaysUntilPrediction(recommendation.date_prediction)}
                          </TableCell>
                          <TableCell className="text-right">
                            {recommendation.quantite_suggeree}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(getRecommendationStatus(recommendation))}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analyse des performances des catégories</CardTitle>
              <CardDescription>
                Informations prévisionnelles regroupées par catégorie de produits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Contenu d'analyse de catégorie à venir...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seasonality" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Modèles de saisonnalité</CardTitle>
              <CardDescription>
                Identifier les tendances saisonnières et les modèles récurrents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Contenu de l'analyse de la saisonalité à venir...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}