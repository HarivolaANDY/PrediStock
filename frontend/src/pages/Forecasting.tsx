import { useState, useEffect, useMemo, useCallback } from "react"
import { Brain, TrendingUp, Calendar, Target, RefreshCw, CheckCircle, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LineChart } from "@/components/charts/LineChart"
import { MetricCard } from "@/components/MetricCard"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"
import recommendationService from "@/services/recommendationService"
import { Recommendation, Prediction } from "@/types/types"
import { isAxiosError } from "axios"

// interface ChatMessage {
//   role: 'user' | 'assistant'
//   content: string
// }

export default function Forecasting(): React.JSX.Element {
  const [selectedPeriod, setSelectedPeriod] = useState("30")
  const [selectedModel, setSelectedModel] = useState("")
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [applyingId, setApplyingId] = useState<number | null>(null)
  const [launchingPipeline, setLaunchingPipeline] = useState(false)

  // Chatbot
  //const [showChat, setShowChat] = useState(false)
  //const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    //{ role: 'assistant', content: "Bonjour ! Je suis l'assistant IA de prévision. Demandez-moi une recommandation pour un produit à une date donnée. Ex : \"Que faire pour le produit X le 15 janvier ?\"" }
  //])
  //const [chatInput, setChatInput] = useState("")
  //const [chatLoading, setChatLoading] = useState(false)

  // ── Chargement des données ────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [recs, preds] = await Promise.all([
        recommendationService.getAll(),
        recommendationService.getPredictions(),
      ])
      setRecommendations(recs)
      setPredictions(preds)
    } catch (err) {
      console.error("Erreur données forecasting:", err)
      setError("Impossible de charger les données.")
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Lancement du pipeline ─────────────────────────────────────────────────
  const handleLaunchPipeline = async () => {
    setLaunchingPipeline(true)
    try {
      const result = await recommendationService.runPrediction()
      toast({
        title: "Pipeline lancé",
        description: result.message || "La prévision est en cours de traitement.",
        variant: "default",
      })
      // Recharger après quelques secondes
      setTimeout(() => fetchData(), 3000)
    } catch (err: unknown) {
      let message = "Une erreur est survenue lors du lancement du pipeline."
      if (isAxiosError(err)) {
        const data = err.response?.data
        message = data?.error || data?.detail || data?.message || (typeof data === 'string' ? data : message)
      }

      toast({
        title: "Erreur pipeline",
        description: message,
        variant: "destructive",
      })
      console.error("Pipeline error:", err)
    } finally {
      setLaunchingPipeline(false)
    }
  }

  // ── Chatbot ───────────────────────────────────────────────────────────────

  // ── Helpers ───────────────────────────────────────────────────────────────
  const calculateDaysUntilPrediction = (predictionDate: string): number => {
    const today = new Date()
    const prediction = new Date(predictionDate)
    const diffTime = prediction.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const getRecommendationStatus = (r: Recommendation): "critical" | "order_now" | "monitor" | "sufficient" => {
    if (r.est_applique) return "sufficient"
    const days = calculateDaysUntilPrediction(r.date_prediction)
    if (days <= 0) return "critical"
    if (days <= 7) return "order_now"
    if (days <= 14) return "monitor"
    return "sufficient"
  }

  const getStatusBadge = (status: string): React.JSX.Element => {
    switch (status) {
      case "critical":   return <Badge variant="destructive">Critique</Badge>
      case "order_now":  return <Badge variant="secondary" className="bg-warning text-warning-foreground">Commander</Badge>
      case "monitor":    return <Badge variant="outline">Surveiller</Badge>
      case "sufficient": return <Badge variant="default" className="bg-success text-success-foreground">OK</Badge>
      default:           return <Badge variant="outline">Inconnu</Badge>
    }
  }

  const getPriorityBadge = (priority: string): React.JSX.Element => {
    switch (priority?.toUpperCase()) {
      case "HAUTE":   return <Badge variant="destructive">Haute</Badge>
      case "MOYENNE": return <Badge variant="secondary" className="bg-warning text-warning-foreground">Moyenne</Badge>
      case "BASSE":   return <Badge variant="outline">Basse</Badge>
      default:        return <Badge variant="outline">{priority || "—"}</Badge>
    }
  }

  const handleApply = async (id: number) => {
    setApplyingId(id)
    const ok = await recommendationService.apply(id)
    if (ok) {
      setRecommendations(prev => prev.map(r => r.id === id ? { ...r, est_applique: true } : r))
      toast({ title: "Succès", description: "Recommandation appliquée.", variant: "default" })
    } else {
      toast({ title: "Erreur", description: "Impossible d'appliquer la recommandation.", variant: "destructive" })
    }
    setApplyingId(null)
  }

  // ── Métriques réelles ─────────────────────────────────────────────────────
  const totalRecs = recommendations.length
  const critiques = recommendations.filter(r => getRecommendationStatus(r) === "critical").length
  const aCommander = recommendations.filter(r => getRecommendationStatus(r) === "order_now").length
  const appliquees = recommendations.filter(r => r.est_applique).length

  // Graphique des prédictions réelles si disponibles
  const modelesDisponibles = useMemo(() =>
    [...new Set(predictions.map(p => p.modele_utilise).filter(Boolean))],
    [predictions]
  )

  const predictionsFiltrees = useMemo(() => {
    let filtered = predictions
    if (selectedModel)
      filtered = filtered.filter(p => p.modele_utilise === selectedModel)
    const days = parseInt(selectedPeriod)
    const limit = new Date()
    limit.setDate(limit.getDate() + days)
    filtered = filtered.filter(p => new Date(p.date_prediction) <= limit)
    return filtered.slice(0, 8).map(p => ({
      month: new Date(p.date_prediction).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }),
      stock_prevu: p.stock_prevu,
      import_qty: p.import_qty,
      export_qty: p.export_qty,
    }))
  }, [predictions, selectedModel, selectedPeriod])

  useEffect(() => {
    if (modelesDisponibles.length > 0 && !selectedModel) {
      setSelectedModel(modelesDisponibles[0])
    }
  }, [modelesDisponibles, selectedModel])

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
          <Button
            variant="outline"
            className="gap-2 text-orange-600 border-orange-300 hover:bg-orange-50"
            onClick={handleLaunchPipeline}
            disabled={launchingPipeline}
          >
            <Play className={`h-4 w-4 ${launchingPipeline ? 'animate-pulse' : ''}`} />
            {launchingPipeline ? "Lancement..." : "Lancer le pipeline"}
          </Button>
          <Button
            className="gap-2 text-white bg-bouton hover:bg-bouton-hover"
            variant="outline"
            onClick={fetchData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* ── Métriques réelles ── */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Recommandations totales"
          value={totalRecs.toString()}
          description="Générées par le pipeline IA"
          icon={<Brain />}
          variant="prediction"
        />
        <MetricCard
          title="Critiques"
          value={critiques.toString()}
          description="Rupture imminente"
          icon={<Target />}
          variant="destructive"
        />
        <MetricCard
          title="À commander"
          value={aCommander.toString()}
          description="Dans les 7 prochains jours"
          icon={<TrendingUp />}
          variant="warning"
        />
        <MetricCard
          title="Appliquées"
          value={appliquees.toString()}
          description="Recommandations traitées"
          icon={<Calendar />}
          variant="success"
        />
      </div>

      {/* ── Graphique ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Prévisions du pipeline IA</CardTitle>
              <CardDescription>
                {predictions.length > 0
                  ? `${predictions.length} prédictions chargées`
                  : "Lancez le pipeline pour afficher les prévisions"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Modèle" />
                </SelectTrigger>
                <SelectContent>
                  {modelesDisponibles.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
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
          {predictions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground gap-3">
              <Brain className="h-10 w-10 opacity-20" />
              <p>Aucune prédiction disponible.</p>
              <p className="text-xs">Lancez le pipeline IA pour générer des prévisions.</p>
            </div>
          ) : (
            <LineChart
              data={predictionsFiltrees}
              xAxisKey="month"
              lines={[
                { key: "stock_prevu", name: "Stock prévu",  color: "rgb(67, 110, 240)" },
                { key: "import_qty",  name: "Import prévu", color: "hsl(var(--success))" },
                { key: "export_qty",  name: "Export prévu", color: "hsl(var(--destructive))" },
              ]}
              height={400}
            />
          )}
        </CardContent>
      </Card>

      {/* ── Tableau des recommandations ── */}
      <Tabs defaultValue="recommendations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="recommendations">Recommandations</TabsTrigger>
          <TabsTrigger value="predictions">Prédictions brutes</TabsTrigger>
          <TabsTrigger value="seasonality">Saisonnalité</TabsTrigger>
        </TabsList>

        {/* Recommandations */}
        <TabsContent value="recommendations">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recommandations de réapprovisionnement</CardTitle>
                  <CardDescription>
                    Générées par le pipeline IA ou le chatbot Gemini
                  </CardDescription>
                </div>
                {recommendations.length === 0 && !loading && (
                  <Button
                    variant="outline"
                    className="gap-2 text-orange-600 border-orange-300 hover:bg-orange-50"
                    onClick={handleLaunchPipeline}
                    disabled={launchingPipeline}
                  >
                    <Play className="h-4 w-4" />
                    Générer des recommandations
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center h-32 text-muted-foreground">
                  Chargement des recommandations...
                </div>
              ) : error ? (
                <div className="flex justify-center items-center h-32 text-red-500">{error}</div>
              ) : recommendations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-3">
                  <Brain className="h-8 w-8 opacity-30" />
                  <p>Aucune recommandation disponible.</p>
                  <p className="text-xs text-center max-w-sm">
                    Lancez le pipeline IA avec le bouton en haut, ou utilisez l'assistant IA pour générer des recommandations en langage naturel.
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produit</TableHead>
                        <TableHead className="text-right">Stock actuel</TableHead>
                        <TableHead className="text-right">Date prévision</TableHead>
                        <TableHead className="text-right">Jours restants</TableHead>
                        <TableHead className="text-right">Qté recommandée</TableHead>
                        <TableHead className="text-right">Prix estimé</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Priorité</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recommendations.map((rec, index) => {
                        const status = getRecommendationStatus(rec)
                        const days = calculateDaysUntilPrediction(rec.date_prediction)
                        return (
                          <TableRow key={rec.id ?? `rec-${index}`}>
                            <TableCell className="font-medium">
                              {rec.product_details?.name || `Produit #${rec.product}`}
                            </TableCell>
                            <TableCell className="text-right">
                              {rec.product_details?.current_stock ?? "—"}
                            </TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">
                              {rec.date_prediction
                                ? new Date(rec.date_prediction).toLocaleDateString('fr-FR')
                                : "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={days <= 0 ? "text-red-500 font-semibold" : days <= 7 ? "text-orange-500 font-medium" : ""}>
                                {days <= 0 ? "Rupture" : `${days}j`}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">{rec.quantite_suggeree ?? "—"}</TableCell>
                            <TableCell className="text-right">
                              {rec.prix_estime
                                ? rec.prix_estime.toLocaleString('fr-MG') + ' Ar'
                                : "—"}
                            </TableCell>
                            <TableCell>
                              <span className="text-sm capitalize">{rec.type_recommandation || "—"}</span>
                            </TableCell>
                            <TableCell>{getPriorityBadge(rec.priority)}</TableCell>
                            <TableCell>{getStatusBadge(status)}</TableCell>
                            <TableCell className="text-right">
                              {!rec.est_applique ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1"
                                  disabled={applyingId === rec.id}
                                  onClick={() => handleApply(rec.id)}
                                >
                                  <CheckCircle className="h-3 w-3" />
                                  {applyingId === rec.id ? "..." : "Appliquer"}
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground">✓ Appliquée</span>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Prédictions brutes */}
        <TabsContent value="predictions">
          <Card>
            <CardHeader>
              <CardTitle>Prédictions brutes du modèle</CardTitle>
              <CardDescription>
                Données de prévision générées par le pipeline ML
              </CardDescription>
            </CardHeader>
            <CardContent>
              {predictions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2">
                  <p>Aucune prédiction disponible.</p>
                  <p className="text-xs">Lancez le pipeline pour générer des prédictions.</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produit</TableHead>
                        <TableHead>Date prévision</TableHead>
                        <TableHead className="text-right">Stock prévu</TableHead>
                        <TableHead className="text-right">Import prévu</TableHead>
                        <TableHead className="text-right">Export prévu</TableHead>
                        <TableHead>Rupture</TableHead>
                        <TableHead>Modèle</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {predictions.map((pred, index) => (
                        <TableRow key={pred.id ?? `pred-${index}`}>
                          <TableCell className="font-medium">
                            {pred.product_name || `Produit #${pred.product}`}
                          </TableCell>
                          <TableCell>{new Date(pred.date_prediction).toLocaleDateString('fr-FR')}</TableCell>
                          <TableCell className="text-right">{pred.stock_prevu?.toFixed(0) ?? "—"}</TableCell>
                          <TableCell className="text-right text-green-600">+{pred.import_qty?.toFixed(0) ?? 0}</TableCell>
                          <TableCell className="text-right text-red-500">-{pred.export_qty?.toFixed(0) ?? 0}</TableCell>
                          <TableCell>
                            {pred.rupture
                              ? <Badge variant="destructive">Rupture</Badge>
                              : <Badge variant="default" className="bg-success text-success-foreground">OK</Badge>}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{pred.modele_utilise}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seasonality">
          <Card>
            <CardHeader>
              <CardTitle>Modèles de saisonnalité</CardTitle>
              <CardDescription>Tendances saisonnières et modèles récurrents</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Contenu de l'analyse de la saisonnalité à venir...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}