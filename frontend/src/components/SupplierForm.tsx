import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useSupplier } from "@/contexts/SupplierContext"
import { Supplier, SupplierFormData } from "@/types/types"
import API from "@/services/axios"
import { X } from "lucide-react"

interface SupplierFormProps {
  supplier?: Supplier | null;
  onSubmit: (data: SupplierFormData) => void;
  onCancel: () => void;
}

interface ProductOption {
  id: number
  name: string
  sku: string
  unite_mesure: string
}

export function SupplierForm({ supplier, onSubmit, onCancel }: SupplierFormProps) {
  const { isLoading } = useSupplier()
  const { toast } = useToast()
  const [phoneError, setPhoneError] = useState<string>("")
  const [allProducts, setAllProducts] = useState<ProductOption[]>([])
  const [productSearch, setProductSearch] = useState("")
  const [selectedProducts, setSelectedProducts] = useState<ProductOption[]>([])
  const [showProductDropdown, setShowProductDropdown] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    leadTime: 7,
    minOrderQuantity: 1,
    maxOrderQuantity: 1000,
    isActive: true,
  })

  // ── Charger tous les produits disponibles ──────────────────────────────────
  useEffect(() => {
    API.get('catalogue/products/?page_size=1000')
      .then(res => {
        const results = res.data?.data?.results || res.data?.results || res.data || []
        setAllProducts(Array.isArray(results) ? results : [])
      })
      .catch(err => console.error('Erreur chargement produits:', err))
  }, [])

  // ── Pré-remplir en mode édition ────────────────────────────────────────────
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
        isActive: Boolean(supplier.is_active),
      })
      // Pré-sélectionner les produits déjà associés
      if (supplier.products && supplier.products.length > 0) {
        setSelectedProducts(supplier.products as ProductOption[])
      }
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
        products: selectedProducts.map(p => p.name).join(';'),
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

  const toggleProduct = (product: ProductOption) => {
    setSelectedProducts(prev =>
      prev.some(p => p.id === product.id)
        ? prev.filter(p => p.id !== product.id)
        : [...prev, product]
    )
  }

  const removeProduct = (id: number) => {
    setSelectedProducts(prev => prev.filter(p => p.id !== id))
  }

  const filteredProducts = allProducts.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) &&
    !selectedProducts.some(s => s.id === p.id)
  )

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

      {/* ── Sélection des produits fournis ────────────────────────────────── */}
      <div className="space-y-2">
        <Label>Produits fournis</Label>

        {/* Tags des produits sélectionnés */}
        {selectedProducts.length > 0 && (
          <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-muted/30 min-h-[40px]">
            {selectedProducts.map(p => (
              <Badge key={p.id} variant="secondary" className="gap-1 pr-1">
                {p.name} {p.unite_mesure ? `(${p.unite_mesure})` : ''}
                <button
                  type="button"
                  onClick={() => removeProduct(p.id)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {/* Champ de recherche produit */}
        <div className="relative">
          <Input
            placeholder="Rechercher un produit à ajouter..."
            value={productSearch}
            onChange={(e) => { setProductSearch(e.target.value); setShowProductDropdown(true) }}
            onFocus={() => setShowProductDropdown(true)}
            onBlur={() => setTimeout(() => setShowProductDropdown(false), 200)}
          />
          {showProductDropdown && filteredProducts.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto">
              {filteredProducts.slice(0, 20).map(p => (
                <button
                  key={p.id}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center justify-between"
                  onMouseDown={() => { toggleProduct(p); setProductSearch("") }}
                >
                  <span>{p.name}</span>
                  {p.unite_mesure && (
                    <span className="text-xs text-muted-foreground">{p.unite_mesure}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="active"
          checked={formData.isActive}
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