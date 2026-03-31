import { useState, useEffect } from "react"
import { Brain, Settings, Play, Pause, BarChart3, TrendingUp } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { MetricCard } from "@/components/MetricCard"
import { LineChart } from "@/components/charts/LineChart"
import { ModelSettingsModal } from "@/components/ModelSettingsModal"
import { ModelSettings } from "@/types/models"

import { useToast } from "@/components/ui/use-toast"

interface ModelMetrics {
  RMSE: number;
  MAE: number;
  MAPE: number;
  score_pondere: number;
}

interface Model {
  name: string;
  type: string;
  status: string;
  metrics: ModelMetrics | null;
  lastTraining: string | null;
  predictions: number[];
}

interface ModelPerformance {
  activeModels: number;
  bestAccuracy: number;
  predictionsMade: number;
  trainingTime: number;
}

export default function AIModels() {
  const toast = useToast()
  const [models, setModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedModel, setSelectedModel] = useState<string>("")
  const [selectedModelConfig, setSelectedModelConfig] = useState({
    epochs: 100,
    batchSize: 32,
    learningRate: 0.001
  })
  const [performance, setPerformance] = useState<ModelPerformance | null>(null)
  const [ showSettings, setShowSettings ] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      // Charger la liste des modèles disponibles
      const modelsRes = await fetch("http://127.0.0.1:8000/api/modele/available_models/", {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      })
      if (!modelsRes.ok) {
        console.error("Erreur de réponse:", await modelsRes.text())
        throw new Error(`HTTP error! status: ${modelsRes.status}`)
      }
      const modelsData = await modelsRes.json()
      console.log("Modèles reçus:", modelsData)
      console.log("Type des données:", typeof modelsData, Array.isArray(modelsData))
      if (Array.isArray(modelsData)) {
        setModels(modelsData)
      } else if (modelsData.data && Array.isArray(modelsData.data)) {
        setModels(modelsData.data)
      } else {
        console.error("Format de données inattendu:", modelsData)
        setModels([])
      }

      // Charger les métriques de performance
      const perfRes = await fetch("http://127.0.0.1:8000/api/modele/performance/", {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      })
      const perfData = await perfRes.json()
      setPerformance(perfData)
    } catch (error) {
      console.error("Erreur lors du chargement des données:", error)
    } finally {
      setLoading(false)
    }
  }

  // Charger les données au chargement
  useEffect(() => {
    fetchData()
  }, [])

  // Mettre à jour la configuration du modèle
  const updateModelConfig = (config: Partial<typeof selectedModelConfig>) => {
    setSelectedModelConfig(prev => ({ ...prev, ...config }))
  }

  const startTraining = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      const res = await fetch("http://127.0.0.1:8000/api/modele/run_prevision_now/", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Token ${token}`
        }
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.message || "Erreur lors de l'entraînement")
      }
      
      toast.toast({
        title: "Succès",
        description: data.message || "L'entraînement a démarré avec succès",
        variant: "default"
      })
      
      // Recharger les données après l'entraînement
      await fetchData()
    } catch (error) {
      console.error("Erreur:", error)
      toast.toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de l'entraînement",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-success text-success-foreground">Active</Badge>
      case "training":
        return <Badge className="bg-warning text-warning-foreground">Training</Badge>
      case "inactive":
        return <Badge variant="secondary">Inactive</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 90) return "text-success"
    if (accuracy >= 80) return "text-warning"
    return "text-destructive"
  }
  const handleSettingsSave = (settings: ModelSettings) => {
    // TODO: Implémenter la sauvegarde des paramètres
    console.log('Nouveaux paramètres:', settings)
    setShowSettings(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Models</h1>
          <p className="text-muted-foreground">
            Configurez et surveillez la performance des modèles de prévision IA          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowSettings(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Paramètres du modèle
          </Button>
          <Button className="text-white bg-bouton hover:bg-bouton-hover" onClick={startTraining} disabled={loading}>
            <Brain className="h-4 w-4 mr-2" />
            {loading ? "Entraînement..." : "Entrainer les modèles"}
          </Button>
        </div>
      </div>

      {/* Model Performance Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Modèles Actifs"
          value={performance?.activeModels.toString() ?? "0"}
          trend={{ value: 1, label: "new this week" }}
          icon={<Brain className="h-4 w-4" />}
          variant="prediction"
        />
        <MetricCard
          title="Meilleur précision"
          value={`${performance?.bestAccuracy.toFixed(1) ?? 0}%`}
          trend={{ value: 1.8, label: "improvement" }}
          icon={<BarChart3 className="h-4 w-4" />}
          variant="success"
        />
        <MetricCard
          title="Prédiction effectuées"
          value={performance?.predictionsMade.toString() ?? "0"}
          trend={{ value: 12.3, label: "vs last month" }}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <MetricCard
          title="Durée d'entraînement"
          value={`${performance?.trainingTime.toFixed(1) ?? 0}h`}
          trend={{ value: -15.2, label: "faster" }}
          icon={<Brain className="h-4 w-4" />}
        />
      </div>

      <Tabs defaultValue="models" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="models">Aperçu des modèles</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="models">
          <Card>
            <CardHeader>
              <CardTitle>Statut des modèles IA</CardTitle>
              <CardDescription>
                Vue d'ensemble de tous les modèles configurés
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                {loading ? (
                  <div className="p-8 text-center text-muted-foreground">Chargement des modèles...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">Nom Modèles</TableHead>
                        <TableHead className="w-[100px]">Status</TableHead>
                        <TableHead className="text-right">MAE</TableHead>
                        <TableHead className="text-right">RMSE</TableHead>
                        <TableHead className="text-right">MAPE (%)</TableHead>
                        <TableHead className="text-right">Score</TableHead>
                        <TableHead className="w-[150px]">Dernier entraînement</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-4">
                            <div className="flex items-center justify-center">
                              Chargement des données des modèles
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : models.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-4">
                            Aucuns modèles disponibles
                          </TableCell>
                        </TableRow>
                      ) : (
                        models.map((model) => (
                          <TableRow key={model.name}>
                            <TableCell className="font-medium">{model.name}</TableCell>
                            <TableCell>{getStatusBadge(model.status)}</TableCell>
                            <TableCell className="text-right">{model.metrics?.MAE.toFixed(4)}</TableCell>
                            <TableCell className="text-right">{model.metrics?.RMSE.toFixed(4)}</TableCell>
                            <TableCell className="text-right">{model.metrics?.MAPE.toFixed(2)}%</TableCell>
                            <TableCell className={`text-right ${getAccuracyColor(model.metrics?.score_pondere ?? 0)}`}>
                              {model.metrics?.score_pondere.toFixed(4)}
                            </TableCell>
                            <TableCell>
                              {model.lastTraining ? (
                                new Date(model.lastTraining).toLocaleString('fr-FR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              ) : (
                                "Jamais entrainé"
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configuration">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Configuration du modèles</CardTitle>
                <CardDescription>
                  Configurez les paramètres pour le modèle sélectionné
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Sélectionner un modèle</label>
                  <Select value={models[0]?.name} onValueChange={(value) => {
                    const model = models.find(m => m.name === value)
                    if (model) {
                      updateModelConfig({
                        epochs: 100,
                        batchSize: 32,
                        learningRate: 0.001
                      })
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map((model) => (
                        <SelectItem key={model.name} value={model.name}>
                          {model.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Nombre d'époques
                  </label>
                  <Slider
                    value={[selectedModelConfig.epochs]}
                    onValueChange={([value]) => updateModelConfig({ epochs: value })}
                    min={1}
                    max={1000}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Taille du batch
                  </label>
                  <Slider
                    value={[selectedModelConfig.batchSize]}
                    onValueChange={([value]) => updateModelConfig({ batchSize: value })}
                    min={1}
                    max={128}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Taux d'apprentissage
                  </label>
                  <Slider
                    value={[selectedModelConfig.learningRate]}
                    onValueChange={([value]) => updateModelConfig({ learningRate: value })}
                    min={0.0001}
                    max={0.1}
                    step={0.0001}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Training Data</label>
                  <Select defaultValue="12months">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6months">6 derniers mois</SelectItem>
                      <SelectItem value="12months">12 derniers mois</SelectItem>
                      <SelectItem value="24months">24 derniers mois</SelectItem>
                      <SelectItem value="all">Toutes les données valides</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button className="w-full">
                  Appliquer les configurations
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status d'entraînement</CardTitle>
                <CardDescription>
                  Progression actuelle de l'entraînement du modèle
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {models.map(model => (
                  <div key={model.name} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{model.name}</span>
                      <span>{model.status === "training" ? "En cours..." : model.status === "active" ? "Terminé" : "En attente"}</span>
                    </div>
                    <Progress 
                      value={model.status === "active" ? 100 : model.status === "training" ? 65 : 0} 
                      className="h-2"
                    />
                  </div>
                ))}

                <div className="pt-4 space-y-4">
                  <h4 className="font-medium">File d'attente d'entraînement</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Achèvement estimé</span>
                      <span>~{performance?.trainingTime.toFixed(1)}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Modèles en file d'attente</span>
                      <span>{models.filter(m => m.status === "inactive").length}</span>
                    </div>
                  </div>
                </div>

                <Button className="w-full" variant="outline" onClick={startTraining} disabled={loading}>
                  <Brain className="h-4 w-4 mr-2" />
                  Lancer l'entraînement
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Métriques de performance des modèles</CardTitle>
                <CardDescription>
                  Suivez l'évolution des métriques de précision au fil du temps
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {models.map((model) => (
                    <div key={model.name} className="p-4 border rounded-lg">
                      <h3 className="text-lg font-semibold mb-4">{model.name}</h3>
                      {model.metrics && (
                        <LineChart 
                          data={[
                            { metric: "RMSE", value: model.metrics.RMSE },
                            { metric: "MAE", value: model.metrics.MAE },
                            { metric: "MAPE", value: model.metrics.MAPE },
                            { metric: "Score Pondéré", value: model.metrics.score_pondere }
                          ]}
                          xAxisKey="metric"
                          lines={[
                            { 
                              key: "value", 
                              name: "Valeur", 
                              color: model.name === "XGBoost" ? "rgba(251, 255, 0, 0.7)" :
                                    model.name === "RegressionLineaire" ? "hsl(var(--warning))" :
                                    model.name === "Ridge" ? "hsl(var(--success))" : "rgba(216, 65, 65, 0.7)"
                            }
                          ]}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Métriques de précision</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm">Mean Absolute Error (MAE)</span>
                    <span className="font-medium">{models[0]?.metrics?.MAE?.toFixed(1) ?? '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Root Mean Square Error (RMSE)</span>
                    <span className="font-medium">{models[0]?.metrics?.RMSE?.toFixed(1) ?? '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Mean Absolute Error (MAE %)</span>
                    <span className="font-medium">{models[0]?.metrics?.MAPE?.toFixed(1) ?? '-'}%</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performance Trends</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm">Tendances de performance</span>
                    <span className="font-medium text-success">+{performance?.bestAccuracy.toFixed(1) ?? 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Vitesse d'entraînement</span>
                    <span className="font-medium text-success">+{performance?.trainingTime.toFixed(1) ?? 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Confiance des prédictions</span>
                    <span className="font-medium">{performance?.bestAccuracy.toFixed(1) ?? 0}%</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Comparaison des modèles</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm">Meilleur modèle</span>
                    <span className="font-medium">{
                      models.reduce((best, current) => 
                        (current.metrics?.score_pondere ?? Infinity) < (best.metrics?.score_pondere ?? Infinity) 
                          ? current 
                          : best
                      , models[0])?.name ?? '-'
                    }</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Entraînement le plus rapideg</span>
                    <span className="font-medium">{models[0]?.name ?? '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Le plus stable</span>
                    <span className="font-medium">{
                      models.reduce((best, current) => 
                        (current.metrics?.RMSE ?? Infinity) < (best.metrics?.RMSE ?? Infinity) 
                          ? current 
                          : best
                      , models[0])?.name ?? '-'
                    }</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {showSettings && (
        <ModelSettingsModal
          onClose={() => setShowSettings(false)}
          onSave={handleSettingsSave}
        />
      )}

    </div>
  )

}