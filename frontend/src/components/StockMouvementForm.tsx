import { useState } from "react"
import { X } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { stockMouvementService } from '@/services/stockMouvementService'

interface StockMouvement {
  id_movement?: number
  id_product: number
  product_name?: string
  quantity: string | number
  movement_type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'RETURN' | 'SCRAP'
  reason: string
  notes?: string
  unit_price?: number
}

interface StockMouvementFormProps {
  onClose: () => void
  onSubmit: (data: StockMouvement) => void
  initialData?: StockMouvement | null
}

// ✅ Badge coloré par type de mouvement
const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  IN:         { label: "Entrée",      color: "text-green-700",  bg: "bg-green-100 border-green-200" },
  OUT:        { label: "Sortie",      color: "text-red-700",    bg: "bg-red-100 border-red-200" },
  ADJUSTMENT: { label: "Ajustement", color: "text-blue-700",   bg: "bg-blue-100 border-blue-200" },
  RETURN:     { label: "Retour",      color: "text-yellow-700", bg: "bg-yellow-100 border-yellow-200" },
  SCRAP:      { label: "Rebut",       color: "text-gray-700",   bg: "bg-gray-100 border-gray-200" },
}

export function StockMouvementForm({ onClose, onSubmit, initialData }: StockMouvementFormProps) {
  const [showConfirmationModal, setShowConfirmationModal] = useState(false)
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState<StockMouvement>({
    id_movement: initialData?.id_movement,
    id_product: initialData?.id_product || 0,
    product_name: initialData?.product_name || "",
    quantity: initialData?.quantity || "",
    movement_type: initialData?.movement_type || 'IN',
    reason: initialData?.reason || "",
    notes: initialData?.notes || "",
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSaveClick = () => {
    if (!formData.id_product) {
      toast({ title: "Erreur", description: "Le produit est requis.", variant: "destructive" })
      return
    }
    const quantity = parseFloat(formData.quantity.toString() || "0")
    if (isNaN(quantity) || quantity <= 0) {
      toast({ title: "Erreur", description: "La quantité doit être supérieure à 0.", variant: "destructive" })
      return
    }
    if (!formData.reason.trim()) {
      toast({ title: "Erreur", description: "La raison du mouvement est requise.", variant: "destructive" })
      return
    }
    setShowConfirmationModal(true)
  }

  const handleConfirmSave = async () => {
    setLoading(true)
    try {
      const quantity = parseFloat(formData.quantity.toString() || "0")

      const mouvementData = {
        id_product: formData.id_product,
        quantity,
        movement_type: formData.movement_type,
        reason: formData.reason.trim(),
        notes: formData.notes?.trim(),
        product_name: formData.product_name
      }

      const response = initialData?.id_movement
        ? await stockMouvementService.updateStockMouvement(initialData.id_movement, mouvementData)
        : await stockMouvementService.createStockMouvement(mouvementData)

      if (response.status === "success") {
        toast({
          title: initialData ? "Mouvement modifié" : "Mouvement créé",
          description: `Le mouvement pour ${formData.product_name} a été ${initialData ? "modifié" : "créé"} avec succès.`,
        })
        onSubmit(response.data)
        setShowConfirmationModal(false)
        onClose()
      } else {
        throw new Error(response.message || "Une erreur est survenue")
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Une erreur inconnue est survenue"
      toast({ title: "Erreur", description: errorMessage, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const typeConfig = TYPE_CONFIG[formData.movement_type]

  return (
    <>
      {/* Modale de confirmation */}
      {showConfirmationModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Confirmer l'enregistrement</CardTitle>
              <CardDescription>
                Vérifiez les informations avant de confirmer.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Produit</span>
                <span className="font-medium text-gray-900">{formData.product_name || "—"}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Quantité</span>
                <span className="font-medium text-gray-900">{formData.quantity}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Type</span>
                {/* ✅ Badge coloré */}
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${typeConfig.bg} ${typeConfig.color}`}>
                  {typeConfig.label}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600">Raison</span>
                <span className="font-medium text-gray-900 text-right max-w-[200px] truncate">{formData.reason}</span>
              </div>
            </CardContent>
            <div className="p-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowConfirmationModal(false)} disabled={loading}>
                Annuler
              </Button>
              <Button onClick={handleConfirmSave} disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Enregistrement...
                  </span>
                ) : "Confirmer"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Formulaire principal */}
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">
                  {initialData ? "Modifier le mouvement" : "Nouveau mouvement de stock"}
                </CardTitle>
                <CardDescription>
                  Enregistrez un mouvement de stock
                </CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-4">

              {/* Produit — readOnly avec explication */}
              <div className="space-y-2">
                <Label htmlFor="product_name">
                  Produit
                  <span className="ml-2 text-xs text-gray-400 font-normal">(pré-rempli automatiquement)</span>
                </Label>
                <Input
                  id="product_name"
                  value={formData.product_name}
                  readOnly
                  className="bg-gray-50 cursor-not-allowed text-gray-600"
                />
              </div>

              {/* Quantité */}
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantité <span className="text-red-500">*</span></Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => handleInputChange("quantity", e.target.value)}
                  min={0}
                  required
                />
              </div>

              {/* Type de mouvement avec badge coloré inline */}
              <div className="space-y-2">
                <Label htmlFor="type_mouvement">Type de mouvement <span className="text-red-500">*</span></Label>
                <div className="flex items-center gap-3">
                  <Select
                    value={formData.movement_type}
                    onValueChange={(value) => handleInputChange("movement_type", value)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Sélectionner le type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IN">Entrée</SelectItem>
                      <SelectItem value="OUT">Sortie</SelectItem>
                      <SelectItem value="ADJUSTMENT">Ajustement</SelectItem>
                      <SelectItem value="RETURN">Retour</SelectItem>
                      <SelectItem value="SCRAP">Rebut</SelectItem>
                    </SelectContent>
                  </Select>
                  {/* ✅ Badge coloré en temps réel */}
                  <span className={`px-3 py-1.5 rounded-full text-sm font-medium border whitespace-nowrap ${typeConfig.bg} ${typeConfig.color}`}>
                    {typeConfig.label}
                  </span>
                </div>
              </div>

              {/* Raison */}
              <div className="space-y-2">
                <Label htmlFor="raison">Raison du mouvement <span className="text-red-500">*</span></Label>
                <Input
                  id="raison"
                  value={formData.reason}
                  onChange={(e) => handleInputChange("reason", e.target.value)}
                  placeholder="Ex : Livraison fournisseur, vente client..."
                  required
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes <span className="text-gray-400 font-normal text-xs">(facultatif)</span></Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  placeholder="Notes additionnelles..."
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-between pt-6">
              <Button variant="outline" onClick={onClose}>
                <X className="h-4 w-4 mr-2" />
                Annuler
              </Button>
              <Button onClick={handleSaveClick}>
                Enregistrer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}