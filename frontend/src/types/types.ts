export interface PanierItem {
  id?: number;
  designation: string;
  nombre: number;   // Poids (kg) ou quantité standard
  quantite: number; // Dupliqué de nombre pour compatibilité backend
  ref?: string;
  is_direct?: boolean;
};

export interface ProduitInserer {
  id_produit: number;
  panier: PanierItem[];
};

export interface PDV {
  id: number;
  designation: string;
  nombre: number;
  date_creation: string;
  product?: number;
  infos?: {
    id: number;
    name: string;
    category: number | null;
    unite_mesure: string;
  };
}
export interface PDVData {
  designation : string;
  product : number;
};

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
    temporaryPassword?: boolean;
    password?: string;
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
    avatar?: File | string | null;
}

export interface DisableUser {
    UserId: string;
}

export interface User {
    id: number | string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    role: string;
    department: string;
    location?: string;
    biography?: string;
    status: string;
    permissions: string[] | string;
    last_login?: string;
    date_joined?: string;
    updated_at?: string;
    name?: string;
    avatar?: string;
}

export interface UserResponse {
    user?: User;
    token?: string;
    success: boolean;
    message: string;
    data?: {
        userId: string;
        userRole: string;
    }
}

export interface SubCategory {
  id?: string;
  name: string;
  description?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  product_count: number;
  created_at: string;
  updated_at: string;
  subcategories?: SubCategory[];
  image?: string;
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
  message?: string;
  previous: string | null;
  results: {
    success: boolean;
    data: T;
  };
  errors?: unknown;
}

export interface DetailsResponseproduit {
  success: boolean;
  message: string;
  data: unknown;
}

export interface Product {
  id: number;
  product_img: string | null;
  name: string;
  sku: string;
  description: string;
  price: string;
  stock_threshold: number;
  current_stock: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category: number | null;
  supplier: number | null;
  unite_mesure: string;
  suppliers?: { id: string; name: string }[];
}

export interface CriticalProduct {
  id: number | string;
  name: string;
  stock: number;
  current_stock: number;
  critical: number;
  stock_threshold: number;
  status: 'critical' | 'warning' | 'low' | 'ok' | 'good';
  days: number;
  product_img?: string | null;
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

export interface CreateProductData {
  id?: number;
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
  // ✅ Champs pour la recherche combinée produits + dérivées
  is_deriv?: boolean;
  parent_id?: number;
  parent_name?: string;
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
    data?: Supplier | Supplier[];
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
  created_at: string | null;
  is_active: boolean;
  products?: { id: number; name: string; sku: string; unite_mesure: string }[];
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
  products?: string;
}

export type CreateSupplierData = SupplierFormData;

export interface StockMouvement {
  id: number;
  produit: number;
  product?: number;
  product_name?: string;
  produit_nom?: string;
  produit_dv?: number;
  product_details?: {
    designation?: string;
    name?: string;
    nom?: string;
  };
  utilisateur: number;
  utilisateur_info?: {
    first_name: string;
    last_name: string;
    username: string;
  };
  utilisateur_nom?: {
    first_name: string;
    last_name: string;
  };
  quantity: number;
  movement_type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'RETURN' | 'SCRAP';
  unit_price: string | number;
  reason: string;
  notes: string;
  reference: string;
  date: string;
  timestamp: string;
}

export interface InventaireItem {
  id: number;
  produit: number;
  produit_info?: {
    designation: string;
    product_mere?: {
      name: string;
    };
  };
  historique: number;
  quantite_theo: number;
  quantite_phy: number;
  ecart: number;
}

export interface HistoriqueInventaire {
  id: number;
  date: string;
  utilisateur: number;
  etat: boolean;
  description: string;
  items?: InventaireItem[];
}

export interface HistoriqueSeuilStock {
  id: number;
  produit: number;
  utilisateur: number;
  ancien_seuil: number;
  nouveau_seuil: number;
  raison: string;
  changer_le: string;
}

export interface StockTrendPoint {
  date?: string;
  periode?: string;
  total_stock?: number;
  quantite?: number;
  valeur?: number;
}

export interface Prediction {
  id: number;
  product: number;
  product_name?: string;
  date_prediction: string;
  import_qty: number;
  import_lower_bound: number | null;
  import_upper_bound: number | null;
  export_qty: number;
  export_lower_bound: number | null;
  export_upper_bound: number | null;
  stock_prevu: number;
  rupture: boolean;
  horizon: number;
  modele_utilise: string;
  creer_le: string;
}

export interface Recommendation {
  id: number;
  product: number;
  date_prediction: string;
  type_recommandation: string;
  quantite_suggeree: number;
  prix_estime: number;
  priority: string;
  raisonnement: string;
  est_applique: boolean;
  creer_le: string;
  appliquee_le: string;
  product_details?: {
    name: string;
    current_stock: number;
  };
}

export interface ChartDataPoint {
  [key: string]: string | number | boolean | null | undefined | unknown;
}

export interface ProductStats {
  total_produits: number;
  total_stock: number;
  total_stock_faible: number;
  total_stock_critique: number;
  total_stock_rupture: number;
  valeur_totale_stock: number;
}

export interface DashboardStats extends ProductStats {
  mouvements_recents: StockMouvement[];
  predictions_futures?: Prediction[];
  recommandations_actives?: Recommendation[];
}

export type PermissionType =
  | 'dashboard_view'
  | 'inventory_view'
  | 'inventory_edit'
  | 'inventory_import'
  | 'forecasting_view'
  | 'forecasting_edit'
  | 'reports_generate'
  | 'reports_view'
  | 'user_management'
  | 'role_management'
  | 'system_settings'
  | 'audit_logs'
  | 'data_management'
  | 'data_import'
  | 'models_view'
  | 'models_configure';

export interface Role {
  id: number | string;
  name: string;
  description: string;
  prioritylevel: number;
  is_active: boolean;
  dashboard_analytics: string | string[];
  inventory_management: string | string[];
  user_management: string | string[];
  ai_datamodels: string | string[];
  created_at: string;
  updated_at: string;
  permissions?: string[];
}