/**
 * Outils partagés des tests d'intégration du module Achats & Ventes :
 *   • un faux backend en mémoire qui reproduit les effets métier des signaux Django
 *     (livraison → mouvement de stock, annulation d'une transaction payée → remboursement) ;
 *   • l'application de test (vraie sidebar + vrais écrans + QueryClient partagé) ;
 *   • quelques aides de navigation (menu, écrans, actions de ligne).
 *
 * ⚠ Les `vi.mock(...)` (service, sonner, recharts, formulaires) doivent rester DANS chaque fichier de
 * test : Vitest les hisse en tête de fichier et ils s'appliquent ensuite à ce module.
 */
import { vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type {
  BonCommande,
  DonneeVente,
  MouvementStock,
  Remboursement,
} from "@/types/achatVente";
import * as svc from "@/services/achatVenteService";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import AchatPage from "@/pages/achat-vente/AchatPage";
import VentePage from "@/pages/achat-vente/VentePage";
import RetoursPage from "@/pages/achat-vente/RetoursPage";
import AnalysePage from "@/pages/achat-vente/AnalysePage";
import MouvementsPage from "@/pages/achat-vente/MouvementsPage";
import { rowOf } from "@/test/helpers";
import { fournisseurs, makeCommande, makeMouvement, makeRemboursement, makeVente, produits } from "@/test/fixtures";

export const api = vi.mocked(svc);

// ─── Faux backend en mémoire ────────────────────────────────────────────────────────────────
export const db = {
  commandes: [] as BonCommande[],
  ventes: [] as DonneeVente[],
  mouvements: [] as MouvementStock[],
  rembs: [] as Remboursement[],
  seq: { cmd: 0, vte: 0, mvt: 0, rmb: 0, tick: 0, pay: 0 },
};
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
export const now = () => new Date(Date.UTC(2025, 2, 1, 12, 0, 0) + ++db.seq.tick * 60_000).toISOString();
export const ref = (prefix: string, n: number) => `${prefix}-${String(n).padStart(3, "0")}`;
const findProduit = (p: number | null, dv?: number | null) =>
  produits.find((x) => (dv ? x.is_deriv && x.id === dv : !x.is_deriv && x.id === p));

/** Mouvement inverse d'un mouvement effectif portant cette référence (IN ↔ OUT), lié via `annule`. */
function contrePasser(numero: string, motif: string) {
  db.mouvements
    .filter((m) => m.referrence === numero && m.annule == null && m.annule_par == null)
    .forEach((original) => {
      const inverse = makeMouvement({
        id: ++db.seq.mvt, movement_type: original.movement_type === "IN" ? "OUT" : "IN",
        produit_name: original.produit_name, quantity: original.quantity, reason: motif,
        referrence: original.referrence, annule: original.id, timestamp: now(),
      });
      original.annule_par = inverse.id;
      db.mouvements.push(inverse);
    });
}

export function installFakeBackend() {
  db.commandes = []; db.ventes = []; db.mouvements = []; db.rembs = [];
  db.seq = { cmd: 0, vte: 0, mvt: 0, rmb: 0, tick: 0, pay: 0 };

  api.getFournisseurs.mockResolvedValue(fournisseurs);
  api.searchProduits.mockImplementation(async () => clone(produits));
  api.getAnalytics.mockResolvedValue({ total_purchases: 0, total_sales: 0, margin: 0, purchase_count: 0, sale_count: 0 });

  api.getBonCommandes.mockImplementation(async (params) =>
    clone(db.commandes.filter((c) => !params?.status || c.status === params.status)));
  api.getBonCommande.mockImplementation(async (id) => clone(db.commandes.find((c) => c.id === id)!));
  api.createBonCommande.mockImplementation(async (data) => {
    const id = ++db.seq.cmd;
    const lignes = (data.lignes_data ?? []).map((l, i) => ({
      id: id * 100 + i, bon_commande: id, produit: l.produit, product_name: findProduit(l.produit, l.produit_dv)?.name,
      quantite: l.quantite, prix_unitaire: l.prix_unitaire, montant_ligne: l.quantite * l.prix_unitaire,
    }));
    const c = makeCommande({
      id, numero_commande: ref("BC", id), fournisseur: data.fournisseur,
      fournisseur_name: fournisseurs.find((f) => f.id === data.fournisseur)?.name,
      status: "En attente", statut_paiement: "Non payé", montant_paye: 0,
      montant_total: lignes.reduce((s, l) => s + l.montant_ligne, 0), lignes, creer_le: now(),
    });
    db.commandes.push(c);
    return clone(c);
  });
  api.updateBonCommande.mockImplementation(async (id, data) => {
    const c = db.commandes.find((x) => x.id === id)!;
    const was = c.status;
    Object.assign(c, data);
    if (data.status === "Livré" && was !== "Livré") {
      c.lignes.forEach((l) => db.mouvements.push(makeMouvement({
        id: ++db.seq.mvt, movement_type: "IN", produit_name: l.product_name, quantity: l.quantite,
        reason: "Livraison bon de commande", referrence: c.numero_commande, timestamp: now(),
      })));
    }
    // Règle du vrai backend (signals.py) : un achat livré puis annulé conserve son mouvement et
    // ajoute un mouvement INVERSE lié à l'original (historique conservé, stock restitué).
    if (data.status === "Annulé" && was === "Livré") contrePasser(c.numero_commande, "Annulation de la livraison BC " + c.numero_commande);
    // Règle du vrai backend (signals.py) : remboursement dès qu'un paiement a eu lieu, même partiel.
    if (data.status === "Annulé" && Number(c.montant_paye) > 0) {
      db.rembs.push(makeRemboursement({
        id: ++db.seq.rmb, source_type: "Achat", source_id: c.id, numero_transaction: c.numero_commande,
        montant: c.montant_paye, statut_reglement: "Non réglé", raison: "Commande annulée après paiement", date_remboursement: now(),
      }));
    }
    return clone(c);
  });

  api.getDonneeVentes.mockImplementation(async (params) =>
    clone(db.ventes.filter((v) => !params?.status || v.status === params.status)));
  api.getDonneeVente.mockImplementation(async (id) => clone(db.ventes.find((v) => v.id === id)!));
  api.createDonneeVente.mockImplementation(async (data) => {
    const id = ++db.seq.vte;
    const lignes = (data.lignes_data ?? []).map((l, i) => ({
      id: id * 100 + i, donnee_vente: id, produit: l.produit, produit_name: findProduit(l.produit, l.produit_dv)?.name,
      quantite: l.quantite, prix_unitaire: String(l.prix_unitaire), remise_applique: String(l.remise_applique ?? 0),
      montant_ligne: l.quantite * l.prix_unitaire - (l.remise_applique ?? 0),
    }));
    const v = makeVente({
      id, numero_vente: ref("VT", id), status: "En attente", statut_paiement: "Non payé", montant_paye: "0",
      type_vente: data.type_vente ?? "Normal", segment_clientele: data.segment_clientele ?? "Particulier",
      delai_paiement: data.delai_paiement ?? null,
      montant_total: String(lignes.reduce((s, l) => s + l.montant_ligne, 0)), lignes, date_vente: now(),
    });
    db.ventes.push(v);
    return clone(v);
  });
  api.updateDonneeVente.mockImplementation(async (id, data) => {
    const v = db.ventes.find((x) => x.id === id)!;
    const was = v.status;
    Object.assign(v, data);
    if (data.status === "Livré" && was !== "Livré") {
      v.lignes.forEach((l) => db.mouvements.push(makeMouvement({
        id: ++db.seq.mvt, movement_type: "OUT", produit_name: l.produit_name, quantity: l.quantite,
        reason: "Vente", referrence: v.numero_vente, notes: v.type_vente === "Crédit" ? "Crédit" : null, timestamp: now(),
      })));
    }
    if (data.status === "Annulé" && was === "Livré") contrePasser(v.numero_vente ?? "", "Annulation vente " + v.numero_vente);
    if (data.status === "Annulé" && Number(v.montant_paye) > 0) {
      db.rembs.push(makeRemboursement({
        id: ++db.seq.rmb, source_type: "Vente", source_id: v.id, numero_transaction: v.numero_vente ?? "",
        montant: Number(v.montant_paye), statut_reglement: "Non réglé", raison: "Vente annulée après paiement", date_remboursement: now(),
      }));
    }
    return clone(v);
  });

  // Enregistrement d'un versement, comme le fait le backend (POST .../payer/)
  const appliquerVersement = (doc: BonCommande | DonneeVente, data: { montant: number; mode_paiement?: string; notes?: string }) => {
    const reste = Number(doc.montant_total) - Number(doc.montant_paye);
    if (data.montant > reste) throw new Error(`Le montant dépasse le reste à payer (${reste} Ar).`);
    const paye = Number(doc.montant_paye) + data.montant;
    doc.montant_paye = (typeof doc.montant_paye === "string" ? String(paye) : paye) as never;
    doc.statut_paiement = paye >= Number(doc.montant_total) ? "Payé" : "Partiel";
    if (data.mode_paiement) doc.mode_paiement = data.mode_paiement;
    doc.paiements = [...(doc.paiements ?? []), {
      id: ++db.seq.pay, montant: data.montant, mode_paiement: doc.mode_paiement, date_paiement: now(), notes: data.notes ?? "",
    }];
  };
  api.payerBonCommande.mockImplementation(async (id, data) => {
    const c = db.commandes.find((x) => x.id === id)!;
    appliquerVersement(c, data);
    return clone(c);
  });
  api.payerDonneeVente.mockImplementation(async (id, data) => {
    const v = db.ventes.find((x) => x.id === id)!;
    appliquerVersement(v, data);
    return clone(v);
  });

  api.getRemboursements.mockImplementation(async () => clone(db.rembs));
  api.updateRemboursement.mockImplementation(async (id, data) => {
    const r = db.rembs.find((x) => x.id === id)!;
    Object.assign(r, data);
    return clone(r);
  });
  api.getMouvements.mockImplementation(async (params) =>
    clone(db.mouvements.filter((m) => !params?.movement_type || m.movement_type === params.movement_type)));
}

// ─── Application de test : vraie sidebar + vrais écrans + QueryClient partagé ──────────────────
export function renderModule(initialPath = "/buy-sell/achats") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); // défauts de prod (App.tsx)
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialPath]}>
        <SidebarProvider>
          <AppSidebar />
          <main>
            <Routes>
              <Route path="/buy-sell/achats" element={<AchatPage />} />
              <Route path="/buy-sell/ventes" element={<VentePage />} />
              <Route path="/buy-sell/retours" element={<RetoursPage />} />
              <Route path="/buy-sell/analyse" element={<AnalysePage />} />
              <Route path="/buy-sell/mouvements" element={<MouvementsPage />} />
            </Routes>
          </main>
        </SidebarProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return client;
}

