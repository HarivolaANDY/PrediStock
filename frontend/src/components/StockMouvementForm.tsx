import { useState, useEffect } from "react"
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
  //champs pour FEFO
  // date_entree?: string
  // lot_number?: string
  // fifo_reference?: string
}

interface StockMouvementFormProps {
  onClose: () => void
  onSubmit: (data: any) => void
  initialData?: StockMouvement | null
}

export function StockMouvementForm({ onClose, onSubmit, initialData }: StockMouvementFormProps) {
  const [showConfirmationModal, setShowConfirmationModal] = useState(false)
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState<StockMouvement>({
    id_movement: initialData?.id_movement || null,
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
      toast({
        title: "Erreur",
        description: "Le produit est requis",
        variant: "destructive",
      })
      return
    }
    const quantity = parseFloat(formData.quantity.toString() || "0")
    if (isNaN(quantity) || quantity <= 0) {
      toast({
        title: "Erreur",
        description: "La quantité doit être supérieure à 0",
        variant: "destructive",
      })
      return
    }
    if (!formData.reason.trim()) {
      toast({
        title: "Erreur",
        description: "La raison du mouvement est requise",
        variant: "destructive",
      })
      return
    }
    setShowConfirmationModal(true)
  }

  const handleConfirmSave = async () => {
    setLoading(true);
    try {
      // Convertir et valider les valeurs numériques
      const quantity = parseFloat(formData.quantity.toString() || "0")
      
      const mouvementData = {
        id_product: formData.id_product,
        quantity: quantity,
        movement_type: formData.movement_type,
        reason: formData.reason.trim(),
        notes: formData.notes?.trim(),
        product_name: formData.product_name
      };

      const response = initialData?.id_movement
        ? await stockMouvementService.updateStockMouvement(initialData.id_movement, mouvementData)
        : await stockMouvementService.createStockMouvement(mouvementData);

      if (response.status === "success") {
        toast({
          title: initialData ? "Mouvement modifié" : "Mouvement créé",
          description: `Le mouvement de stock pour ${formData.product_name} a été ${initialData ? "modifié" : "créé"} avec succès.`,
          variant: "default",
        });

        onSubmit(response.data);
        setShowConfirmationModal(false);
        onClose();
      } else {
        throw new Error(response.message || "Une erreur est survenue");
      }
    } catch (error: any) {
      console.error("Erreur:", error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  const handleCancelConfirmation = () => {
    setShowConfirmationModal(false)
  }

  return (
    <>
      {/* Modale de confirmation */}
      {showConfirmationModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Confirmer l'enregistrement</CardTitle>
              <CardDescription>
                Êtes-vous sûr de vouloir enregistrer ce mouvement de stock ?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p><strong>Produit:</strong> {formData.product_name}</p>
              <p><strong>Quantité:</strong> {formData.quantity}</p>
              <p><strong>Type:</strong> {formData.movement_type}</p>
            </CardContent>
            <div className="p-6 flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={handleCancelConfirmation}
                disabled={loading}
              >
                Annuler
              </Button>
              <Button
                onClick={handleConfirmSave}
                disabled={loading}
              >
                {loading ? "Enregistrement..." : "Confirmer"}
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
                  Enregistrez un nouveau mouvement de stock
                </CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="product_name">Nom du produit</Label>
                <Input
                  id="product_name"
                  value={formData.product_name}
                  onChange={(e) => handleInputChange("product_name", e.target.value)}
                  placeholder="Nom du produit"
                  readOnly
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantité *</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => handleInputChange("quantity", e.target.value)}
                  min={0}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type_mouvement">Type de mouvement *</Label>
                <Select 
                  value={formData.movement_type} 
                  onValueChange={(value) => handleInputChange("movement_type", value)}
                >
                  <SelectTrigger>
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="raison">Raison du mouvement *</Label>
                <Input
                  id="raison"
                  value={formData.reason}
                  onChange={(e) => handleInputChange("reason", e.target.value)}
                  placeholder="Raison du mouvement de stock"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (facultatif)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  placeholder="Notes additionnelles..."
                />
              </div>
            </div>

            {/* Ajouter les champs FIFO conditionnels */}
            {/* {formData.movement_type === 'IN' && (
              <div className="space-y-4 border p-4 rounded-lg bg-slate-50">
                <div className="text-sm font-medium text-slate-500">Informations FIFO requises</div>
                
                <div className="space-y-2">
                  <Label htmlFor="date_entree">Date d'entrée du lot *</Label>
                  <Input
                    id="date_entree"
                    type="date"
                    value={formData.date_entree}
                    onChange={(e) => handleInputChange("date_entree", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lot_number">Numéro de lot *</Label>
                  <Input
                    id="lot_number"
                    value={formData.lot_number}
                    onChange={(e) => handleInputChange("lot_number", e.target.value)}
                    placeholder="Numéro du lot à sortir"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fifo_reference">Référence FIFO *</Label>
                  <Input
                    id="fifo_reference"
                    value={formData.fifo_reference}
                    onChange={(e) => handleInputChange("fifo_reference", e.target.value)}
                    placeholder="Référence FIFO du lot"
                    required
                  />
                </div>
              </div>
            )} */}

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