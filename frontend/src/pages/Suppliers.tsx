import { useState, useEffect, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { useSupplier } from "@/hooks/useSupplier"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Download, Plus } from "lucide-react"
import { SupplierForm } from "@/components/SupplierForm"
import { useToast } from "@/components/ui/use-toast"
import { Supplier, SupplierFormData } from "@/types/types"
import { SupplierAnalytics } from "@/components/suppliers/SupplierAnalytics"
import { SupplierMetrics } from "@/components/suppliers/SupplierMetrics"
import { SupplierStats, transformSupplier } from "@/components/suppliers/SupplierStats"
import { ImportSupplierForm } from "@/components/ImportSupplierForm"

export default function Suppliers() {
  const [analyticsSearch, setAnalyticsSearch] = useState("")
  const [metricsSearch, setMetricsSearch] = useState("")
  const [selectedSupplier, setSelectedSupplier] = useState<string>("all")
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null)
  const { getAllSuppliers, createSupplier, updateSupplier, isLoading } = useSupplier()
  const { toast } = useToast()
  const [showImportSupplierForm, setShowImportSupplierForm] = useState(false)

  const transformedSuppliers = useMemo(() => suppliers.map(transformSupplier), [suppliers])

  // ── Chargement centralisé ──
  const loadSuppliers = useCallback(async () => {
    try {
      const data = await getAllSuppliers()

      console.log("RAW DATA:", data)

      const normalized = data.map((supplier: Supplier) => {
        // 🔥 NORMALISATION STATUT
        const isActive =
          supplier.is_active === true ||
          (supplier.is_active as unknown) === "true" ||
          (supplier.is_active as unknown) === 1 ||
          (supplier.is_active as unknown) === "1"

        // 🔥 NORMALISATION DATE
        let createdAt = null
        if (supplier.created_at) {
          const d = new Date(supplier.created_at)
          createdAt = isNaN(d.getTime()) ? null : supplier.created_at
        }

        return {
          ...supplier,
          is_active: isActive,
          created_at: createdAt,
        }
      })

      console.log("NORMALIZED:", normalized)

      setSuppliers(normalized)
    } catch (error) {
      console.error(error)
    }
  }, [getAllSuppliers])

  useEffect(() => {
    loadSuppliers()
  }, [loadSuppliers])

  if (isLoading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-xl font-medium">Chargement...</div>
    </div>
  )

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleCreateSupplier = () => { setEditingSupplier(null); setIsFormOpen(true) }
  const handleImportSupplier = () => setShowImportSupplierForm(true)
  const handleCloseImportForm = () => setShowImportSupplierForm(false)

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier)
    setIsFormOpen(true)
  }

  const handleViewSupplier = (supplier: Supplier) => {
    setViewingSupplier(supplier)
    setIsViewOpen(true)
  }

  const handleFormSubmit = async (formData: SupplierFormData) => {
    try {
      if (editingSupplier) {
        const response = await updateSupplier(editingSupplier.id, formData)
        if (response) {
          toast({ title: "Succès", description: "Fournisseur mis à jour avec succès" })
          await loadSuppliers()
        }
      } else {
        const response = await createSupplier(formData)
        if (response) {
          toast({ title: "Succès", description: "Fournisseur créé avec succès" })
          await loadSuppliers()
        }
      }
      setIsFormOpen(false)
      setEditingSupplier(null)
    } catch (error: unknown) {
      console.error('Erreur:', error)
      const errorMessage = error instanceof Error ? error.message : "Une erreur est survenue lors de l'opération"
      toast({
        variant: "destructive",
        title: "Erreur",
        description: errorMessage,
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Fournisseurs</h1>
          <p className="text-muted-foreground">Gérez vos relations avec vos fournisseurs</p>
        </div>
        <div className="flex gap-2">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2" onClick={handleImportSupplier}>
            <Download className="h-4 w-4" />
            Importer Fournisseur
          </Button>
          <Button onClick={handleCreateSupplier} className="gap-2 text-white bg-bouton hover:bg-bouton-hover">
            <Plus className="h-4 w-4" />
            Ajouter un fournisseur
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="list" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="list">Liste des fournisseurs</TabsTrigger>
          <TabsTrigger value="analytics">Analyses et Graphiques</TabsTrigger>
          <TabsTrigger value="performance">Performance et Intéraction</TabsTrigger>
        </TabsList>

        {/* ── Liste ── */}
        <TabsContent value="list">
          <SupplierStats
            suppliers={suppliers}
            searchTerm={searchTerm}
            selectedSupplier={selectedSupplier}
            onSearchChange={setSearchTerm}
            onStatusChange={setSelectedSupplier}
            onViewSupplier={handleViewSupplier}
            onEditSupplier={handleEditSupplier}
          />

          {/* Dialog Formulaire */}
          <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if (!open) setEditingSupplier(null) }}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingSupplier ? "Modifier le fournisseur" : "Ajouter un fournisseur"}</DialogTitle>
                <DialogDescription>Remplissez les informations du fournisseur.</DialogDescription>
              </DialogHeader>
              <DialogHeader>
                <DialogTitle>Détails du Fournisseur</DialogTitle>
                <DialogDescription>Informations complètes sur le fournisseur.</DialogDescription>
            </DialogHeader>
              <SupplierForm
                supplier={editingSupplier}
                onSubmit={handleFormSubmit}
                onCancel={() => { setIsFormOpen(false); setEditingSupplier(null) }}
              />
            </DialogContent>
          </Dialog>

          {/* Dialog Détails */}
          <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Détails du Fournisseur</DialogTitle>
              </DialogHeader>
              {viewingSupplier && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Nom</label>
                    <p className="text-foreground">{viewingSupplier.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Statut</label>
                    <div className="mt-1">
                      <Badge variant={viewingSupplier.is_active ? "default" : "secondary"}>
                        {viewingSupplier.is_active ? "Actif" : "Inactif"}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="text-foreground">{viewingSupplier.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Téléphone</label>
                    <p className="text-foreground">{viewingSupplier.phone}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-muted-foreground">Adresse</label>
                    <p className="text-foreground">{viewingSupplier.address}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Délai de livraison</label>
                    <p className="text-foreground">{viewingSupplier.lead_time ?? 0} jours</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Date de création</label>
                    <p className="text-foreground">
                        {viewingSupplier.created_at && viewingSupplier.created_at !== 'undefined'
                            ? new Date(viewingSupplier.created_at).toLocaleDateString('fr-FR')
                            : new Date().toLocaleDateString('fr-FR')
                        }
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Quantité minimale</label>
                    <p className="text-foreground">{(viewingSupplier.min_order_quantity ?? 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Quantité maximale</label>
                    <p className="text-foreground">{(viewingSupplier.max_order_quantity ?? 0).toLocaleString()}</p>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ── Analyses ── */}
        <TabsContent value="analytics">
          <SupplierAnalytics suppliers={transformedSuppliers} search={analyticsSearch} onSearch={setAnalyticsSearch} />
        </TabsContent>

        {/* ── Performance ── */}
        <TabsContent value="performance" className="space-y-6">
          <SupplierMetrics suppliers={transformedSuppliers} search={metricsSearch} onSearch={setMetricsSearch} />
        </TabsContent>
      </Tabs>

      {/* Modal Import */}
      {showImportSupplierForm && (
        <ImportSupplierForm
          onClose={handleCloseImportForm}
          onImport={async () => {}}
          onSuccess={async () => {
            await loadSuppliers()
            setShowImportSupplierForm(false)
          }}
        />
      )}
    </div>
  )
}