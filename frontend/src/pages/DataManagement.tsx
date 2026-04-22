import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { Upload, Download, Database, FileText, AlertCircle, CheckCircle, Loader2, RefreshCw } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader,
  TableRow 
} from "@/components/ui/table"
import { MetricCard } from "@/components/MetricCard"
import recommendationService from "@/services/recommendationService"
import { toast } from "@/components/ui/use-toast"


interface DataImport {
  id: number;
  name: string;
  status: string;
  target_table: string;
  file_type: string;
  file_size: number;
  update_table: boolean;
  uploaded_at: string;
}

export default function GestionDonnees() {
  const navigate = useNavigate()
  const [showImportDataModal, setShowImportDataModal] = useState(false)
  const [dataSources, setDataSources] = useState<DataImport[]>([])
  const [loading, setLoading] = useState(true)

  // Filtrer les données selon leur statut
  const pendingSources = dataSources.filter(source => source.status === "PENDING")
  const historySources = dataSources.filter(source => ["DONE", "ERR"].includes(source.status))

  const getTotalDataSize = () => {
    const totalBytes = dataSources.reduce((acc, source) => acc + source.file_size, 0);
    const sizeInMB = (totalBytes / (1024 * 1024)).toFixed(2);
    return `${sizeInMB} MB`;
  }

  const getSourceDescription = (target_table: string): string => {
    const descriptions: { [key: string]: string } = {
      'supplier': 'Données des fournisseurs',
      'product': 'Catalogue de produits',
      'category': 'Catégories de produits',
      'generer': 'Données de génération de stock',
    }
    return descriptions[target_table] || `Données de ${target_table}`
  }

  const fetchDataSources = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:8000/api/forecasting/data-import/', {
        headers: {
          'Authorization': `Token ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des données')
      }

      const data = await response.json()
      console.log('Response data:', data)
      const items = data.data ?? data.results ?? data ?? []
      const formattedData = items.map((item: DataImport) => ({
        ...item,
        sourceName: getSourceDescription(item.target_table)
      }))
      setDataSources(formattedData)
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDataSources()
  }, [fetchDataSources])

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "connected":
      case "completed":
        return <Badge className="bg-success text-success-foreground">Connecté</Badge>
      case "err":
      case "failed":
        return <Badge variant="destructive">Erreur</Badge>
      case "syncing":
      case "processing":
        return <Badge className="bg-warning text-warning-foreground">Synchronisation</Badge>
      case "pending":
        return <Badge variant="secondary">En attente</Badge>
      case "done":
        return <Badge className="bg-success text-success-foreground">Réussi</Badge>
      default:
        return <Badge variant="outline">Inconnu</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "connected":
      case "completed":
        return <CheckCircle className="h-4 w-4 text-success" />
      case "error":
      case "failed":
        return <AlertCircle className="h-4 w-4 text-destructive" />
      case "syncing":
      case "processing":
        return <Database className="h-4 w-4 text-warning animate-pulse" />
      case "pending":
        return <RefreshCw className="h-4 w-4 text-muted-foreground" />
      default:
        return <Database className="h-4 w-4" />
    }
  }

  const handleViewDetails = (id: string) => {
    navigate(`/data/${id}`)
  }

  const exportToCSV = (data: any[], filename: string, separator: string = ";") => {
    if (data.length === 0) {
      toast({
        title: "Erreur",
        description: "Aucune donnée à exporter",
        variant: "destructive"
      })
      return
    }

    const headers = Object.keys(data[0])
    const csvRows = [
      headers.join(separator),
      ...data.map(row =>
        headers.map(header => {
          const val = row[header] === null || row[header] === undefined ? "" : row[header]
          // Échapper les guillemets et gérer les retours à la ligne
          const escaped = String(val).replace(/"/g, '""')
          return `"${escaped}"`
        }).join(separator)
      )
    ]

    const csvString = csvRows.join("\n")
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", filename)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleExportDataSources = () => {
    const exportData = dataSources.map(source => ({
      ID: source.id,
      Nom: source.name,
      Statut: source.status,
      Table: source.target_table,
      Type: source.file_type,
      Taille: `${(source.file_size / 1024).toFixed(2)} KB`,
      Date: new Date(source.uploaded_at).toLocaleString("fr-FR")
    }))
    exportToCSV(exportData, `export_sources_donnees_${new Date().toLocaleDateString("fr-FR").replace(/\//g, "-")}.csv`)
  }

  const handleExportInventory = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/catalogue/products/", {
        headers: {
          "Authorization": `Token ${localStorage.getItem("token")}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        const items = data.data ?? data.results ?? data ?? []
        const exportData = items.map((p: any) => ({
          Nom: p.name,
          SKU: p.sku,
          Prix: p.price,
          "Stock Actuel": p.current_stock,
          "Seuil Alerte": p.stock_threshold,
          Statut: p.is_active ? "Actif" : "Inactif"
        }))
        exportToCSV(exportData, `inventaire_export_${new Date().toLocaleDateString("fr-FR").replace(/\//g, "-")}.csv`)
      } else {
        toast({ title: "Erreur", description: "Impossible de récupérer l'inventaire", variant: "destructive" })
      }
    } catch (error) {
      console.error("Erreur export inventaire:", error)
      toast({ title: "Erreur", description: "Une erreur est survenue lors de l'export de l'inventaire", variant: "destructive" })
    }
  }

  const handleExportSales = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/catalogue/revenues/mensuel/", {
        headers: {
          "Authorization": `Token ${localStorage.getItem("token")}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        const items = data.data ?? data.results ?? data ?? []
        exportToCSV(items, `historique_ventes_${new Date().toLocaleDateString("fr-FR").replace(/\//g, "-")}.csv`)
      } else {
        toast({ title: "Erreur", description: "Impossible de récupérer l'historique des ventes", variant: "destructive" })
      }
    } catch (error) {
      console.error("Erreur export ventes:", error)
      toast({ title: "Erreur", description: "Une erreur est survenue lors de l'export des ventes", variant: "destructive" })
    }
  }

  const handleExportMovements = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/stock/mouvements/", {
        headers: {
          "Authorization": `Token ${localStorage.getItem("token")}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        const items = data.data ?? data.results ?? data ?? []
        exportToCSV(items, `mouvements_stock_${new Date().toLocaleDateString("fr-FR").replace(/\//g, "-")}.csv`)
      } else {
        toast({ title: "Erreur", description: "Impossible de récupérer les mouvements de stock", variant: "destructive" })
      }
    } catch (error) {
      console.error("Erreur export mouvements:", error)
      toast({ title: "Erreur", description: "Une erreur est survenue lors de l'export", variant: "destructive" })
    }
  }

  const handleExportForecasts = async () => {
    try {
      const preds = await recommendationService.getPredictions()
      if (preds && preds.length > 0) {
        const exportData = preds.map(p => ({
          Produit: p.product_name || `ID: ${p.product}`,
          Date: new Date(p.date_prediction).toLocaleDateString("fr-FR"),
          "Stock Prévu": p.stock_prevu?.toFixed(2),
          "Import Prévu": p.import_qty?.toFixed(2),
          "Export Prévu": p.export_qty?.toFixed(2),
          Rupture: p.rupture ? "OUI" : "NON",
          Modèle: p.modele_utilise
        }))
        exportToCSV(exportData, `previsions_export_${new Date().toLocaleDateString("fr-FR").replace(/\//g, "-")}.csv`)
      } else {
        toast({ title: "Erreur", description: "Aucune prévision à exporter", variant: "destructive" })
      }
    } catch (error) {
      console.error("Erreur export prévisions:", error)
      toast({ title: "Erreur", description: "Une erreur est survenue lors de l'export des prévisions", variant: "destructive" })
    }
  }

  const handleSync = async (sourceId: number) => {
    try {
      // Mettre à jour le statut en "syncing"
      setDataSources(prev =>
        prev.map(src =>
          src.id === sourceId ? { ...src, status: "processing" } : src
        )
      )

      // Appeler l'API pour lancer l'ETL
      const response = await fetch('http://localhost:8000/api/execution-pipeline/run-etl/', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data_id: sourceId,
          update: 1
        })
      })

      if (!response.ok) {
        throw new Error('Erreur lors du lancement de l\'ETL')
      }

      const result = await response.json()
      console.log('ETL lancé:', result)

      // Rafraîchir les données
      fetchDataSources()
    } catch (error) {
      console.error('Erreur:', error)
      // En cas d'erreur, mettre le statut en erreur
      setDataSources(prev =>
        prev.map(src =>
          src.id === sourceId ? { ...src, status: "failed" } : src
        )
      )
    }
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestion des données</h1>
          <p className="text-muted-foreground">
            Exportez et gérez vos sources de données d'inventaire
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportDataSources} variant="outline" className="text-white bg-bouton hover:bg-bouton-hover border-none">
            <Upload className="h-4 w-4 mr-2" />
            Exporter les données
          </Button>
        </div>
      </div>

      {/* Cartes de synthèse */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total d'enregistrements"
          value={getTotalDataSize()}
          trend={{ value: dataSources.length, label: "fichiers importés" }}
          icon={<Database className="h-4 w-4" />}
        />
        <MetricCard
          title="Sources de données"
          value={dataSources.length.toString()}
          trend={{ value: 0, label: "sources connectées" }}
          icon={<FileText className="h-4 w-4" />}
          variant="success"
        />
        <MetricCard
          title="Dernière synchro"
          value="5 min"
          description="il y a"
          icon={<CheckCircle className="h-4 w-4" />}
          variant="success"
        />
        <MetricCard
          title="Imports échoués"
          value="3"
          trend={{ value: -2, label: "vs hier" }}
          icon={<AlertCircle className="h-4 w-4" />}
          variant="warning"
        />
      </div>

      <Tabs defaultValue="sources" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sources">Sources de données</TabsTrigger>
          <TabsTrigger value="imports">Historique des imports</TabsTrigger>
          <TabsTrigger value="exports">Centre d'export</TabsTrigger>
        </TabsList>

        <TabsContent value="sources">
          <Card>
            <CardHeader>
              <CardTitle>Sources de données connectées</CardTitle>
              <CardDescription>
                Suivez l'état et la santé de vos sources de données connectées
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Date d'import</TableHead>
                      <TableHead>Taille du fichier</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">
                          <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                          Chargement des données...
                        </TableCell>
                      </TableRow>
                    ) : pendingSources.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          Aucune source en attente
                        </TableCell>
                      </TableRow>
                    ) : (
                      pendingSources.map((source) => (
                        <TableRow key={source.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(source.status)}
                              <span className="font-medium">{getSourceDescription(source.target_table)}</span>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(source.status)}</TableCell>
                          <TableCell>{new Date(source.uploaded_at).toLocaleString('fr-FR')}</TableCell>
                          <TableCell>{(source.file_size / 1024).toFixed(2)} KB</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleViewDetails(source.id.toString())}
                              >
                                Détails
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleSync(source.id)}
                                disabled={source.status.toLowerCase() === "processing"}
                              >
                                {source.status.toLowerCase() === "processing" ? "En cours..." : "Synchroniser"}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="imports">
          <Card>
            <CardHeader>
              <CardTitle>Historique des imports</CardTitle>
              <CardDescription>
                Suivez vos opérations d'importation de données et leur statut
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID Import</TableHead>
                      <TableHead>Nom du fichier</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Enregistrements</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">
                          <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                          Chargement des données...
                        </TableCell>
                      </TableRow>
                    ) : historySources.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          Aucun historique d'importation
                        </TableCell>
                      </TableRow>
                    ) : (
                      historySources.map((source) => (
                        <TableRow key={source.id}>
                          <TableCell className="font-medium">{source.id}</TableCell>
                          <TableCell>{source.name}</TableCell>
                          <TableCell>{getStatusBadge(source.status)}</TableCell>
                          <TableCell>{new Date(source.uploaded_at).toLocaleString('fr-FR')}</TableCell>
                          <TableCell>{(source.file_size / 1024).toFixed(2)} KB</TableCell>
                          <TableCell>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleViewDetails(source.id.toString())}
                            >
                              Voir détails
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exports">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Export rapide</CardTitle>
                <CardDescription>
                  Exportez les jeux de données les plus utilisés
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={handleExportInventory} className="w-full justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  Exporter l'inventaire actuel
                </Button>
                <Button onClick={handleExportSales} className="w-full justify-start" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Exporter l'historique des ventes
                </Button>
                <Button onClick={handleExportForecasts} className="w-full justify-start" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Exporter les données de prévision
                </Button>
                <Button onClick={handleExportMovements} className="w-full justify-start" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Exporter les mouvements de stock
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Export personnalisé</CardTitle>
                <CardDescription>
                  Configurez et planifiez vos exports de données personnalisés
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Créez des configurations d’export avec des plages de dates, filtres et formats spécifiques.
                </div>
                <Button className="w-full">
                  Créer un export personnalisé
                </Button>
                <div className="pt-4">
                  <h4 className="font-medium mb-2">Exports planifiés</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Rapport hebdomadaire d’inventaire</span>
                      <Badge variant="outline">Actif</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Résumé mensuel des ventes</span>
                      <Badge variant="outline">Actif</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

    </div>
  )
}