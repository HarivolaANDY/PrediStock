import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Upload, Download, Database, FileText, AlertCircle, CheckCircle, Loader2 } from "lucide-react"
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
import { ImportDataModal } from "@/components/ImportDataModal"

import { useEffect } from 'react'
import { RefreshCw } from 'lucide-react'

const importHistory = [
  { id: "1", file: "ventes_jan.csv", status: "completed", date: "2024-01-15", records: "15,230" },
  { id: "2", file: "maj_inventaire.xlsx", status: "processing", date: "2024-01-15", records: "3,450" },
  { id: "3", file: "retours_q4.csv", status: "failed", date: "2024-01-14", records: "890" },
  { id: "4", file: "catalogue_produits.json", status: "completed", date: "2024-01-14", records: "2,100" }
]

type DataSource = {
  id: number,
  name: string,
  file
}

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
  const [uploadProgress, setUploadProgress] = useState(0)
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

  const fetchDataSources = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:8000/api/data-import/', {
        headers: {
          'Authorization': `Token ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des données')
      }

      const data = await response.json()
      console.log('Response data:', data) // Pour déboguer
      const formattedData = data.results.map((item: DataImport) => ({
        ...item,
        sourceName: getSourceDescription(item.target_table)
      }))
      setDataSources(formattedData)
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDataSources()
  }, [])

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

  const handleImportData = () => {
    setShowImportDataModal(true)
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
            Importez, exportez et gérez vos sources de données d'inventaire
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Exporter les données
          </Button>
          <Button onClick={handleImportData} className="text-white bg-bouton hover:bg-bouton-hover" variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Importer des données
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
                <Button className="w-full justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  Exporter l'inventaire actuel
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Exporter l'historique des ventes
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Exporter les données de prévision
                </Button>
                <Button className="w-full justify-start" variant="outline">
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

      {showImportDataModal && (
        <ImportDataModal
          onClose={() => setShowImportDataModal(false)}
          onImport={async (config) => {
            console.log("Importation avec la config :", config)
            return new Promise((resolve) => setTimeout(resolve, 2000))
          }}
        />
      )}
    </div>
  )
}