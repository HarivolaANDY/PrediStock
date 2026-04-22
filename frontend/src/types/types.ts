import { dataTagSymbol } from "@tanstack/react-query";

export interface PanierItem {
  id?: number;
  designation: string;
  nombre: number;
  quantite: number;
  ref?: string
};

export interface ProduitInserer {
  id_produit: number;
  panier: PanierItem[];
};
export interface PDVData {
  designation : string;
  quantite : number;
  product : number;
};
//Utilisateur
export interface CreateUserData {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    role: string;
    department: string;
    location?: string;
    biography?: string;
    status?: string;
    permissions?: string[];
    sendInvite?: boolean;
    temporaryPassword: boolean;
    password: string ;
}

export interface UpdateUserData {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    role?: string;
    department?: string;
    location?: string;
    biography?: string;
    status?: string;
    permissions?: string[];
    password?: string;
}

export interface DisableUser {
    UserId: string;
}



export interface UserResponse {
    user?: any;
    token?: string;
    success: boolean;
    message: string;
    data?: {
        userId: string;
        userRole: string;
    }
}

//Sous-catégorie
export interface SubCategory {
  id?: string;
  name: string;
  description?: string;
}

//categorie
export interface Category {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  product_count: number;
  created_at: string;
  updated_at: string;
  subcategories?: SubCategory[];
}

export interface CategoryCreateData {
  id?: string;
  name: string;
  description?: string;
  is_active?: boolean;
  subcategories?: SubCategory[];
}
export interface ApiResponse<T> {
  data?: T;
  count?: number;
  next: string | null;
  message?:string;
  previous: string | null;
  results: {
    success: boolean;
    data: T;
  };
  errors?: any;

}

//Produit
export interface DetailsResponseproduit{
  results? : any
}

export interface CategoryCreateData {
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface CategoryResponse {
    success: boolean;
    message: string;
    data?: {
        id: string;
        name: string;
        description: string;
    }
}



//Produit
export interface CreateProductData {
  id?: number; // A effacer si cela cause un bug
    name: string;
    description: string;
    stock_threshold: number;
    category: string;
    url?: string;
    supplier?: string;
    price: number;
    currency: string;
    sku: string;
    current_stock: number;
    is_active?: boolean;
    unite_mesure: string;
    est_perissable: boolean;
    image?: File | null;
}

export interface Product {
  id: number
  product_img: string | null
  name: string
  sku: string
  description: string
  price: string
  stock_threshold: number
  current_stock: number
  unite_mesure: string
  is_active: boolean
  created_at: string
  updated_at: string
  category: number | null
  supplier: number | null
  suppliers?: { id: string; name: string }[]
}

export interface ProductResponse {
    success: boolean;
    message: string;
    data?: {
        id: string;
        name: string;
        email: string;
        phone: string;
        address: string;
        lead_time: number;
        min_order_quantity: number;
        max_order_quantity: number;
        is_active: boolean;
        created_at: string;
    }
}

export interface SupplierResponse {
    success: boolean;
    message: string;
    data?: Supplier | Supplier[]; // Modifié pour accepter un fournisseur ou un tableau
}

export interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  lead_time: number;
  min_order_quantity: number;
  max_order_quantity: number;
  created_at: string;
  is_active: boolean;
  products?: { id: number; name: string; sku: string; unite_mesure: string }[];  // ← ajouter
}

export interface SupplierFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  leadTime: number;
  minOrderQuantity: number;
  maxOrderQuantity: number;
  isActive: boolean;
  products?: string;   // ← ajouter
}

export interface CreateSupplierData extends SupplierFormData {}