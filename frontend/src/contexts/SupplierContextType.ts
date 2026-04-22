import { createContext } from "react"
import { CreateSupplierData, Supplier } from "@/types/types"

export interface SupplierContextType {
  createSupplier: (supplierData: CreateSupplierData) => Promise<boolean>
  updateSupplier: (supplierId: string, supplierData: CreateSupplierData) => Promise<boolean>
  getAllSuppliers: () => Promise<Supplier[]>
  isLoading: boolean
}

export const SupplierContext = createContext<SupplierContextType | undefined>(undefined)
