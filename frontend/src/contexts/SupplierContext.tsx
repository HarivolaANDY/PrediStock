import { useState, useCallback } from "react"
import { SupplierService } from "@/services/api"
import { CreateSupplierData, Supplier } from "@/types/types"
import { useToast } from "@/components/ui/use-toast"
import { SupplierContext } from "./SupplierContextType"

export function SupplierProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const createSupplier = useCallback(async (supplierData: CreateSupplierData): Promise<boolean> => {
    setIsLoading(true)
    try {
        console.log("Donnée auth"+supplierData)
      const response = await SupplierService.createSupplier(supplierData)

      if (response.success) {
        toast({
          title: "Fournisseur créé avec succès",
          description: "Le nouveau fournisseur a été ajouté avec succès."
        })
        setIsLoading(false)
        return true
      } else {
        toast({
          variant: 'destructive',
          title: 'Échec de la création du fournisseur',
          description: response.message || "Une erreur s'est produite lors de la création du fournisseur."
        })
        setIsLoading(false)
        return false
      }
    } catch (error) {
      console.error("Erreur lors de la création du fournisseur:", error)
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: "Une erreur s'est produite lors de la création du fournisseur."
      })
      setIsLoading(false)
      return false
    }
  }, [toast])

  const updateSupplier = useCallback(async (supplierId: string, supplierData: CreateSupplierData): Promise<boolean> => {
    setIsLoading(true)
    try {
      const response = await SupplierService.updateSupplier(supplierId, supplierData)
      setIsLoading(false)
      
      if (response.success) {
        toast({
          title: "Succès",
          description: "Fournisseur mis à jour avec succès"
        })
        return true
      }
      
      toast({
        variant: "destructive",
        title: "Erreur",
        description: response.message || "Erreur lors de la mise à jour"
      })
      return false
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error)
      setIsLoading(false)
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue lors de la mise à jour"
      })
      return false
    }
  }, [toast])

  const getAllSuppliers = useCallback(async (): Promise<Supplier[]> => {
    setIsLoading(true)
    try {
      const response = await SupplierService.getAllSuppliers()
      console.log("DATA API:", response.data)
      console.log('Réponse brute suppliers:', JSON.stringify(response, null, 2)) // ← ajoute
      setIsLoading(false)
      if (response.success && Array.isArray(response.data)) {
        return response.data as Supplier[]
      }
      return []
    } catch (error) {
      console.error("Erreur lors de la récupération des fournisseurs:", error)
      setIsLoading(false)
      return []
    }
  }, [])

  return (
    <SupplierContext.Provider value={{ createSupplier, updateSupplier, getAllSuppliers, isLoading }}>
      {children}
    </SupplierContext.Provider>
  )
}