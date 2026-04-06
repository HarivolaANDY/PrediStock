import { useState } from "react"
import { FileText, Download, Calendar, BarChart3, TrendingUp } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
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
import { GenerateReportModal } from "@/components/GenerateReportModal"
import { PlaningReportModal } from "@/components/PlaningReportModal"
import { ReportsDetails } from "@/components/ReportsDetails"
import  API  from "@/services/axios"
import { downloadPdf } from "@/utils/blobUtils"
import { parseAxiosBlobResponse, downloadAll, type AxiosResponseWithBlob } from "@/utils/blobUtils";


// Type Report
type Report = {
  id: string
  name: string
  type?: string
  category?: string
  frequency?: string
  created_at?: string
  status?: string
  description?: string
  format?: string
  size?: string
  details?: Record<string, unknown>
}

const reportTemplates = [
  {
    id: "inventory-summary",
    name: "Rapport de synthèse des stocks",
    description: "Vue d'ensemble complète des niveaux et valeurs actuels du stock",
    category: "Stock",
    frequency: "à chaque Entré/Sortie",
    lastGenerated: "2024-01-15 14:30", 
    details:{
      "table":"MouvementStock",
      "year":"2025",
      "month":"",
      "day":"",
      "specific":"",
      "titre":"Liste_mouvements.pdf"
    }
  },
  {
    id: "detailed-entries-summary",
    name: "Rapport des entrés des stocks",
    description: "Vue d'ensemble complète des entrés dans le stock",
    category: "Stock",
    frequency: "à chaque Entré",
    lastGenerated: "2024-01-15 14:30", 
    details:{
      "table":"MouvementStock",
      "year":"2025",
      "month":"",
      "day":"",
      "specific":"IN",
      "titre":"Liste_mouvements.pdf"
    }
  },
  {
    id: "detailed-out-summary",
    name: "Rapport des sorties des stocks",
    description: "Vue d'ensemble complète des sorties dans le stock",
    category: "Stocks",
    frequency: "à chaque Sorties",
    lastGenerated: "2024-01-15 14:30", 
    details:{
      "table":"MouvementStock",
      "year":"2025",
      "month":"",
      "day":"",
      "specific":"OUT",
      "titre":"Liste_mouvements.pdf"
    }
  },
  {
    id: "forecast-analysis",
    name: "Liste des Utilisateurs", 
    description: "Enregistrements des USERS",
    category: "Users",
    frequency: "Annuel",
    lastGenerated: "2024-01-15 09:00",
    details:{
      "table":"Utilisateurs",
      "year":"2025",
      "month":"",
      "day":"",
      "specific":"",
      "titre":"Liste_users.pdf"
    }
  },
  {
    id: "Inventory-analysis",
    name: "Inventaire", 
    description: "Obtenir la liste des produits à inventorier",
    category: "Inventory",
    frequency: "Annuel",
    lastGenerated: "2024-01-15 09:00",
    details:{
      "table":"Inventaire",
      "year":"2025",
      "month":"",
      "day":"",
      "specific":"",
      "titre":"Inventaire"+Date.now()+".pdf"
    }
  },
  {
    id: "Inventoryin-analysis",
    name: "Les produits", 
    description: "Obtenir la liste des produits",
    category: "Stocks",
    frequency: "Annuel",
    lastGenerated: "2024-01-15 09:00",
    details:{
      "table":"Produits",
      "year":"2025",
      "month":"",
      "day":"",
      "specific":"",
      "titre":"produits"+Date.now()+".pdf"
    }
  },
]

const generatedReports = [
  {
    id: "1",
    name: "Rapport hebdomadaire des stocks",
    type: "Synthèse des stocks",
    generatedDate: "2024-01-15",
    size: "2.1 MB",
    format: "PDF",
    status: "terminé"
  },
  {
    id: "2", 
    name: "Rapport mensuel des prévisions",
    type: "Analyse des prévisions",
    generatedDate: "2024-01-14",
    size: "1.8 MB", 
    format: "Excel",
    status: "terminé"
  },
  {
    id: "3",
    name: "Rapport quotidien du stock",
    type: "Mouvements de stock",
    generatedDate: "2024-01-15",
    size: "950 KB",
    format: "PDF",
    status: "en cours"
  }
]