export const SCREENS = [
  { link: "Achats", heading: "Achats" },
  { link: "Ventes", heading: "Ventes" },
  { link: "Remboursements", heading: "Remboursements" },
  { link: "Analyse", heading: "Analyse Financière" },
  { link: "Transactions", heading: "Transactions Achats & Ventes" },
] as const;

export const user = () => userEvent.setup();
/** Carte KPI de l'écran courant (la sidebar contient aussi des libellés comme « Remboursements »). */
export const kpiCard = (label: string): HTMLElement =>
  within(document.querySelector("main") as HTMLElement).getByText(label).closest(".rounded-2xl") as HTMLElement;
export const heading = (name: string) => screen.findByRole("heading", { level: 1, name });

export async function openModuleMenu() {
  await user().click(screen.getByRole("button", { name: /Achats & Ventes/ }));
}
export async function goTo(screen_: (typeof SCREENS)[number]["link"]) {
  const target = SCREENS.find((s) => s.link === screen_)!;
  await user().click(screen.getByRole("link", { name: target.link }));
  await heading(target.heading);
}
export async function rowAction(refText: string, action: RegExp) {
  const buttons = within(rowOf(refText)).getAllByRole("button");
  await user().click(buttons[buttons.length - 1]);
  await user().click(await screen.findByRole("menuitem", { name: action }));
}
