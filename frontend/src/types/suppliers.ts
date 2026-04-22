export interface SupplierLike {
    id: string;
    name: string;
    email: string;
    phone: string;
    leadTime: number;
    minOrderQuantity: number;
    maxOrderQuantity: number;
    isActive: boolean;
    createdAt: string | null;
}