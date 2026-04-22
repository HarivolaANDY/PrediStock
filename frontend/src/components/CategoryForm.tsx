import { useState, useEffect } from "react"
import { X, Plus, Minus, ChevronDown, ChevronUp } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { categoryAPI } from '@/services/api'
import { Category as CategoryType } from '@/types/types';

interface CategoryFormProps {
  onClose: () => void
  onSubmit: (data: CategoryType) => void
  initialData?: CategoryType | null
}

export function CategoryForm({ onClose, onSubmit, initialData }: CategoryFormProps) {
  const [showConfirmationModal, setShowConfirmationModal] = useState(false)
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState<CategoryType>({
    id: "",
    name: "",
    description: "",
    is_active: true,
    product_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    subcategories: []
  })
  
  const [showSubcategories, setShowSubcategories] = useState(false)
  const [numSubcategories, setNumSubcategories] = useState(0)

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        id: initialData.id || "",
        name: initialData.name || "",
        description: initialData.description || "",
      })
    }
  }, [initialData])

  const handleInputChange = (field: keyof CategoryType, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSaveClick = () => {
    if (!formData.name.trim()) {
      alert("Le nom de la catégorie est requis")
      return
    }
    setShowConfirmationModal(true)
  }

  const handleConfirmSave = async () => {
    setLoading(true);
    try {
      // Validation des champs requis
      if (!formData.name) {
        toast({
          title: "Erreur",
          description: "Le nom de la catégorie est requis",
          variant: "destructive",
        });
        return;
      }

      // Préparer les données pour l'envoi
      const categoryData: {
        name: string;
        description: string;
        is_active: boolean;
        subcategories: Array<{ name: string; description: string }>;
        id?: string;
      } = {
        name: formData.name.trim(),
        description: formData.description?.trim() || "",
        is_active: true,
        subcategories: formData.subcategories?.filter(sub => sub.name.trim() !== "").map(sub => ({
          name: sub.name.trim(),
          description: sub.description?.trim() || ""
        })) || []
      };

      // Ajouter l'ID si c'est une mise à jour
      if (initialData?.id) {
        categoryData.id = initialData.id;
        console.log('Mise à jour de la catégorie ID:', initialData.id);
      }

      console.log("Données à envoyer:", categoryData);

      // Faire la requête
      const baseUrl = 'http://localhost:8000/api/catalogue/categories';
      const url = initialData?.id 
        ? `${baseUrl}/${initialData.id}/`
        : `${baseUrl}/`;

      console.log('URL utilisée:', url);

      const response = await fetch(url, {
        method: initialData ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Token ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(categoryData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.detail || 'Une erreur est survenue');
      }

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: initialData ? "Catégorie modifiée" : "Catégorie créée",
          description: `La catégorie ${formData.name} a été ${initialData ? "modifiée" : "créée"} avec succès.`,
          variant: "default",
        });

        onSubmit(data.data);
        setShowConfirmationModal(false);
        onClose();
      } else {
        throw new Error(data.message || "Une erreur est survenue");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Une erreur est survenue";
      console.error("Erreur:", error);
      toast({
        title: "Erreur",
        description: errorMessage,
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
      {/* Formulaire principal */}
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">
                  {initialData ? "Modifier la catégorie" : "Ajouter une nouvelle catégorie"}
                </CardTitle>
                <CardDescription>
                  Créez ou modifiez une catégorie pour organiser vos produits.
                </CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-6">
              <h3 className="text-xl font-semibold">Informations de la catégorie</h3>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom de la catégorie *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Ex: Vêtements, Électronique, Mobilier..."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    placeholder="Ex: Confortable et élégant, parfait pour toutes les occasions."
                  />
                </div>

                {/* Section des sous-catégories */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="subcategories">Sous-catégories</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowSubcategories(!showSubcategories)}
                      >
                        {showSubcategories ? "Masquer" : "Ajouter des sous-catégories"}
                        {showSubcategories ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {showSubcategories && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <Label htmlFor="numSubcategories">Nombre de sous-catégories</Label>
                        <Select
                          value={numSubcategories.toString()}
                          onValueChange={(value) => {
                            const num = parseInt(value);
                            setNumSubcategories(num);
                            const currentSubcategories = [...(formData.subcategories || [])];
                            if (num > currentSubcategories.length) {
                              // Ajouter des sous-catégories
                              const newSubcategories = [...currentSubcategories];
                              for (let i = currentSubcategories.length; i < num; i++) {
                                newSubcategories.push({ name: "", description: "" });
                              }
                              setFormData(prev => ({ ...prev, subcategories: newSubcategories }));
                            } else {
                              // Réduire le nombre de sous-catégories
                              setFormData(prev => ({
                                ...prev,
                                subcategories: currentSubcategories.slice(0, num)
                              }));
                            }
                          }}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                          <SelectContent>
                            {[0, 1, 2, 3, 4, 5].map((num) => (
                              <SelectItem key={num} value={num.toString()}>
                                {num}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {numSubcategories > 0 && (
                        <Accordion type="single" collapsible className="w-full">
                          {Array.from({ length: numSubcategories }).map((_, index) => (
                            <AccordionItem key={index} value={`subcategory-${index}`}>
                              <AccordionTrigger className="hover:no-underline">
                                <span className="text-sm font-medium">
                                  Sous-catégorie {index + 1}
                                  {formData.subcategories?.[index]?.name && ` - ${formData.subcategories[index].name}`}
                                </span>
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="space-y-4 p-4">
                                  <div className="space-y-2">
                                    <Label htmlFor={`subcategory-${index}-name`}>Nom</Label>
                                    <Input
                                      id={`subcategory-${index}-name`}
                                      value={formData.subcategories?.[index]?.name || ""}
                                      onChange={(e) => {
                                        const newSubcategories = [...(formData.subcategories || [])];
                                        if (!newSubcategories[index]) {
                                          newSubcategories[index] = { name: "", description: "" };
                                        }
                                        newSubcategories[index].name = e.target.value;
                                        setFormData(prev => ({ ...prev, subcategories: newSubcategories }));
                                      }}
                                      placeholder="Nom de la sous-catégorie"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor={`subcategory-${index}-description`}>Description</Label>
                                    <Textarea
                                      id={`subcategory-${index}-description`}
                                      value={formData.subcategories?.[index]?.description || ""}
                                      onChange={(e) => {
                                        const newSubcategories = [...(formData.subcategories || [])];
                                        if (!newSubcategories[index]) {
                                          newSubcategories[index] = { name: "", description: "" };
                                        }
                                        newSubcategories[index].description = e.target.value;
                                        setFormData(prev => ({ ...prev, subcategories: newSubcategories }));
                                      }}
                                      placeholder="Description de la sous-catégorie"
                                    />
                                  </div>
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      )}
                    </div>
                  )}
                </div>
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

      {/* Modal de confirmation */}
      {showConfirmationModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Confirmer l'action</CardTitle>
              <CardDescription>
                Êtes-vous sûr de vouloir {initialData ? "modifier" : "ajouter"} cette catégorie ?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-4">
                {/* Affichage conditionnel du ID */}
                {formData.id && <p><strong>ID:</strong> {formData.id}</p>}
                <p><strong>Nom:</strong> {formData.name}</p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleCancelConfirmation} disabled={loading}>
                  Annuler
                </Button>
                <Button onClick={handleConfirmSave} disabled={loading}>
                  {loading ? "Enregistrement..." : "Confirmer"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}