export default function Reports() {
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<typeof reportTemplates[0] | null>(null)
  const [showAddPlaning, setShowAddPlaning] = useState(false)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  const lancerRapport = async (url = "/pdf/download_pdf/", method: 'get' | 'post' = 'get', payload?: Record<string, unknown>) => {
    try {
      await downloadPdf(url, method, payload);
    } catch (err) {
      console.error("Erreur téléchargement rapport :", err);
    }
  }

  const Telecharger_pdf = async(details: { titre: string; [key: string]: unknown }) =>{
    try {
      const res = (await API.post("pdf/Dynamic_PDF/", details, { responseType: 'blob' })) as unknown as AxiosResponseWithBlob;
      const parsed = await parseAxiosBlobResponse(res, details.titre);

      if (parsed.files && parsed.files.length) {
        downloadAll(parsed.files)
      }
      if (parsed.json) console.log(parsed.json);
    } catch (err) {
      console.log(err);
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "terminé":
        return <Badge className="bg-success text-success-foreground">Terminé</Badge>
      case "en cours":
        return <Badge className="bg-warning text-warning-foreground">En cours</Badge>
      case "échec":
        return <Badge variant="destructive">Échec</Badge>
      default:
        return <Badge variant="outline">Inconnu</Badge>
    }
  }

  const getFormatBadge = (format: string) => {
    const colors = {
      PDF: "bg-red-100 text-red-800",
      Excel: "bg-green-100 text-green-800", 
      CSV: "bg-blue-100 text-blue-800"
    }
    return <Badge variant="outline" className={colors[format as keyof typeof colors]}>
      {format}
    </Badge>
  }

  const handleAddPlaning = () => {
    setShowAddPlaning(true)
  }

  const handleViewDetails = (report: Report) =>{
    setSelectedReport(report)
    setIsDetailsOpen(true)
  }

  const filteredTemplates = selectedCategory === "all" 
    ? reportTemplates
    : reportTemplates.filter(template => template.category.toLowerCase() === selectedCategory)

  const handleGenerateSubmit = async (data: Record<string, unknown>) => {
    try {
      console.log('Génération du rapport:', data)
      setShowGenerateModal(false)
    } catch (error) {
      console.error('Erreur lors de la génération:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rapports & Analyses</h1>
          <p className="text-muted-foreground">
            Générez et gérez des rapports métier complets
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleAddPlaning}>
            <Calendar className="h-4 w-4 mr-2" />
            Planifier un rapport
          </Button>
          <Button 
            className="text-white bg-bouton hover:bg-bouton-hover" 
            variant="outline"
            onClick={() => setShowGenerateModal(true)}
          >
            <FileText className="h-4 w-4 mr-2" />
            Générer un rapport
          </Button>
        </div>
      </div>

      {/* Cartes de synthèse */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Rapports générés"
          value="127"
          trend={{ value: 8.5, label: "ce mois" }}
          icon={<FileText className="h-4 w-4" />}
        />
        <MetricCard
          title="Rapports planifiés"
          value="12"
          trend={{ value: 2, label: "plannings actifs" }}
          icon={<Calendar className="h-4 w-4" />}
          variant="success"
        />
        <MetricCard
          title="Informations issues des données"
          value="45"
          trend={{ value: 12, label: "nouvelles analyses" }}
          icon={<BarChart3 className="h-4 w-4" />}
          variant="prediction"
        />
        <MetricCard
          title="Taille des exports"
          value="24.8 GB"
          trend={{ value: 5.2, label: "ce trimestre" }}
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>

      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="templates">Modèles de rapports</TabsTrigger>
          <TabsTrigger value="generated">Rapports générés</TabsTrigger>
          <TabsTrigger value="scheduled">Rapports planifiés</TabsTrigger>
        </TabsList>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Modèles de rapports</CardTitle>
                  <CardDescription>
                    Modèles préconfigurés pour les besoins métiers courants
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les catégories</SelectItem>
                      <SelectItem value="inventory">Inventaire</SelectItem>
                      <SelectItem value="users">Utilisateurs</SelectItem>
                      <SelectItem value="stocks">Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {filteredTemplates.map((template) => (
                  <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          <CardDescription className="mt-1">
                            {template.description}
                          </CardDescription>
                        </div>
                        <Badge variant="outline">{template.category}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="text-sm text-muted-foreground">
                            Fréquence : {template.frequency}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Dernier : {template.lastGenerated}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {/* <Button size="sm" variant="outline">
                            <Calendar className="h-4 w-4" />
                          </Button> */}
                          <Button 
                            className="text-white bg-bouton hover:bg-bouton-hover" 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              Telecharger_pdf(template.details)
                            }}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Générer
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="generated">
          <Card>
            <CardHeader>
              <CardTitle>Rapports générés</CardTitle>
              <CardDescription>
                Rapports récemment générés disponibles au téléchargement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID Rapport</TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Généré le</TableHead>
                      <TableHead>Taille</TableHead>
                      <TableHead>Format</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {generatedReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">{report.id}</TableCell>
                        <TableCell>{report.name}</TableCell>
                        <TableCell>{report.type}</TableCell>
                        <TableCell>{report.generatedDate}</TableCell>
                        <TableCell>{report.size}</TableCell>
                        <TableCell>{getFormatBadge(report.format)}</TableCell>
                        <TableCell>{getStatusBadge(report.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {report.status === "terminé" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => lancerRapport("/pdf/download_pdf/", "get", { report_id: report.id })}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                            <Button size="sm" variant="outline" onClick={() => handleViewDetails(report)}>
                              Voir
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduled">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Plannings actifs</CardTitle>
                <CardDescription>
                  Générations automatiques de rapports actuellement planifiées
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Synthèse quotidienne des stocks</h4>
                    <p className="text-sm text-muted-foreground">Tous les jours à 6:00</p>
                  </div>
                  <Badge className="bg-success text-success-foreground">Actif</Badge>
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Rapport hebdomadaire de prévisions</h4>
                    <p className="text-sm text-muted-foreground">Tous les lundis à 8:00</p>
                  </div>
                  <Badge className="bg-success text-success-foreground">Actif</Badge>
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Analyses mensuelles</h4>
                    <p className="text-sm text-muted-foreground">1er de chaque mois à 9:00</p>
                  </div>
                  <Badge variant="secondary">En pause</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Créer un planning</CardTitle>
                <CardDescription>
                  Configurez une génération automatique de rapport
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Modèle de rapport</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un modèle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inventory">Synthèse des stocks</SelectItem>
                      <SelectItem value="forecast">Analyse des prévisions</SelectItem>
                      <SelectItem value="stock">Mouvements de stock</SelectItem>
                      <SelectItem value="alerts">Synthèse des alertes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Fréquence</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner la fréquence" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Quotidien</SelectItem>
                      <SelectItem value="weekly">Hebdomadaire</SelectItem>
                      <SelectItem value="monthly">Mensuel</SelectItem>
                      <SelectItem value="quarterly">Trimestriel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Format</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner le format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="excel">Excel</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button className="w-full">
                  <Calendar className="h-4 w-4 mr-2" />
                  Créer le planning
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {showGenerateModal && (
        <GenerateReportModal
          onClose={() => setShowGenerateModal(false)}
          onGenerate={handleGenerateSubmit}
          initialData={selectedTemplate ? {
            type: selectedTemplate.id,
            name: selectedTemplate.name,
            category: selectedTemplate.category,
          } : undefined}
        />
      )}

      {showAddPlaning && (
        <PlaningReportModal
          onClose={() => setShowAddPlaning(false)}
        />
      )}

      {/* Supplier Details Form Modal */}
      {ReportsDetails && isDetailsOpen && selectedReport && (
        <ReportsDetails
          report={selectedReport}
          onClose={() => setIsDetailsOpen(false)}
          isOpen={isDetailsOpen}
        />
      )}
    </div>
  )
}