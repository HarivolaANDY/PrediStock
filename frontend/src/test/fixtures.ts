import type {
  BonCommande,
  DonneeVente,
  Fournisseur,
  MouvementStock,
  ProduitRecherche,
  Remboursement,
} from "@/types/achatVente";

// Dates à midi UTC : évite tout décalage de jour selon le fuseau de la machine.
export const iso = (d: string) => `${d}T12:00:00.000Z`;

export const fournisseurs: Fournisseur[] = [
  { id: 1, name: "Fournisseur Alpha", is_active: true },
  { id: 2, name: "Fournisseur Beta", is_active: true },
];

export const produits: ProduitRecherche[] = [
  { id: 10, name: "Riz 25kg", price: 50000, stock: 100, is_deriv: false, parent_id: null, parent_name: null, supplier: 1, supplier_ids: [1] },
  { id: 11, name: "Riz 5kg", price: 11000, stock: 20, is_deriv: true, parent_id: 10, parent_name: "Riz 25kg", supplier: 1, supplier_ids: [1] },
  { id: 20, name: "Huile 1L", price: 7000, stock: 0, is_deriv: false, parent_id: null, parent_name: null, supplier: 2, supplier_ids: [2] },
  { id: 30, name: "Sucre 1kg", price: 4000, stock: 5, is_deriv: false, parent_id: null, parent_name: null, supplier: 2, supplier_ids: [2] },
];

export function makeCommande(over: Partial<BonCommande> = {}): BonCommande {
  return {
    id: 1,
    fournisseur: 1,
    fournisseur_name: "Fournisseur Alpha",
    utilisateur: 1,
    numero_commande: "BC-001",
    status: "En attente",
    statut_paiement: "Non payé",
    mode_paiement: "Espèces",
    montant_total: 100000,
    montant_paye: 0,
    date_commande: iso("2025-03-10"),
    livraison_prevue: null,
    livraison_actuelle: null,
    lignes: [
      { id: 1, bon_commande: 1, produit: 10, product_name: "Riz 25kg", quantite: 2, prix_unitaire: 50000, montant_ligne: 100000 },
    ],
    creer_le: iso("2025-03-10"),
    update_at: iso("2025-03-10"),
    ...over,
  };
}

export function makeVente(over: Partial<DonneeVente> = {}): DonneeVente {
  return {
    id: 1,
    utilisateur: 1,
    utilisateur_name: "andy",
    numero_vente: "VT-001",
    montant_total: "70000",
    montant_paye: "0",
    remise_globale: "0",
    statut_paiement: "Non payé",
    mode_paiement: "Espèces",
    segment_clientele: "Particulier",
    status: "En attente",
    type_vente: "Normal",
    date_vente: iso("2025-03-12"),
    delai_paiement: null,
    lignes: [
      { id: 1, donnee_vente: 1, produit: 20, produit_name: "Huile 1L", quantite: 10, prix_unitaire: "7000", remise_applique: "0", montant_ligne: 70000 },
    ],
    creer_le: iso("2025-03-12"),
    update_at: iso("2025-03-12"),
    ...over,
  };
}

export function makeRemboursement(over: Partial<Remboursement> = {}): Remboursement {
  return {
    id: 1,
    source_type: "Achat",
    source_id: 1,
    numero_transaction: "BC-001",
    produit: null,
    quantite: 0,
    montant: 100000,
    raison: "Commande annulée après paiement",
    date_remboursement: iso("2025-03-15"),
    statut_reglement: "Non réglé",
    notes: null,
    ...over,
  };
}

export function makeMouvement(over: Partial<MouvementStock> = {}): MouvementStock {
  return {
    id: 1,
    produit: 10,
    produit_name: "Riz 25kg",
    produit_dv: null,
    utilisateur: 1,
    quantity: 5,
    movement_type: "IN",
    unit_price: "50000",
    reason: "Livraison bon de commande",
    notes: null,
    referrence: "BC-001",
    date: null,
    timestamp: iso("2025-03-11"),
    ...over,
  };
}
