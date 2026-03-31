import { useState, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { Package, TrendingDown, TrendingUp, AlertTriangle, Filter, Search, Calendar, Clock, DollarSign, RefreshCw } from "lucide-react"
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
import { saveProduct } from "@/components/productApi"
import { StockMouvementForm } from "@/components/StockMouvementForm"
import ImportModalGenerer from "@/components/ImportModalGenerer"
import API from "@/services/axios"
import { parseAxiosBlobResponse, downloadAll } from "@/utils/blobUtils"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

type Product = {
  id: number
  product_img: string | null
  name: string
  sku: string
  description: string
  price: string
  stock_threshold: number
  current_stock: number
  is_active: boolean
  created_at: string
  updated_at: string
  category: number | null
  supplier: number | null
}

type Category = {
  id: number
  name: string
}

export default function Stock() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState<Category[]>([])
  const { products, loading, error, refetch } = useProducts()
  const [searchTerm, setSearchTerm] = useState("")
  const [alertSearchTerm, setAlertSearchTerm] = useState("")
  const [showStockMouvementForm, setShowStockMouvementForm] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [stockMouvements, setStockMouvements] = useState<any[]>([])
  const [stockMouvementsLoading, setStockMouvementsLoading] = useState(false)
  const [stockMouvementsError, setStockMouvementsError] = useState<string | null>(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [downloadedFiles, setDownloadedFiles] = useState<{ blob: Blob; filename: string }[]>([])
  const [isloadingexport, setIsloadingexport] = useState(false)
  const [isLoadingPDVs, setIsLoadingPDVs] = useState(false)
  const [PDVs, setPDVs] = useState<any[]>([])
  const [seuilHistorique, setSeuilHistorique] = useState<any[]>([])

  // ── Métriques calculées depuis les données réelles ─────────────────────────

  // Valeur totale du stock = sum(price * current_stock)
  const valeurTotaleStock = useMemo(() => {
    return products.reduce((sum, p) => {
      const price = parseFloat(p.price) || 0
      return sum + price * p.current_stock
    }, 0)
  }, [products])

  // Articles en stock bas (entre seuil critique et seuil normal)
  const articlesStockBas = useMemo(() =>
    products.filter(p => p.current_stock > 0 && p.current_stock <= ((p.stock_threshold * 15) / 100)),
    [products]
  )

  // Articles en rupture
  const articlesRupture = useMemo(() =>
    products.filter(p => p.current_stock === 0),
    [products]
  )

  // Données pour le graphique "Tendance des niveaux de stock" depuis l'historique des seuils
  const stockTrendData = useMemo(() => {
    if (seuilHistorique.length === 0) return []
    return seuilHistorique.map((entry: any) => ({
      month: entry.date ? new Date(entry.date).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }) : entry.periode || "—",
      stock: entry.total_stock ?? entry.quantite ?? entry.valeur ?? 0,
    }))
  }, [seuilHistorique])

  // Données pour le graphique "Répartition par catégorie" depuis les produits réels
  const categoryStockData = useMemo(() => {
    if (products.length === 0 || categories.length === 0) return []
    const map: Record<string, number> = {}
    products.forEach(p => {
      const catName = categories.find(c => c.id === p.category)?.name || "Sans catégorie"
      map[catName] = (map[catName] || 0) + p.current_stock
    })
    return Object.entries(map).map(([name, stock]) => ({ name, stock }))
  }, [products, categories])

  // Alertes stock bas depuis les produits réels
  const alertItems = useMemo(() => {
    return products
      .filter(p => p.current_stock <= p.stock_threshold)
      .filter(p =>
        p.name.toLowerCase().includes(alertSearchTerm.toLowerCase())
      )
      .map(p => {
        const pct = p.stock_threshold > 0 ? (p.current_stock / p.stock_threshold) * 100 : 0
        const status = p.current_stock === 0 ? "rupture" : pct <= 15 ? "critical" : "low"
        return { ...p, status }
      })
  }, [products, alertSearchTerm])

  // ── Formatage ──────────────────────────────────────────────────────────────
  const formatCustomDate = (dateString: string) => {
    if (!dateString) return "—"
    const date = new Date(dateString)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${day}/${month}/${year} ${hours}:${minutes}`
  }

  const formatCurrency = (value: number) =>
    value.toLocaleString('fr-MG', { maximumFractionDigits: 0 }) + ' Ar'

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "rupture": return <Badge variant="destructive">Rupture</Badge>
      case "critical": return <Badge variant="destructive">Critique</Badge>
      case "low": return <Badge className="bg-warning text-warning-foreground">Stock bas</Badge>
      default: return <Badge variant="secondary">Normal</Badge>
    }
  }

  // ── Export PDF ─────────────────────────────────────────────────────────────
  const Export_mouvement = async () => {
    try {
      const res = await API.post("core/pdf/PDF_mouvementStock/", {}, { responseType: 'blob' })
      const parsed = await parseAxiosBlobResponse(res, "Rapport_mouvement.pdf")
      if (parsed.files?.length) {
        setDownloadedFiles(prev => [...prev, ...parsed.files])
        downloadAll(parsed.files)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsloadingexport(false)
    }
  }

  // ── Appels API ─────────────────────────────────────────────────────────────
  const fetchCategories = async () => {
    try {
      const res = await API.get('catalogue/categories/')
      setCategories(res.data?.data || res.data?.results || res.data || [])
    } catch (error) {
      console.error('Erreur catégories:', error)
    }
  }

  const getListePDV = async () => {
    try {
      const response = await API.get('catalogue/produits-dv/')
      setPDVs(response.data?.data || response.data?.results || response.data || [])
      setIsLoadingPDVs(true)
    } catch (error) {
      console.error('Erreur produits DV:', error)
    }
  }

  // Historique des seuils de stock → sert au graphique de tendance
  const fetchSeuilHistorique = async () => {
    try {
      const response = await API.get('stock/historique-seuil-stock/')
      const data = response.data?.data || response.data?.results || response.data || []
      setSeuilHistorique(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Erreur historique seuil:', error)
      setSeuilHistorique([]) // fallback → graphique vide
    }
  }

  const fetchStockMouvements = async (type?: string) => {
    setStockMouvementsLoading(true)
    setStockMouvementsError(null)
    const params: any = {}
    try {
      if (type && type !== "tout") params.movement_type = type
      const response = await stockMouvementService.getStockMouvements(params)
      if (response.status === 'success') {
        setStockMouvements(response.data)
      } else {
        const data = response.data || response.results || response
        setStockMouvements(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error("Erreur mouvements:", error)
      setStockMouvementsError("Erreur lors de la récupération des mouvements : " + (error instanceof Error ? error.message : "Erreur inconnue"))
    } finally {
      setStockMouvementsLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
    fetchStockMouvements()
    getListePDV()
    fetchSeuilHistorique()
  }, [])

  // Filtre PDVs par searchTerm
  const filteredPDVs = useMemo(() =>
    PDVs.filter(p =>
      (p.designation || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.infos?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [PDVs, searchTerm]
  )

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analyse du Stock</h1>
          <p className="text-muted-foreground">
            Surveillez les niveaux de stock et les mouvements en temps réel
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => { refetch(); fetchStockMouvements(); getListePDV() }}>
          <RefreshCw className="h-4 w-4" />
          Actualiser
        </Button>
      </div>

      {/* ── Indicateurs clés — tous calculés depuis données réelles ── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Produits Totaux"
          value={products.length.toString()}
          icon={<Package className="h-4 w-4" />}
        />
        <MetricCard
          title="Articles en Stock Bas"
          value={articlesStockBas.length.toString()}
          description={`${products.length > 0 ? ((articlesStockBas.length / products.length) * 100).toFixed(1) : 0}% du catalogue`}
          icon={<AlertTriangle className="h-4 w-4" />}
          variant="warning"
        />
        <MetricCard
          title="Articles en Rupture"
          value={articlesRupture.length.toString()}
          description={`${products.length > 0 ? ((articlesRupture.length / products.length) * 100).toFixed(1) : 0}% du catalogue`}
          icon={<TrendingDown className="h-4 w-4" />}
          variant="destructive"
        />
        <MetricCard
          title="Valeur Totale du Stock"
          value={formatCurrency(valeurTotaleStock)}
          description="Calculé sur le stock actuel"
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

            {/* Liste des produits DV */}
            <TabsContent value="list">
              <Card>
                <CardHeader>
                  <CardTitle>Tous les produits</CardTitle>
                  <CardDescription>
                    Vue complète du catalogue avec les niveaux de stock en temps réel
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher des produits par nom..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Button variant="outline" className="gap-2" onClick={() => setShowImportModal(true)}>
                      Importer
                    </Button>
                    <Button variant="outline" className="gap-2">
                      Exporter
                    </Button>
                  </div>

                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produit</TableHead>
                          <TableHead>Capacité</TableHead>
                          <TableHead>Quantité</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Produit parent</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {!isLoadingPDVs ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                              Chargement des produits...
                            </TableCell>
                          </TableRow>
                        ) : filteredPDVs.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                              Aucun produit disponible
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredPDVs.map((produit: any) => (
                            <TableRow key={produit.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                              <TableCell>
                                <p className="font-medium">{produit.designation}</p>
                              </TableCell>
                              <TableCell>{produit.quantite} {produit.infos?.unite_mesure || ""}</TableCell>
                              <TableCell>{produit.nombre ?? "—"}</TableCell>
                              <TableCell>{formatCustomDate(produit.date_creation)}</TableCell>
                              <TableCell>{produit.infos?.name || "—"}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      {filteredPDVs.length} produit(s) affiché(s) sur {PDVs.length}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Historique des mouvements */}
            <TabsContent value="historique">
              <Card>
                <CardHeader>
                  <CardTitle>Historique des Mouvements de Stock</CardTitle>
                  <CardDescription>
                    Historique complet des entrées et sorties de stock
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {stockMouvementsLoading ? (
                    <div className="flex justify-center items-center h-32">
                      <p>Chargement...</p>
                    </div>
                  ) : stockMouvementsError ? (
                    <div className="flex justify-center items-center h-32">
                      <p className="text-red-500">{stockMouvementsError}</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-4 mb-6">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input placeholder="Rechercher dans l'historique..." className="pl-10" />
                        </div>
                        <div className="w-64">
                          <Select onValueChange={(value: string) => fetchStockMouvements(value)}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Type de mouvement" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="IN">Entrées</SelectItem>
                              <SelectItem value="OUT">Sorties</SelectItem>
                              <SelectItem value="tout">Tout</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {isloadingexport ? (
                          <p className="text-gray-600 animate-pulse">Téléchargement en cours...</p>
                        ) : (
                          <Button variant="outline" className="gap-2" onClick={() => { setIsloadingexport(true); Export_mouvement() }}>
                            Exporter
                          </Button>
                        )}
                      </div>

                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Produit</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Quantité</TableHead>
                              <TableHead>Référence</TableHead>
                              <TableHead>Raison</TableHead>
                              <TableHead>Auteur</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {stockMouvements.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                  Aucun mouvement de stock trouvé
                                </TableCell>
                              </TableRow>
                            ) : (
                              stockMouvements.map((mouvement) => (
                                <TableRow key={mouvement.id_movement}>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Calendar className="h-4 w-4 text-muted-foreground" />
                                      <span>{new Date(mouvement.timestamp).toLocaleDateString()}</span>
                                      <Clock className="h-4 w-4 text-muted-foreground ml-2" />
                                      <span>{new Date(mouvement.timestamp).toLocaleTimeString()}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="font-medium">{mouvement.product_details?.designation || "Produit inconnu"}</div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant={
                                        mouvement.movement_type === "IN" ? "success" :
                                        mouvement.movement_type === "OUT" ? "destructive" :
                                        mouvement.movement_type === "ADJUSTMENT" ? "warning" :
                                        "secondary"
                                      }
                                    >
                                      {mouvement.movement_type === "IN" ? "Entrée" :
                                       mouvement.movement_type === "OUT" ? "Sortie" :
                                       mouvement.movement_type === "ADJUSTMENT" ? "Ajustement" :
                                       mouvement.movement_type === "RETURN" ? "Retour" : "Rebut"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <span className={mouvement.movement_type === "OUT" || mouvement.movement_type === "SCRAP" ? "text-red-500" : "text-green-500"}>
                                      {mouvement.movement_type === "OUT" || mouvement.movement_type === "SCRAP" ? "-" : "+"}
                                      {mouvement.quantity}
                                    </span>
                                  </TableCell>
                                  <TableCell>{mouvement.referrence?.toLocaleString() || "—"}</TableCell>
                                  <TableCell>
                                    <span className="text-sm text-muted-foreground">{mouvement.reason || "—"}</span>
                                  </TableCell>
                                  <TableCell>
                                    <span className="text-sm text-muted-foreground">
                                      {mouvement.utilisateur_nom
                                        ? `${mouvement.utilisateur_nom.first_name} ${mouvement.utilisateur_nom.last_name}`
                                        : "—"}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* ── Onglet Niveaux de stock ── */}
        <TabsContent value="levels">
          <div className="grid gap-6 lg:grid-cols-2">

            {/* Graphique tendance — données réelles depuis historique-seuil-stock */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Tendance des Niveaux de Stock
                  {stockTrendData.length === 0 && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground italic">(aucune donnée)</span>
                  )}
                </CardTitle>
                <CardDescription>Vue historique des niveaux de stock dans le temps</CardDescription>
              </CardHeader>
              <CardContent>
                {stockTrendData.length > 0 ? (
                  <LineChart
                    data={stockTrendData}
                    xAxisKey="month"
                    lines={[{ key: "stock", name: "Niveau de Stock", color: "rgb(67, 110, 240)" }]}
                  />
                ) : (
                  <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                    Aucun historique de seuil disponible
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Répartition par catégorie — données réelles depuis products + categories */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Répartition du Stock par Catégorie
                  {categoryStockData.length === 0 && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground italic">(aucune donnée)</span>
                  )}
                </CardTitle>
                <CardDescription>Stock actuel regroupé par catégorie de produit</CardDescription>
              </CardHeader>
              <CardContent>
                {categoryStockData.length > 0 ? (
                  <BarChart
                    data={categoryStockData}
                    xAxisKey="name"
                    bars={[{ key: "stock", name: "Stock", color: "rgb(67, 110, 240)" }]}
                    height={300}
                  />
                ) : (
                  <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                    Aucune donnée de stock disponible
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tableau récapitulatif par catégorie */}
          {categoryStockData.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Détail par Catégorie</CardTitle>
                <CardDescription>Stock total par catégorie de produit</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Catégorie</TableHead>
                      <TableHead>Stock total</TableHead>
                      <TableHead>Nb produits</TableHead>
                      <TableHead>Valeur estimée</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryStockData.map((cat) => {
                      const catProducts = products.filter(p =>
                        (categories.find(c => c.id === p.category)?.name || "Sans catégorie") === cat.name
                      )
                      const valeur = catProducts.reduce((sum, p) => sum + (parseFloat(p.price) || 0) * p.current_stock, 0)
                      return (
                        <TableRow key={cat.name}>
                          <TableCell className="font-medium">{cat.name}</TableCell>
                          <TableCell>{cat.stock.toLocaleString()} unités</TableCell>
                          <TableCell>{catProducts.length} produits</TableCell>
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

        {/* ── Onglet Alertes — données réelles depuis products ── */}
        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>Alertes de Stock Bas</CardTitle>
              <CardDescription>
                Produits dont le stock actuel est inférieur ou égal au seuil défini
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative mb-4 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un produit..."
                  value={alertSearchTerm}
                  onChange={(e) => setAlertSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produit</TableHead>
                      <TableHead>Stock Actuel</TableHead>
                      <TableHead>Seuil</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Action suggérée</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alertItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          {products.length === 0 ? "Chargement..." : "Aucune alerte de stock — tout est en ordre ✓"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      alertItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>{item.current_stock} unités</TableCell>
                          <TableCell>{item.stock_threshold} unités</TableCell>
                          <TableCell>{getStatusBadge(item.status)}</TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {item.current_stock === 0
                                ? `Commander au moins ${item.stock_threshold} unités`
                                : `Commander ${item.stock_threshold - item.current_stock + Math.ceil(item.stock_threshold * 0.5)} unités`}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {alertItems.length > 0 && (
                <p className="text-sm text-muted-foreground mt-3">
                  {alertItems.length} produit(s) nécessitent une attention —{" "}
                  {alertItems.filter(i => i.status === "rupture").length} en rupture,{" "}
                  {alertItems.filter(i => i.status === "critical").length} critiques,{" "}
                  {alertItems.filter(i => i.status === "low").length} en stock bas
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal mouvement de stock */}
      {showStockMouvementForm && selectedProduct && (
        <StockMouvementForm
          onClose={() => setShowStockMouvementForm(false)}
          onSubmit={() => { setShowStockMouvementForm(false); refetch() }}
          initialData={{
            id_product: selectedProduct.id,
            product_name: selectedProduct.name,
            quantity: 0,
            movement_type: 'IN',
            reason: '',
            notes: ''
          }}
        />
      )}

      {/* Modal import */}
      {showImportModal && (
        <ImportModalGenerer
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImport={(data: any) => {
            console.log('Données importées:', data)
            setShowImportModal(false)
          }}
        />
      )}
    </div>
  )
}