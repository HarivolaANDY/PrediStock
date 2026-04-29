import { useState, useEffect } from "react"
import { ArrowLeft, ArrowRight, Upload, X } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { API_URL } from "./productApi"
import { Switch } from "@/components/ui/switch";
import { unites_mesures } from "@/types/unites_mesures"

interface Category {
  id: number;
  name: string;
}

interface Supplier {
  id: number;
  name: string;
}

interface ProductImage {
  file: File;
  preview: string;
}

export interface ProductFormData {
  name: string;
  description: string;
  stock_threshold: number | string;
  category: number | string | null;
  price: number | string;
  currency: string;
  sku: string;
  current_stock: number | string;
  id?: number;
  supplier: number | string | null;
  est_perissable: boolean;
  unite_mesure: string;
  product_img: File | string | null;
  tags?: string[];
  threshold?: number | string;
}

interface ProductFormProps {
  onClose: () => void
  onSubmit: (data: FormData) => void
  initialData?: Partial<ProductFormData> & { tags?: string[]; threshold?: number | string }
}

export function ProductForm({ onClose, onSubmit, initialData }: ProductFormProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [images, setImages] = useState<ProductImage[]>([])
  const [uploadError, setUploadError] = useState("")
  const [currentStep, setCurrentStep] = useState(1)
  const [tags, setTags] = useState<string[]>(initialData?.tags || ["En stock"])
  const [newTag, setNewTag] = useState("")
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    description: initialData?.description || "",
    stock_threshold: initialData?.stock_threshold || initialData?.threshold || "",
    category: initialData?.category || "",
    price: initialData?.price || "",
    currency: initialData?.currency || "Ariary",
    sku: initialData?.sku || "",
    current_stock: initialData?.current_stock || 0,
    id: initialData?.id || null,
    supplier: initialData?.supplier || null,
    est_perissable: initialData?.est_perissable || false,
    unite_mesure : initialData?.unite_mesure || "pc",
    product_img: initialData?.product_img || null,
  })

  // Fetch categories and suppliers when component mounts
  useEffect(() => {
    const fetchData = async () => {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Token ${token}`
        };

        try {
            // Fetch categories
            console.log('Fetching categories...')
            const catResponse = await fetch(
                'http://localhost:8000/api/catalogue/categories/',
                { headers }
            )
            if (catResponse.ok) {
                const catData = await catResponse.json()
                const categoryData = catData.success ? catData.data : [];
                setCategories(categoryData);
            } else {
                console.error('Category response not OK:', await catResponse.text())
            }

            // Fetch suppliers
            console.log('Fetching suppliers...')
            const supResponse = await fetch(
                'http://localhost:8000/api/catalogue/suppliers/',
                { headers }  // ← token ajouté ici
            )
            if (supResponse.ok) {
                const supData = await supResponse.json()
                setSuppliers(supData.data || [])
            } else {
                console.error('Supplier response not OK:', await supResponse.text())
            }
        } catch (error) {
            console.error('Error fetching data:', error)
        }
    }

    fetchData()
  }, [])

  const steps = [
    { number: 1, title: "INFOS PRODUIT", color: "bg-blue-500", color2: "text-blue-500" },
    { number: 2, title: "MÉDIAS" , color: "bg-blue-500", color2: "text-blue-500" },
    { number: 3, title: "TARIFICATION", color: "bg-blue-500", color2: "text-blue-500" },
  ]

  const handleInputChange = (field: string, value: string | boolean) => {
    console.log(`Setting ${field} to:`, value, typeof value);
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      console.log('New form data:', newData);
      return newData;
    });
  }

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  // ✅ CORRECTION: Bloquer à 4 images dès la sélection, ne prendre que les slots restants
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const remaining = 4 - images.length  // ✅ combien de slots restants

    if (remaining <= 0) {
      setUploadError("Maximum 4 images atteint. Supprimez une image avant d'en ajouter.")
      return
    }

    // ✅ Ne prendre que ce qui rentre dans les slots restants
    const filesToAdd = Array.from(files).slice(0, remaining)

    if (files.length > remaining) {
      setUploadError(`Seules ${filesToAdd.length} image(s) ajoutée(s) sur ${files.length} — maximum 4 au total.`)
    } else {
      setUploadError("")
    }

    const newImages: ProductImage[] = filesToAdd.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }))

    setImages(prev => [...prev, ...newImages])

    // ✅ Reset l'input pour permettre re-sélection
    e.target.value = ""
  }

  const removeImage = (index: number) => {
    setImages(prev => {
      const newImages = [...prev]
      URL.revokeObjectURL(newImages[index].preview)
      newImages.splice(index, 1)
      return newImages
    })
  }

  const handleSubmit = async () => {
    try {
      if (!formData.name)            { alert("Le nom du produit est requis"); return; }
      if (!formData.price)           { alert("Le prix est requis"); return; }
      if (!formData.sku)             { alert("Le SKU est requis"); return; }
      if (!formData.stock_threshold) { alert("Le seuil de stock est requis"); return; }
  
      const formDataToSend = new FormData();
  
      const price           = parseFloat(formData.price.toString() || "0");
      const stock_threshold = parseInt(formData.stock_threshold.toString() || "10", 10);
      const current_stock   = parseInt(formData.current_stock.toString() || "0", 10);
  
      const productData: Record<string, unknown> = {
        name:           formData.name.trim(),
        description:    formData.description?.trim() || "",
        price,
        stock_threshold,
        current_stock,
        sku:            formData.sku.trim(),
        is_active:      true,
        category:       formData.category ? parseInt(formData.category.toString(), 10) : null,
        supplier:       formData.supplier ? parseInt(formData.supplier.toString(), 10) : null,
        est_perissable: Boolean(formData.est_perissable),
        unite_mesure:   formData.unite_mesure,
      };
  
      if (initialData?.id) {
        productData.id = initialData.id;
      }
  
      // Champs scalaires
      Object.entries(productData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formDataToSend.append(key, value.toString());
        }
      });
  
      // ✅ Toutes les images uploadées — chacune sous la clé "product_img"
      // productApi.ts les collecte toutes via data.forEach et les uploade en boucle
      if (images.length > 0) {
        images.forEach((img) => {
          formDataToSend.append("product_img", img.file);
        });
      } else if (formData.product_img && typeof formData.product_img !== "string") {
        formDataToSend.append("product_img", formData.product_img as File);
      }
  
      onSubmit(formDataToSend);
    } catch (error) {
      console.error("Erreur lors de la préparation des données:", error);
    }
  };


  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">
                {initialData ? "Modifier le produit" : "Ajouter un nouveau produit"}
              </CardTitle>
              <CardDescription>
                Ces informations nous permettront d'en savoir plus sur votre produit.
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Étapes */}
          <div className="bg-card-foreground rounded-lg p-4">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.number} className="flex items-center">
                  <div className={`flex items-center ${index < steps.length - 1 ? 'flex-1' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      currentStep >= step.number 
                        ? `${step.color} text-gray-300` 
                        : 'bg-sidebar-accent/50 text-sidebar-foreground'
                    }`}>
                      {step.number}
                    </div>
                    <span className={`ml-2 text-sm font-medium ${
                      currentStep >= step.number ? `${step.color2}` : 'text-sidebar-foreground'
                    }`}>
                      {step.title}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Étape 1 - Infos produit */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold">Informations sur le produit</h3>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stock_threshold">Seuil</Label>
                  <Input
                    id="stock_threshold"
                    type="number"
                    value={formData.stock_threshold}
                    onChange={(e) => handleInputChange("stock_threshold", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Label htmlFor="description">Description (facultatif)</Label>
                  <Textarea
                    id="description"
                    rows={4}
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    placeholder="Ex : très léger et durable"
                  />
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="est_perissable"
                      checked={formData.est_perissable}
                      onCheckedChange={(checked) => handleInputChange("est_perissable", checked)}
                    />
                    <Label htmlFor="est_perissable">Produit périssable</Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Catégorie</Label>
                  <Select
                    value={formData.category?.toString() || ""}
                    onValueChange={(value) => handleInputChange("category", value)}
                  >
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Sélectionner une catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(categories) && categories.map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="supplier">Fournisseur</Label>
                    <Select
                      value={formData.supplier?.toString() || ""}
                      onValueChange={(value) => handleInputChange("supplier", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un fournisseur" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id.toString()}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Étape 2 - Médias */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold">Médias</h3>
              <div className="space-y-4">
                <Label>Images du produit (Maximum 4)</Label>
                <div 
                  className="border-2 border-dashed border-muted rounded-lg p-12 text-center cursor-pointer"
                  onClick={() => document.getElementById('image-upload')?.click()}
                >
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Cliquez ou déposez les fichiers ici pour les téléverser
                  </p>
                  <input
                    id="image-upload"
                    type="file"
                    name="product_img"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </div>
                {uploadError && (
                  <p className="text-red-500 text-sm">{uploadError}</p>
                )}
                
                {/* Aperçu des images */}
                {images.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    {images.map((image, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={image.preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <button
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Étape 3 - Tarification */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold">Tarification</h3>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="unite">Unité de mesures</Label>
                  <div className="flex gap-2">
                    <select
                      name="unite_mesure"
                      id="unite_mesure"
                      className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={formData.unite_mesure}
                      onChange={(e) => handleInputChange("unite_mesure", e.target.value)}
                    >
                      {unites_mesures.map((unite) => (
                        <option key={unite.symbol} value={unite.symbol}>
                          {unite.name} - {unite.symbol} 
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => handleInputChange("sku", e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                      <Label htmlFor="price">Prix</Label>
                      <div className="flex gap-2">
                          <Input
                              id="price"
                              type="number"
                              value={formData.price}
                              onChange={(e) => handleInputChange("price", e.target.value)}
                              placeholder="Ex: 15000"
                          />
                          <Select
                              value={formData.currency}
                              onValueChange={(value) => handleInputChange("currency", value)}
                          >
                              <SelectTrigger className="w-32">
                                  <SelectValue placeholder="Devise" />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="Ariary">Ariary</SelectItem>
                                  <SelectItem value="EUR">EUR</SelectItem>
                                  <SelectItem value="USD">USD</SelectItem>
                              </SelectContent>
                          </Select>
                      </div>
                  </div>

                  <div className="space-y-2">
                      <Label htmlFor="current_stock">Stock initial</Label>
                      <Input
                          id="current_stock"
                          type="number"
                          value={formData.current_stock}
                          onChange={(e) => handleInputChange("current_stock", e.target.value)}
                          placeholder="Ex: 100"
                      />
                  </div>
              </div>
              </div>
              <div className="space-y-2">
                <Label>Étiquettes</Label>
                <div className="flex gap-2 flex-wrap mb-2">
                  {tags.map((tag, index) => (
                    <Badge
                      key={index}
                      variant={tag === "En stock" ? "default" : "secondary"}
                      className="flex items-center gap-1"
                    >
                      {tag}
                      <button onClick={() => removeTag(tag)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ajouter une étiquette"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && addTag()}
                  />
                  <Button type="button" onClick={addTag}>
                    Ajouter
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-6">
            <Button
              variant="outline"
              onClick={currentStep === 1 ? onClose : handlePrev}
            >
              {currentStep === 1 ? (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Annuler
                </>
              ) : (
                <>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Précédent
                </>
              )}
            </Button>

            <Button className="text-white bg-bouton hover:bg-bouton-hover" onClick={currentStep === steps.length ? handleSubmit : handleNext}>
              {currentStep === steps.length ? "Envoyer" : "Suivant"}
              {currentStep < steps.length && <ArrowRight className="h-4 w-4 ml-2" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}