import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { categoryAPI } from '@/services/api';

interface Type {
  id?: number | string
  name: string
  description?: string
}

interface TypeFormProps {
  onClose: () => void
  onSubmit: (data: Type) => void
  initialData?: Type | null
}

export function CategoryForm({ onClose, onSubmit, initialData }: TypeFormProps) {
  const [showConfirmationModal, setShowConfirmationModal] = useState(false)
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState<Type>({
    id: "",
    name: "",
    description: "",
  })

  useEffect(() => {
    if (initialData) {
      setFormData({
        id: initialData.id || "",
        name: initialData.name || "",
        description: initialData.description || "",
      })
    }
  }, [initialData])

  const handleInputChange = (field: keyof Type, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSaveClick = () => {
    if (!formData.name.trim()) {
      alert("Le nom du type de rapport est requis")
      return
    }
    setShowConfirmationModal(true)
  }

  const handleConfirmSave = async () => {
    setLoading(true);
    try {
      const categoryData = {
        name: formData.name?.trim(),
        description: formData.description?.trim(),
      };

      const response = initialData 
        ? await categoryAPI.updateCategory(initialData.id as string, categoryData)
        : await categoryAPI.createCategory(categoryData);

      if (response.results.success) {
        toast({
          title: initialData ? "Type modifié" : "Type créée",
          description: `La type de rapport ${formData.name} a été ${initialData ? "modifiée" : "créée"} avec succès.`,
          variant: "default",
        });

        onSubmit(response.results.data);
        setShowConfirmationModal(false);
        onClose();
      } else {
        throw new Error(response.message || "Une erreur est survenue");
      }
    } catch (error: unknown) {
      console.error("Erreur:", error);
      const errorMessage = error instanceof Error ? error.message : 'Une erreur inconnue est survenue';
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
                  {initialData ? "Modifier le type" : "Ajouter un nouveau type de rapport"}
                </CardTitle>
                <CardDescription>
                  Créez ou modifiez un type pour organiser vos rapports.
                </CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-6">
              <h3 className="text-xl font-semibold">Informations sur le type de rapport</h3>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Titre du type</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Ex: Stock, Prévisions, Opérations..."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    placeholder="Ex: Vue d'ensemble complète des niveaux et valeurs actuels du stock."
                  />
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
                Êtes-vous sûr de vouloir {initialData ? "modifier" : "ajouter"} ce type ?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-4">
                {/* Affichage conditionnel du ID */}
                {formData.id && <p><strong>ID:</strong> {formData.id}</p>}
                <p><strong>Titre:</strong> {formData.name}</p>
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