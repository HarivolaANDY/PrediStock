// ─── Achats & Ventes — TypeScript Types ──────────────────────────────────────

export interface Fournisseur {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  lead_time?: number;
  min_order_quantity?: number;
  max_order_quantity?: number;
  is_active: boolean;
}

export type BonCommandeStatus = 'En attente' | 'Confirmé' | 'Livré' | 'Annulé';

export interface LigneCommande {
  id: number;
  bon_commande: number | null;
  produit: number | null;
  product_name?: string;
  recommandation?: number | null;
  quantite: number;
  prix_unitaire: number;
  montant_ligne: number;
}

export interface BonCommande {
  id: number;
  fournisseur: number | null;
  fournisseur_name?: string;
  utilisateur: number | null;
  utilisateur_name?: string;
  numero_commande: string;
  status: BonCommandeStatus;
  montant_total: number;
  date_commande: string;
  livraison_prevue: string | null;
  livraison_actuelle: string | null;
  lignes: LigneCommande[];
  creer_le: string;
  update_at: string;
}

export interface CreateLigneData {
  produit: number | null;
  quantite: number;
  prix_unitaire: number;
}

export interface CreateBonCommandeData {
  fournisseur: number | null;
  utilisateur: number | null;
  numero_commande?: string;
  status?: BonCommandeStatus;
  livraison_prevue?: string | null;
  lignes_data?: CreateLigneData[];
}

export interface LigneVente {
  id: number;
  donnee_vente: number | null;
  produit: number | null;
  produit_name?: string;
  quantite: number;
  prix_unitaire: string;
  remise_applique: string;
  montant_ligne: number;
}

export interface DonneeVente {
  id: number;
  utilisateur: number | null;
  utilisateur_name?: string;
  numero_vente: string | null;
  montant_total: string;
  remise_globale: string;
  canal_vente: string;
  segment_clientele: string;
  date_vente: string;
  lignes: LigneVente[];
  creer_le: string;
  update_at: string;
}

export interface CreateLigneVenteData {
  produit: number | null;
  quantite: number;
  prix_unitaire: number;
  remise_applique?: number;
}

export interface CreateDonneeVenteData {
  utilisateur: number | null;
  numero_vente?: string;
  canal_vente?: string;
  segment_clientele?: string;
  lignes_data?: CreateLigneVenteData[];
}

export interface ProduitRenvoie {
  id: number;
  produit: number | null;
  produit_name?: string;
  quantite_retourner: number;
  raison_retour: string;
  condition_retour: string;
  montant_remise: number | null;
  est_reapprovisionnnable: boolean;
  notes: string | null;
  date_retour: string;
  creer_le: string;
}

export type RecommandationPriority = 'HAUTE' | 'MOYENNE' | 'BASSE';

export interface Recommandation {
  id: number;
  product: number | null;
  product_details: { name: string; current_stock: number } | null;
  date_prediction: string | null;
  type_recommandation: string;
  quantite_suggeree: number;
  prix_estime: number;
  priority: RecommandationPriority;
  raisonnement: string;
  est_applique: boolean;
  creer_le: string;
  appliquee_le: string | null;
}

export type MouvementType = 'IN' | 'OUT' | 'ADJUSTMENT' | 'RETURN' | 'SCRAP' | 'ALLOCATION';

export interface MouvementStock {
  id: number;
  produit: number | null;
  produit_name?: string;
  produit_dv: number | null;
  utilisateur: number | null;
  quantity: number;
  movement_type: MouvementType;
  unit_price: string | null;
  reason: string | null;
  notes: string | null;
  referrence: string | null;
  date: string | null;
  timestamp: string;
}

export interface AnalyticsData {
  total_purchases: number;
  total_sales: number;
  margin: number;
  purchase_count: number;
  sale_count: number;
}

export interface PaginatedResponse<T> {
  count: number;
  results: T[];
  next: string | null;
  previous: string | null;
}
