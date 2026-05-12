import { useState, useEffect } from "react"
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal"
import { FileText, Download, BarChart3, TrendingUp, Trash2 } from "lucide-react"
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
import { ReportsDetails } from "@/components/ReportsDetails"
import  API  from "@/services/axios"
import { parseAxiosBlobResponse, downloadAll, type AxiosResponseWithBlob } from "@/utils/blobUtils";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown } from "lucide-react"


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
  file?: string
}

const reportTemplates = [
  {
    id: "inventory-summary",
    name: "Rapport de synthèse des stocks",
    description: "Vue d'ensemble complète des niveaux et valeurs actuels du stock",
    category: "Stocks",
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
    category: "Stocks",
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

const INITIAL_GENERATED_REPORTS: Report[] = []

export default function Reports() {
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [selectedTemplate, _setSelectedTemplate] = useState<typeof reportTemplates[0] | null>(null)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [reportsList, setReportsList] = useState<Report[]>(INITIAL_GENERATED_REPORTS)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [reportToDelete, setReportToDelete] = useState<Report | null>(null)
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    fetchReports()
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const res = await API.get("catalogue/products/stats/")
      const data = res.data?.data || res.data
      setStats(data)
    } catch (err) {
      console.error("Erreur lors du chargement des stats:", err)
    }
  }

  const reportsTotalSize = reportsList.reduce((acc: number, report: Report) => {
    if (!report.size) return acc
    const numericPart = parseFloat(report.size)
    if (isNaN(numericPart)) return acc
    const isMB = report.size.toLowerCase().includes("mb")
    const isGB = report.size.toLowerCase().includes("gb")
    // Convert everything to KB for summing
    let sizeInKB = numericPart
    if (isMB) sizeInKB = numericPart * 1024
    if (isGB) sizeInKB = numericPart * 1024 * 1024
    return acc + sizeInKB
  }, 0)

  const formatSize = (kb: number) => {
    if (kb >= 1024 * 1024) return `${(kb / (1024 * 1024)).toFixed(2)} GB`
    if (kb >= 1024) return `${(kb / 1024).toFixed(2)} MB`
    return `${kb.toFixed(2)} KB`
  }

  const fetchReports = async () => {
    try {
      const res = await API.get("core/generated-reports/")
      // Prise en charge du format StandardResponse { data: [...] } ou raw DRF [...]
      const data = res.data?.data || res.data
      if (Array.isArray(data)) {
        setReportsList(data)
      }
    } catch (err) {
      console.error("Erreur lors du chargement des rapports:", err)
    }
  }


  const Telecharger_pdf = async(details: { titre: string; table?: string; [key: string]: unknown }, format: 'pdf' | 'csv' | 'excel' = 'pdf') =>{
    try {
      const res = (await API.post("core/pdf/dynamic/", { ...details, format }, { responseType: 'blob' })) as unknown as AxiosResponseWithBlob;
      const filename = format === 'csv' ? details.titre.replace('.pdf', '.csv') : details.titre;
      const parsed = await parseAxiosBlobResponse(res, filename);

      if (parsed.files && parsed.files.length) {
        downloadAll(parsed.files)
      }
      
      // Rafraîchir la liste depuis le serveur car le rapport a été enregistré
      fetchReports()

      if (parsed.json) console.log(parsed.json);
    } catch (err) {
      console.log(err);
    }
  }

  const getStatusBadge = (status: string | undefined) => {
    switch (status) {
      case "Terminé":
        return <Badge className="bg-success text-success-foreground">Terminé</Badge>
      case "En cours":
        return <Badge className="bg-warning text-warning-foreground">En cours</Badge>
      case "échec":
        return <Badge variant="destructive">Échec</Badge>
      default:
        return <Badge variant="outline">Inconnu</Badge>
    }
  }

  const getFormatBadge = (format: string | undefined) => {
    const colors = {
      PDF: "bg-red-100 text-red-800",
      Excel: "bg-green-100 text-green-800", 
      CSV: "bg-blue-100 text-blue-800"
    }
    return <Badge variant="outline" className={colors[format as keyof typeof colors] || "bg-gray-100"}>
      {format}
    </Badge>
  }


  const handleViewDetails = (report: Report) =>{
    setSelectedReport(report)
    setIsDetailsOpen(true)
  }

  const handleDeleteReport = (report: Report) => {
    setReportToDelete(report)
    setIsDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!reportToDelete) return
    try {
      await API.delete(`core/generated-reports/${reportToDelete.id}/`)
      setReportsList(prev => prev.filter(r => r.id !== reportToDelete.id))
      setIsDeleteModalOpen(false)
      setReportToDelete(null)
    } catch (err) {
      console.error("Erreur lors de la suppression:", err)
    }
  }

  const handleDownloadHistoryReport = (report: Report) => {
    if (report.file) {
      // Si le lien est relatif, on ajoute le domaine de base
      const url = report.file.startsWith('http') 
        ? report.file 
        : `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${report.file}`;
      window.open(url, '_blank');
    } else {
      console.warn("Fichier non disponible pour ce rapport.");
    }
  }

  const filteredTemplates = selectedCategory === "all" 
    ? reportTemplates
    : reportTemplates.filter(template => template.category.toLowerCase() === selectedCategory)

  const handleGenerateSubmit = async (data: any) => {
    try {
      console.log('Génération du rapport:', data)
      let table = "Produits";
      let specific = "";
      
      switch(data.type) {
        case 'inventory':
          table = 'MouvementStock';
          break;
        case 'movements':
          table = 'MouvementStock';
          break;
        case 'forecast':
          table = 'Produits'; // Fallback
          break;
        case 'alerts':
          table = 'MouvementStock';
          specific = 'OUT';
          break;
        default:
          table = 'Produits';
      }

      await Telecharger_pdf({
        table,
        specific,
        titre: `Rapport_${data.type}_${Date.now()}.pdf`,
      }, data.format);

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
          value={reportsList.length.toString()}
          description="Total des rapports dans l'historique"
          icon={<FileText className="h-4 w-4" />}
        />
        <MetricCard
          title="Taille des exports"
          value={formatSize(reportsTotalSize)}
          description="Espace occupé par les rapports"
          icon={<BarChart3 className="h-4 w-4" />}
          variant="success"
        />
        <MetricCard
          title="Produits Actifs"
          value={stats?.total_produits?.toString() || "--"}
          description="Total des articles suivis"
          icon={<BarChart3 className="h-4 w-4" />}
          variant="prediction"
        />
        <MetricCard
          title="Valeur Stock"
          value={stats?.total_stock_value ? `${stats.total_stock_value.toLocaleString()} Ar` : "--"}
          description="Valeur monétaire actuelle"
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>

      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="templates">Modèles de rapports</TabsTrigger>
          <TabsTrigger value="generated">Rapports générés</TabsTrigger>
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
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                className="text-white bg-bouton hover:bg-bouton-hover" 
                                variant="outline" 
                                size="sm"
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                Générer
                                <ChevronDown className="h-4 w-4 ml-2" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => Telecharger_pdf(template.details, 'pdf')}>
                                <FileText className="h-4 w-4 mr-2" />
                                Format PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => Telecharger_pdf(template.details, 'csv')}>
                                <FileText className="h-4 w-4 mr-2" />
                                Format CSV
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
                    {reportsList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                          Aucun rapport généré pour le moment
                        </TableCell>
                      </TableRow>
                    ) : (
                      reportsList.map((report, index) => (
                        <TableRow key={report.id}>
                          <TableCell className="font-medium">{reportsList.length - index}</TableCell>
                          <TableCell>{report.name}</TableCell>
                          <TableCell>{report.type}</TableCell>
                          <TableCell>{report.created_at}</TableCell>
                          <TableCell>{report.size}</TableCell>
                          <TableCell>{getFormatBadge(report.format)}</TableCell>
                          <TableCell>{getStatusBadge(report.status)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  onClick={() => handleDownloadHistoryReport(report)}
                                  disabled={!report.file || report.status === "En cours"}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleViewDetails(report)}>
                                Voir
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDeleteReport(report)}
                              >
                                <Trash2 className="h-4 w-4" />
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
      </Tabs>

      <DeleteConfirmationModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        productName={reportToDelete?.name || "ce rapport"}
      />

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