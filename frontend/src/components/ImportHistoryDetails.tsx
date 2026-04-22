import { useNavigate, useParams } from "react-router-dom"
import { Edit, Eye, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ProductForm, type ProductFormData } from "@/components/ProductForm"
import { useState } from "react"
import { useSettings } from "@/hooks/useSettings"

// Type Report
type Data = {
  id: string
  file: string
  status?: string
  date?: string
  records: number
  is_active: boolean
  created_at: string
}

// Mock data
const datas: Data[] = [
  {
    id: "1",
    file: "sales_data_jan.csv",
    status: "completed",
    date: "2025-08-20",
    records: 142,
    is_active: true,
    created_at: "2024-06-01"
  },
  {
    id: "2",
    file: "product_catalog.json",
    status: "failed",
    date: "2025-08-20",
    records: 51,
    is_active: true,
    created_at: "2024-06-11"
  }
]

export default function ReportsDetails() {
  const { settings } = useSettings()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [showProductForm, setShowProductForm] = useState(false)
  const [editingReport, setEditingReport] = useState<Data | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [reportToDelete, setReportToDelete] = useState<Data | null>(null)

  const data = datas.find(s => s.id === id)

  const getStatusBadge = (is_active: boolean) => {
    return is_active
      ? <Badge className="bg-green-500 text-white">Actif</Badge>
      : <Badge className="bg-red-500 text-white">Inactif</Badge>
  }

  const handleEditSupplier = (data: Data) => {
    setEditingReport(data)
    setShowProductForm(true)
  }

  const handleCloseForm = () => {
    setShowProductForm(false)
    setEditingReport(null)
  }

  const handleDeleteClick = (data: Data) => {
    setReportToDelete(data)
    setShowDeleteModal(true)
  }

  const handleConfirmDelete = () => {
    console.log("Données supprimée :", reportToDelete?.file)
    setShowDeleteModal(false)
    setReportToDelete(null)
  }

  if (!data) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold">Données introuvable</h1>
        <Button className="mt-4" onClick={() => navigate("/data")}>Retour à la liste</Button>
      </div>
    )
  }

  return (
    <div className={`container mx-auto p-6 space-y-6 ${settings.darkMode ? 'bg-background' : 'bg-white'}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Détails des Données</h1>
          <p className="text-gray-500">Informations sur les données importées</p>
        </div>
      </div>

      {/* Supplier Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>{data.file}</CardTitle>
          <CardDescription>Importée le {data.created_at}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <p className="text-sm text-gray-500 mb-1 font-bold">Titre</p>
              <p className={`font-medium ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>{data.file ?? "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1 font-bold">Statut</p>
              {getStatusBadge(data.is_active)}
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1 font-bold">Date</p>
              <p className={`font-medium ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>{data.date}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1 font-bold">Taille</p>
              <p className={`font-medium ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>{data.records.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-8">
            <div 
              className="cursor-pointer text-blue-600 hover:text-blue-800" 
              title="Voir la fiche"
              onClick={() => navigate("/data")}
            >
              <Eye className="h-4 w-4" />
            </div>
            <div 
              className="cursor-pointer text-blue-600 hover:text-blue-800" 
              title="Modifier"
              onClick={() => handleEditSupplier(data)}
            >
              <Edit className="h-4 w-4" />
            </div>
            <div 
              className="cursor-pointer text-red-600 hover:text-red-800" 
              title="Supprimer"
              onClick={() => handleDeleteClick(data)}
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
          initialData={(editingReport ?? data) as unknown as Partial<ProductFormData>}
        />
      )}
    </div>
  )
}