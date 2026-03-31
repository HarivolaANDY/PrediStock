import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { useSupplier } from "@/contexts/SupplierContext"
import { Supplier, SupplierFormData } from "@/types/types"

interface SupplierFormProps {
  supplier?: Supplier | null;
  onSubmit: (data: SupplierFormData) => void;
  onCancel: () => void;
}

export function SupplierForm({ supplier, onSubmit, onCancel }: SupplierFormProps) {
  const { isLoading } = useSupplier()
  const { toast } = useToast()
  const [phoneError, setPhoneError] = useState<string>("")
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    leadTime: 7,
    minOrderQuantity: 1,
    maxOrderQuantity: 1000,
    isActive: true, // ← toujours initialisé à true (booléen garanti)
  })

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name ?? "",
        email: supplier.email ?? "",
        phone: supplier.phone ?? "",
        address: supplier.address ?? "",
        leadTime: supplier.lead_time ?? 7,
        minOrderQuantity: supplier.min_order_quantity ?? 1,
        maxOrderQuantity: supplier.max_order_quantity ?? 1000,
        // ← Forcer booléen : l'API peut retourner "true"/"false" en string
        isActive: Boolean(supplier.is_active),
      })
    }
  }, [supplier])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    try {
      const supplierData: SupplierFormData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        leadTime: formData.leadTime,
        minOrderQuantity: formData.minOrderQuantity,
        maxOrderQuantity: formData.maxOrderQuantity,
        isActive: formData.isActive,
      }
      onSubmit(supplierData)
    } catch (error: any) {
      console.error('Erreur:', error)
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de l'opération",
      })
    }
  }

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const validatePhoneNumber = (phone: string): boolean => {
    const phoneRegex = /^\+261\s(32|33|34|37|38|39)\s\d{2}\s\d{3}\s\d{2}$/
    return phoneRegex.test(phone)
  }

  const formatPhoneNumber = (value: string): string => {
    if (!value || value === '+') return ''
    let cleaned = value.replace(/[^\d+]/g, '')
    if (cleaned.length <= 4) cleaned = '+261'
    if (!cleaned.startsWith('+261')) {
      if (cleaned.startsWith('0')) cleaned = '+261' + cleaned.slice(1)
      else if (!cleaned.startsWith('+')) cleaned = '+261' + cleaned
    }
    if (cleaned.length >= 4) cleaned = cleaned.slice(0, 4) + ' ' + cleaned.slice(4)
    if (cleaned.length >= 7) cleaned = cleaned.slice(0, 7) + ' ' + cleaned.slice(7)
    if (cleaned.length >= 10) cleaned = cleaned.slice(0, 10) + ' ' + cleaned.slice(10)
    if (cleaned.length >= 14) cleaned = cleaned.slice(0, 14) + ' ' + cleaned.slice(14)
    if (cleaned.length < 4) return '+261'
    return cleaned
  }

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast({ title: "Erreur de validation", description: "Le nom du fournisseur est requis", variant: "destructive" })
      return false
    }
    if (!formData.email.trim() || !formData.email.includes("@")) {
      toast({ title: "Erreur de validation", description: "Un email valide est requis", variant: "destructive" })
      return false
    }
    if (formData.phone && !validatePhoneNumber(formData.phone)) {
      toast({
        title: "Erreur de validation",
        description: "Le format du numéro de téléphone est incorrect. Il doit commencer par +261 suivi de 32, 33, 34, 37, 38 ou 39",
        variant: "destructive",
      })
      return false
    }
    if (formData.minOrderQuantity >= formData.maxOrderQuantity) {
      toast({ title: "Erreur de validation", description: "La quantité maximale doit être supérieure à la quantité minimale", variant: "destructive" })
      return false
    }
    return true
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nom du Fournisseur</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            placeholder="Nom du fournisseur"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange("email", e.target.value)}
            placeholder="fournisseur@exemple.com"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Numéro de téléphone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => {
              const formattedNumber = formatPhoneNumber(e.target.value)
              handleInputChange("phone", formattedNumber)
              if (formattedNumber.length >= 13) {
                setPhoneError(validatePhoneNumber(formattedNumber) ? "" : "Le numéro doit commencer par +261 suivi de 32, 33, 34, 37, 38 ou 39")
              } else {
                setPhoneError("Le numéro doit contenir 13 caractères")
              }
            }}
            placeholder="+261 3X XXXXXXX"
            className={phoneError ? "border-red-500" : ""}
          />
          {phoneError && <p className="text-sm text-red-500 mt-1">{phoneError}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="leadTime">Délai de livraison (jours)</Label>
          <Input
            id="leadTime"
            type="number"
            min="1"
            value={formData.leadTime}
            onChange={(e) => handleInputChange("leadTime", parseInt(e.target.value) || 1)}
            placeholder="7"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Adresse</Label>
        <Textarea
          id="address"
          value={formData.address}
          onChange={(e) => handleInputChange("address", e.target.value)}
          placeholder="Adresse complète"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="minOrder">Quantité minimale de commande</Label>
          <Input
            id="minOrder"
            type="number"
            min="1"
            value={formData.minOrderQuantity}
            onChange={(e) => handleInputChange("minOrderQuantity", parseInt(e.target.value) || 1)}
            placeholder="1"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxOrder">Quantité maximale de commande</Label>
          <Input
            id="maxOrder"
            type="number"
            min="1"
            value={formData.maxOrderQuantity}
            onChange={(e) => handleInputChange("maxOrderQuantity", parseInt(e.target.value) || 1)}
            placeholder="1000"
          />
        </div>
      </div>

      {/* Switch toujours contrôlé — checked ne peut jamais être undefined */}
      <div className="flex items-center space-x-2">
        <Switch
          id="active"
          checked={formData.isActive}  // ← toujours un booléen grâce à Boolean() dans useEffect
          onCheckedChange={(checked) => handleInputChange("isActive", checked)}
        />
        <Label htmlFor="active">Fournisseur actif</Label>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" disabled={isLoading} className="text-white bg-bouton hover:bg-bouton-hover">
          {supplier ? "Mettre à jour" : "Créer le fournisseur"}
        </Button>
      </div>
    </form>
  )
}