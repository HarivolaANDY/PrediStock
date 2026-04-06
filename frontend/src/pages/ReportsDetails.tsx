import { useNavigate, useParams } from "react-router-dom"
import { Edit, Eye, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ProductForm } from "@/components/ProductForm"
import { useState } from "react"
import { useSettings } from "@/hooks/useSettings"

// Type Report
type Report = {
  id: string
  title: string
  type?: string
  generatedDate?: string
  format?: string
  size: number
  state?: string
  is_active: boolean
  created_at: string
}

// Mock data
const reports: Report[] = [
  {
    id: "1",
    title: "Rapport quotidien",
    type: "Mouvements de stock",
    generatedDate: "2025-08-20",
    format: "PDF",
    size: 10,
    state: "Terminé",
    is_active: true,
    created_at: "2024-06-01"
  },
  {
    id: "2",
    title: "Rapport hebdomadaire",
    type: "Mouvements de stock",
    generatedDate: "2025-08-20",
    format: "Excel",
    size: 15,
    state: "Terminé",
    is_active: true,
    created_at: "2024-06-01"
  },
]

export default function ReportsDetails() {
  const { settings } = useSettings()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [showProductForm, setShowProductForm] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [reportToDelete, setReportToDelete] = useState<Report | null>(null)

  const report = reports.find(s => s.id === id)

  const getStatusBadge = (is_active: boolean) => {
    return is_active
      ? <Badge className="bg-green-500 text-white">Actif</Badge>
      : <Badge className="bg-red-500 text-white">Inactif</Badge>
  }

  const handleEditSupplier = (_report: Report) => {
    setShowProductForm(true)
  }

  const handleCloseForm = () => {
    setShowProductForm(false)
  }

  const handleDeleteClick = (report: Report) => {
    setReportToDelete(report)
    setShowDeleteModal(true)
  }

  const handleConfirmDelete = () => {
    console.log("Fournisseur supprimé :", reportToDelete?.title)
    setShowDeleteModal(false)
    setReportToDelete(null)
  }

  const handleViewDetails = (report: Report) => {
    console.log("Viewing report details:", report)
    // Could navigate to a dedicated view page or open a modal
  }

  if (!report) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold">Rapport introuvable</h1>
        <Button className="mt-4" onClick={() => navigate("/reports")}>Retour à la liste</Button>
      </div>
    )
  }

  return (
    <div className={`container mx-auto p-6 space-y-6 ${settings.darkMode ? 'bg-background' : 'bg-white'}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Détails du Rapport</h1>
          <p className="text-gray-500">Informations sur le rapport généré</p>
        </div>
      </div>

      {/* Supplier Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>{report.title}</CardTitle>
          <CardDescription>Créé le {report.created_at}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <p className="text-sm text-gray-500 mb-1 font-bold">Titre</p>
              <p className={`font-medium ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>{report.title ?? "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1 font-bold">Type</p>
              <p className={`font-medium ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>{report.type ?? "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1 font-bold">Taille</p>
              <p className={`font-medium ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>{report.size ?? "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1 font-bold">Date</p>
              <p className={`font-medium ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>{report.generatedDate}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1 font-bold">Format du rapport</p>
              <p className={`font-medium ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>{report.format ?? "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1 font-bold">Statut</p>
              {getStatusBadge(report.is_active)}
            </div>
          </div>
          <div className="flex items-center gap-3 mt-8">
            <div 
              className="cursor-pointer text-blue-600 hover:text-blue-800" 
              title="Voir la fiche"
              onClick={() => handleViewDetails(report)}
            >
              <Eye className="h-4 w-4" />
            </div>
            <div 
              className="cursor-pointer text-blue-600 hover:text-blue-800" 
              title="Modifier le rapport"
              onClick={() => handleEditSupplier(report)}
            >
              <Edit className="h-4 w-4" />
            </div>
            <div 
              className="cursor-pointer text-red-600 hover:text-red-800" 
              title="Supprimer le rapport"
              onClick={() => handleDeleteClick(report)}
            >
              <Trash2 className="h-4 w-4" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Supplier Form Modal */}
      {showProductForm && (
        <ProductForm
          onClose={handleCloseForm}
          onSubmit={() => {}}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-lg shadow-lg p-6 max-w-sm ${settings.darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className={`text-lg font-bold mb-4 ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>
              Confirmer la suppression
            </h2>
            <p className={`mb-6 ${settings.darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Êtes-vous sûr de vouloir supprimer le rapport "<span className="font-semibold">{reportToDelete?.title}</span>" ?
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false)
                  setReportToDelete(null)
                }}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
              >
                Supprimer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
