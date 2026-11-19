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

export type BonCommandeStatus = 'En attente' | 'Livré' | 'Annulé';

/** Une ligne de l'historique des paiements d'un achat ou d'une vente (lecture seule). */
export interface TransactionPaiement {
  id: number;
  montant: number | string;
  mode_paiement: string;
  date_paiement: string;
  notes: string;
}

/** Corps de POST .../payer/ : un versement (paiement partiel possible). */
export interface PaiementData {
  montant: number;
  mode_paiement?: string;
  notes?: string;
}

export interface LigneCommande {
  id: number;
  bon_commande: number | null;
  produit: number | null;
  product_name?: string;
  quantite: number;
  prix_unitaire: number;
  montant_ligne: number;
  /** Numéro du lot créé à la livraison de la ligne (null tant qu'elle n'est pas livrée). */
  lot_numero?: string | null;
}

export interface BonCommande {
  id: number;
  fournisseur: number | null;
  fournisseur_name?: string;
  utilisateur: number | null;
  utilisateur_name?: string;
  numero_commande: string;
  status: BonCommandeStatus;
  statut_paiement: string;
  mode_paiement: string;
  montant_total: number;
  montant_paye: number;
  date_commande: string;
  livraison_prevue: string | null;
  livraison_actuelle: string | null;
  lignes: LigneCommande[];
  creer_le: string;
  update_at: string;
  /** false si la commande a laissé des traces (paiement, livraison, remboursement) : on l'annule au lieu de la supprimer. */
  supprimable?: boolean;
  /** Historique des paiements, du plus ancien au plus récent. */
  paiements?: TransactionPaiement[];
}

export interface CreateLigneData {
  produit: number | null;
  produit_dv?: number | null;
  quantite: number;
  prix_unitaire: number;
}

export interface CreateBonCommandeData {
  fournisseur: number | null;
  utilisateur: number | null;
  numero_commande?: string;
  status?: BonCommandeStatus;
  statut_paiement?: string;
  montant_paye?: number;
  mode_paiement?: string;
  date_commande?: string;
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
  montant_paye: string;
  remise_globale: string;
  statut_paiement: string;
  mode_paiement: string;
  segment_clientele: string;
  status: string;
  type_vente: string;
  date_vente: string;
  delai_paiement: string | null;
  lignes: LigneVente[];
  creer_le: string;
  update_at: string;
  /** false si la vente a laissé des traces (paiement, livraison, remboursement) : on l'annule au lieu de la supprimer. */
  supprimable?: boolean;
  /** Historique des paiements, du plus ancien au plus récent. */
  paiements?: TransactionPaiement[];
}

export interface CreateLigneVenteData {
  produit: number | null;
  produit_dv?: number | null;
  quantite: number;
  prix_unitaire: number;
  remise_applique?: number;
}

export interface CreateDonneeVenteData {
  utilisateur: number | null;
  numero_vente?: string;
  segment_clientele?: string;
  mode_paiement?: string;
  statut_paiement?: string;
  montant_paye?: number | string;
  status?: string;
  type_vente?: string;
  delai_paiement?: string | null;
  lignes_data?: CreateLigneVenteData[];
}

export interface Remboursement {
  id: number;
  source_type: 'Achat' | 'Vente' | 'Retour';
  source_id: number | null;
  numero_transaction: string;
  produit: number | null;
  produit_name?: string;
  quantite: number;
  montant: number;
  raison: string;
  date_remboursement: string;
  statut_reglement: 'Réglé' | 'Non réglé';
  notes: string | null;
}


export type MouvementType = 'IN' | 'OUT' | 'ADJUSTMENT' | 'RETURN' | 'SCRAP' | 'ALLOCATION';

export interface MouvementStock {
  id: number;
  produit: number | null;
  produit_name?: string;
  produit_display_name?: string;
  produit_dv: number | null;
  produit_dv_name?: string;
  utilisateur: number | null;
  quantity: number;
  movement_type: MouvementType;
  unit_price: string | null;
  reason: string | null;
  notes: string | null;
  referrence: string | null;
  date: string | null;
  timestamp: string;
  /** Id du mouvement d'origine, renseigné uniquement sur un mouvement d'ANNULATION (inverse). */
  annule?: number | null;
  /** Id du mouvement inverse qui annule celui-ci, renseigné uniquement sur un mouvement annulé. */
  annule_par?: number | null;
  /** Numéro du lot de la livraison à l'origine du mouvement (null s'il n'en a pas). */
  lot_numero?: string | null;
}

export interface AnalyticsData {
  total_purchases: number;
  total_sales: number;
  margin: number;
  purchase_count: number;
  sale_count: number;
}

// Résultat de la recherche combinée produits + sous-produits (dérivées)
// utilisée dans les formulaires d'achat/vente — endpoint POST /catalogue/products/
export interface ProduitRecherche {
  id: number;
  name: string;
  sku?: string;
  price: number;
  stock: number;
  is_deriv: boolean;
  parent_id: number | null;
  parent_name: string | null;
  supplier: number | null;
  supplier_ids: number[];
}

export interface PaginatedResponse<T> {
  count: number;
  results: T[];
  next: string | null;
  previous: string | null;
}
