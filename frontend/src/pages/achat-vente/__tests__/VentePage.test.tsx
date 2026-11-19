/**
 * MISSION 2 — Gestion des ventes (VentePage.tsx)
 *
 * Mémoire §3.2 — problèmes traités :
 *   • règle métier de la vente à crédit (segment VIP/Fidélisé + délai de paiement),
 *     vérifiée AVANT tout appel réseau
 *   • produits en rupture de stock : option désactivée + contrôle quantité ≤ stock
 *   • ventes déjà remboursées exclues de la liste
 * Fonctionnalités attendues :
 *   • liste + filtres de statut + recherche par n° de vente
 *   • création (segment, type direct/crédit, lignes avec quantité/prix/remise)
 *   • indicateurs dont « Ventes à crédit » et « Reste à recouvrer »
 *   • changement de statut encadré (vente finalisée ou délai dépassé = non modifiable)
 * Limite connue du mémoire : l'état « Partiel » n'a pas de traitement visuel distinct.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CreateDonneeVenteData, DonneeVente } from "@/types/achatVente";

vi.mock("@/services/achatVenteService", () => ({
  getDonneeVentes: vi.fn(),
  createDonneeVente: vi.fn(),
  updateDonneeVente: vi.fn(),
  deleteDonneeVente: vi.fn(),
  searchProduits: vi.fn(),
  getRemboursements: vi.fn(),
  payerDonneeVente: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import * as svc from "@/services/achatVenteService";
import { toast } from "sonner";
import VentePage from "../VentePage";
import { renderWithProviders, loginAs } from "@/test/renderWithProviders";
import { fieldByLabel, fieldsByLabel, hasText, kpiCard, rowOf } from "@/test/helpers";
import { makeRemboursement, makeVente, produits } from "@/test/fixtures";

const api = vi.mocked(svc);
const user = () => userEvent.setup();

function setup(ventes: DonneeVente[] = [], rembs = [makeRemboursement({ source_type: "Achat", source_id: 999 })]) {
  api.getDonneeVentes.mockResolvedValue(ventes);
  api.getRemboursements.mockResolvedValue(rembs);
  api.searchProduits.mockResolvedValue(produits);
  return renderWithProviders(<VentePage />);
}

async function openActions(ref: string) {
  const buttons = within(rowOf(ref)).getAllByRole("button");
  await user().click(buttons[buttons.length - 1]);
}

async function openCreateDialog() {
  await user().click(await screen.findByRole("button", { name: /Nouvelle vente/ }));
  return screen.findByRole("dialog");
}

const lineSelect = (dialog: HTMLElement, i = 0) => fieldsByLabel(dialog, "Produit / Variante")[i] as HTMLSelectElement;
const submit = (dialog: HTMLElement) => user().click(within(dialog).getByRole("button", { name: "Confirmer la vente" }));
const typeSelect = (d: HTMLElement) => fieldByLabel(d, "Type de Vente") as HTMLSelectElement;
const segmentSelect = (d: HTMLElement) => fieldByLabel(d, "Segment Clientèle") as HTMLSelectElement;

beforeEach(() => {
  loginAs({ id: 7 });
  api.createDonneeVente.mockResolvedValue(makeVente());
  api.updateDonneeVente.mockResolvedValue(makeVente());
  api.deleteDonneeVente.mockResolvedValue(undefined);
});

describe("Mission 2 — Ventes : liste et suivi", () => {
  it("affiche statut, montant, paiement, mode, segment client et date de chaque vente", async () => {
    setup([makeVente({ numero_vente: "VT-001", montant_total: "70000", mode_paiement: "Orange Money", segment_clientele: "Grossiste", statut_paiement: "Payé", status: "Livré" })]);
    await screen.findByText("VT-001");
    const row = rowOf("VT-001");
    expect(within(row).getByText("Livré")).toBeInTheDocument();
    expect(within(row).getByText(hasText("70 000 Ar"))).toBeInTheDocument();
    expect(within(row).getByText("Payé")).toBeInTheDocument();
    expect(within(row).getByText("Orange Money")).toBeInTheDocument();
    expect(within(row).getByText("Grossiste")).toBeInTheDocument();
  });

  it("génère une référence de repli « VT-<id> » quand numero_vente est absent", async () => {
    setup([makeVente({ id: 42, numero_vente: null })]);
    expect(await screen.findByText("VT-42")).toBeInTheDocument();
  });

  it("affiche un état de chargement, puis un message si aucune vente n'existe", async () => {
    api.getDonneeVentes.mockReturnValue(new Promise(() => {}));
    api.getRemboursements.mockResolvedValue([]);
    api.searchProduits.mockResolvedValue([]);
    renderWithProviders(<VentePage />);
    expect(await screen.findByText("Chargement...")).toBeInTheDocument();
  });

  it("affiche « Aucune vente enregistrée » pour une liste vide", async () => {
    setup([]);
    expect(await screen.findByText("Aucune vente enregistrée")).toBeInTheDocument();
  });

  it("filtre par statut côté API (En attente / Livrées / Annulées) puis « Tous »", async () => {
    setup([makeVente()]);
    await screen.findByText("VT-001");
    expect(api.getDonneeVentes).toHaveBeenLastCalledWith(undefined);

    await user().click(screen.getByRole("button", { name: "En attente" }));
    await waitFor(() => expect(api.getDonneeVentes).toHaveBeenLastCalledWith({ status: "En attente" }));
    await user().click(screen.getByRole("button", { name: "Livrées" }));
    await waitFor(() => expect(api.getDonneeVentes).toHaveBeenLastCalledWith({ status: "Livré" }));
    await user().click(screen.getByRole("button", { name: "Annulées" }));
    await waitFor(() => expect(api.getDonneeVentes).toHaveBeenLastCalledWith({ status: "Annulé" }));
    await user().click(screen.getByRole("button", { name: "Tous" }));
    await waitFor(() => expect(api.getDonneeVentes).toHaveBeenLastCalledWith(undefined));
  });

  it("recherche par numéro de vente", async () => {
    setup([makeVente({ id: 1, numero_vente: "VT-001" }), makeVente({ id: 2, numero_vente: "VT-002" })]);
    await screen.findByText("VT-001");
    await user().type(screen.getByPlaceholderText("Rechercher par numéro de vente..."), "vt-002");
    expect(screen.queryByText("VT-001")).not.toBeInTheDocument();
    expect(screen.getByText("VT-002")).toBeInTheDocument();
  });

  it("pagine par 10 ventes", async () => {
    setup(Array.from({ length: 11 }, (_, i) => makeVente({ id: i + 1, numero_vente: `VT-${String(i + 1).padStart(3, "0")}` })));
    await screen.findByText("VT-001");
    expect(screen.getByText("Page 1 sur 2")).toBeInTheDocument();
    await user().click(screen.getByRole("button", { name: "Suivant" }));
    expect(screen.getByText("VT-011")).toBeInTheDocument();
    expect(screen.queryByText("VT-001")).not.toBeInTheDocument();
  });

  it("affiche le délai de paiement d'une vente à crédit et signale un délai dépassé en rouge", async () => {
    setup([
      makeVente({ id: 1, numero_vente: "VT-LATE", type_vente: "Crédit", delai_paiement: "2000-01-01" }),
      makeVente({ id: 2, numero_vente: "VT-OK", type_vente: "Crédit", delai_paiement: "2999-01-01" }),
      makeVente({ id: 3, numero_vente: "VT-CASH", delai_paiement: null }),
    ]);
    await screen.findByText("VT-LATE");
    const delayCell = (ref: string) => within(rowOf(ref)).getAllByRole("cell")[7];
    expect(delayCell("VT-LATE").querySelector(".text-red-500")).not.toBeNull();
    expect(delayCell("VT-OK").querySelector(".text-amber-600")).not.toBeNull();
    expect(delayCell("VT-CASH")).toHaveTextContent("—");
  });

  it("un paiement « Partiel » a son propre badge (distinct de « Non payé » et de « Payé »)", async () => {
    setup([makeVente({ statut_paiement: "Partiel", montant_paye: "20000" })]);
    await screen.findByText("VT-001");
    const row = rowOf("VT-001");
    expect(within(row).getByText("Partiel")).toBeInTheDocument();
    expect(within(row).queryByText("Non payé")).not.toBeInTheDocument();
    expect(within(row).queryByText("Payé")).not.toBeInTheDocument();
    // couleur propre : ni le rouge de « Non payé », ni le vert de « Payé »
    const badge = within(row).getByText("Partiel");
    expect(badge.className).toContain("amber");
    expect(badge.className).not.toContain("red");
    expect(badge.className).not.toContain("emerald");
  });

  it("une vente partiellement payée peut encore être soldée (« Marquer comme payé ») ou livrée", async () => {
    setup([makeVente({ id: 4, statut_paiement: "Partiel", montant_paye: "20000", montant_total: "70000" })]);
    await screen.findByText("VT-001");
    await openActions("VT-001");
    await screen.findByRole("menuitem", { name: /Marquer comme livré/ });
    await user().click(screen.getByRole("menuitem", { name: /Marquer comme payé/ }));
    await waitFor(() => expect(api.updateDonneeVente).toHaveBeenCalled());
    expect(api.updateDonneeVente.mock.calls[0].slice(0, 2)).toEqual([4, { statut_paiement: "Payé", montant_paye: "70000" }]);
  });

  it("les montants d'une vente partiellement payée sont comptés dans les encaissements, pas dans les créances de crédit", async () => {
    setup([makeVente({ statut_paiement: "Partiel", montant_paye: "20000", montant_total: "70000" })]);
    await screen.findByText("VT-001");
    const enc = kpiCard("Encaissements");
    expect(within(enc).getByText(hasText("20 000 Ar"))).toBeInTheDocument();
    expect(within(enc).getByText(hasText("/ 70 000 Ar"))).toBeInTheDocument();
  });

  it("l'état de paiement « Annulé » (vente à crédit annulée automatiquement) n'est plus affiché « Non payé »", async () => {
    setup([makeVente({ status: "Annulé", statut_paiement: "Annulé" })]);
    await screen.findByText("VT-001");
    const row = rowOf("VT-001");
    expect(within(row).queryByText("Non payé")).not.toBeInTheDocument();
    expect(within(row).getAllByText("Annulé").length).toBeGreaterThanOrEqual(2); // statut + paiement
  });

  it("un état de paiement inconnu retombe sur « Non payé » plutôt que de casser l'affichage", async () => {
    setup([makeVente({ statut_paiement: "Etat-inconnu" })]);
    await screen.findByText("VT-001");
    expect(within(rowOf("VT-001")).getByText("Non payé")).toBeInTheDocument();
  });
});

describe("Mission 2 — Ventes : indicateurs (créances clients)", () => {
  it("calcule transactions, encaissements, ventes à crédit et reste à recouvrer — hors ventes annulées", async () => {
    setup([
      makeVente({ id: 1, numero_vente: "VT-001", type_vente: "Normal", status: "Livré", montant_total: "100000", montant_paye: "100000", statut_paiement: "Payé" }),
      makeVente({ id: 2, numero_vente: "VT-002", type_vente: "Crédit", status: "En attente", montant_total: "200000", montant_paye: "50000", delai_paiement: "2999-01-01" }),
      makeVente({ id: 3, numero_vente: "VT-003", type_vente: "Crédit", status: "Annulé", montant_total: "30000", montant_paye: "0" }),
    ]);
    await screen.findByText("VT-001");
    expect(within(kpiCard("Total Ventes")).getByText("2")).toBeInTheDocument();

    const enc = kpiCard("Encaissements");
    expect(within(enc).getByText(hasText("150 000 Ar"))).toBeInTheDocument();
    expect(within(enc).getByText(hasText("/ 300 000 Ar"))).toBeInTheDocument();

    const credit = kpiCard("Ventes à crédit");
    expect(within(credit).getByText(hasText("200 000 Ar"))).toBeInTheDocument();
    expect(within(credit).getByText("1 dossiers")).toBeInTheDocument();

    expect(within(kpiCard("Reste à recouvrer")).getByText(hasText("150 000 Ar"))).toBeInTheDocument();
  });

  it("exclut de la liste (et des indicateurs) les ventes couvertes par un remboursement de type « Vente »", async () => {
    setup(
      [makeVente({ id: 1, numero_vente: "VT-001" }), makeVente({ id: 2, numero_vente: "VT-002" })],
      [makeRemboursement({ source_type: "Vente", source_id: 2 })],
    );
    expect(await screen.findByText("VT-001")).toBeInTheDocument();
    expect(screen.queryByText("VT-002")).not.toBeInTheDocument();
    expect(within(kpiCard("Total Ventes")).getByText("1")).toBeInTheDocument();
  });

  it("ne masque pas une vente dont l'id coïncide avec un remboursement d'ACHAT", async () => {
    setup([makeVente({ id: 5, numero_vente: "VT-005" })], [makeRemboursement({ source_type: "Achat", source_id: 5 })]);
    expect(await screen.findByText("VT-005")).toBeInTheDocument();
  });
});

describe("Mission 2 — Ventes : règles de changement de statut", () => {
  it("vente en attente non payée : payer, livrer, annuler et supprimer sont proposés", async () => {
    setup([makeVente()]);
    await screen.findByText("VT-001");
    await openActions("VT-001");
    expect(await screen.findByRole("menuitem", { name: /Marquer comme payé/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Marquer comme livré/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Annuler la vente/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Supprimer l'enregistrement/ })).toBeInTheDocument();
  });

  it("« Marquer comme payé » envoie statut_paiement=Payé et montant_paye=montant_total", async () => {
    setup([makeVente({ id: 3, montant_total: "70000" })]);
    await screen.findByText("VT-001");
    await openActions("VT-001");
    await user().click(await screen.findByRole("menuitem", { name: /Marquer comme payé/ }));
    await waitFor(() => expect(api.updateDonneeVente).toHaveBeenCalled());
    expect(api.updateDonneeVente.mock.calls[0].slice(0, 2)).toEqual([3, { statut_paiement: "Payé", montant_paye: "70000" }]);
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Mise à jour réussie"));
  });

  it("« Marquer comme livré » envoie status=Livré et recharge la liste", async () => {
    setup([makeVente({ id: 3 })]);
    await screen.findByText("VT-001");
    const before = api.getDonneeVentes.mock.calls.length;
    await openActions("VT-001");
    await user().click(await screen.findByRole("menuitem", { name: /Marquer comme livré/ }));
    await waitFor(() => expect(api.updateDonneeVente).toHaveBeenCalled());
    expect(api.updateDonneeVente.mock.calls[0].slice(0, 2)).toEqual([3, { status: "Livré" }]);
    await waitFor(() => expect(api.getDonneeVentes.mock.calls.length).toBeGreaterThan(before));
  });

  it("« Annuler la vente » envoie status=Annulé", async () => {
    setup([makeVente({ id: 3 })]);
    await screen.findByText("VT-001");
    await openActions("VT-001");
    await user().click(await screen.findByRole("menuitem", { name: /Annuler la vente/ }));
    await waitFor(() => expect(api.updateDonneeVente).toHaveBeenCalled());
    expect(api.updateDonneeVente.mock.calls[0].slice(0, 2)).toEqual([3, { status: "Annulé" }]);
  });

  it("vente déjà payée : n'offre plus « Marquer comme payé » mais encore « Marquer comme livré »", async () => {
    setup([makeVente({ statut_paiement: "Payé", status: "En attente" })]);
    await screen.findByText("VT-001");
    await openActions("VT-001");
    await screen.findByRole("menuitem", { name: /Marquer comme livré/ });
    expect(screen.queryByRole("menuitem", { name: /Marquer comme payé/ })).not.toBeInTheDocument();
  });

  it("vente finalisée (payée ET livrée) : plus de modification possible, seule l'annulation reste", async () => {
    setup([makeVente({ statut_paiement: "Payé", status: "Livré" })]);
    await screen.findByText("VT-001");
    await openActions("VT-001");
    await screen.findByRole("menuitem", { name: /Annuler la vente/ });
    expect(screen.queryByRole("menuitem", { name: /Marquer comme payé/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /Marquer comme livré/ })).not.toBeInTheDocument();
  });

  it("vente à crédit dont le délai de paiement est dépassé : plus de changement de paiement/livraison", async () => {
    setup([makeVente({ type_vente: "Crédit", delai_paiement: "2000-01-01" })]);
    await screen.findByText("VT-001");
    await openActions("VT-001");
    await screen.findByRole("menuitem", { name: /Annuler la vente/ });
    expect(screen.queryByRole("menuitem", { name: /Marquer comme payé/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /Marquer comme livré/ })).not.toBeInTheDocument();
  });

  it("vente à crédit dans son délai : les changements restent possibles", async () => {
    setup([makeVente({ type_vente: "Crédit", delai_paiement: "2999-01-01" })]);
    await screen.findByText("VT-001");
    await openActions("VT-001");
    expect(await screen.findByRole("menuitem", { name: /Marquer comme payé/ })).toBeInTheDocument();
  });

  it("vente annulée : message « Vente déjà annulée » et plus d'action de statut", async () => {
    setup([makeVente({ status: "Annulé" })]);
    await screen.findByText("VT-001");
    await openActions("VT-001");
    expect(await screen.findByText("Vente déjà annulée")).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /Annuler la vente/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /Marquer comme/ })).not.toBeInTheDocument();
  });

  it("affiche l'erreur de l'API si la mise à jour échoue", async () => {
    api.updateDonneeVente.mockRejectedValue(new Error("Stock insuffisant pour livrer"));
    setup([makeVente()]);
    await screen.findByText("VT-001");
    await openActions("VT-001");
    await user().click(await screen.findByRole("menuitem", { name: /Marquer comme livré/ }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Stock insuffisant pour livrer"));
  });
});

describe("Mission 2 — Ventes : suppression et détail", () => {
  it("supprime une vente après confirmation", async () => {
    setup([makeVente({ id: 8 })]);
    await screen.findByText("VT-001");
    await openActions("VT-001");
    await user().click(await screen.findByRole("menuitem", { name: /Supprimer l'enregistrement/ }));
    const dialog = await screen.findByRole("dialog");
    expect(api.deleteDonneeVente).not.toHaveBeenCalled();
    await user().click(within(dialog).getByRole("button", { name: "Supprimer" }));
    await waitFor(() => expect(api.deleteDonneeVente).toHaveBeenCalled());
    expect(api.deleteDonneeVente.mock.calls[0][0]).toBe(8);
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Vente supprimée"));
  });

  it("n'appelle pas l'API quand la suppression est annulée", async () => {
    setup([makeVente()]);
    await screen.findByText("VT-001");
    await openActions("VT-001");
    await user().click(await screen.findByRole("menuitem", { name: /Supprimer l'enregistrement/ }));
    await user().click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Annuler" }));
    expect(api.deleteDonneeVente).not.toHaveBeenCalled();
  });

  // Règle « supprimable seulement sans trace » : le backend renvoie `supprimable: false` pour une
  // vente payée, livrée ou remboursée ; on l'annule au lieu de la supprimer.
  it("vente non supprimable : l'action « Supprimer » est remplacée par une explication", async () => {
    setup([makeVente({ status: "Livré", statut_paiement: "Payé", supprimable: false })]);
    await screen.findByText("VT-001");
    await openActions("VT-001");
    await screen.findByRole("menuitem", { name: /Annuler la vente/ });
    expect(screen.queryByRole("menuitem", { name: /Supprimer l'enregistrement/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Non supprimable.*annulez-la plutôt/)).toBeInTheDocument();
  });

  it("vente annulée et non supprimable : indique qu'elle est conservée dans l'historique", async () => {
    setup([makeVente({ status: "Annulé", supprimable: false })]);
    await screen.findByText("VT-001");
    await openActions("VT-001");
    expect(await screen.findByText("Conservée dans l'historique (non supprimable)")).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /Supprimer l'enregistrement/ })).not.toBeInTheDocument();
  });

  it("vente supprimable (ou champ absent) : l'action « Supprimer » reste proposée", async () => {
    setup([makeVente({ id: 1, numero_vente: "VT-001", supprimable: true }), makeVente({ id: 2, numero_vente: "VT-002" })]);
    await screen.findByText("VT-001");
    await openActions("VT-001");
    expect(await screen.findByRole("menuitem", { name: /Supprimer l'enregistrement/ })).toBeInTheDocument();
    await user().keyboard("{Escape}");
    await openActions("VT-002");
    expect(await screen.findByRole("menuitem", { name: /Supprimer l'enregistrement/ })).toBeInTheDocument();
  });

  it("si le serveur refuse la suppression, affiche son message, ferme la confirmation et recharge la liste", async () => {
    api.deleteDonneeVente.mockRejectedValue(
      new Error("Suppression impossible : des mouvements de stock lui sont associés (livraison). Annulez-la plutôt : l'annulation conserve l'historique et restitue le stock."),
    );
    setup([makeVente({ id: 8 })]); // l'écran la croit supprimable (état périmé)
    await screen.findByText("VT-001");
    const avant = api.getDonneeVentes.mock.calls.length;
    await openActions("VT-001");
    await user().click(await screen.findByRole("menuitem", { name: /Supprimer l'enregistrement/ }));
    await user().click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Supprimer" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Suppression impossible")));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(api.getDonneeVentes.mock.calls.length).toBeGreaterThan(avant));
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("la fenêtre de détail liste client, type, utilisateur et lignes de la vente", async () => {
    setup([
      makeVente({
        segment_clientele: "VIP/Fidélisé",
        type_vente: "Crédit",
        utilisateur_name: "andy",
        delai_paiement: "2999-01-01",
        lignes: [
          { id: 1, donnee_vente: 1, produit: 10, produit_name: "Riz 25kg", quantite: 2, prix_unitaire: "50000", remise_applique: "0", montant_ligne: 100000 },
          { id: 2, donnee_vente: 1, produit: 30, produit_name: "Sucre 1kg", quantite: 3, prix_unitaire: "4000", remise_applique: "0", montant_ligne: 12000 },
        ],
      }),
    ]);
    await screen.findByText("VT-001");
    await user().click(within(rowOf("VT-001")).getAllByRole("button")[0]); // 1er bouton de la ligne = « œil » (détail)
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Détails de la vente")).toBeInTheDocument();
    expect(within(dialog).getByText("VIP/Fidélisé")).toBeInTheDocument();
    expect(within(dialog).getByText("Crédit")).toBeInTheDocument();
    expect(within(dialog).getByText("andy")).toBeInTheDocument();
    expect(within(dialog).getByText("Riz 25kg")).toBeInTheDocument();
    expect(within(dialog).getByText("x2")).toBeInTheDocument();
    expect(within(dialog).getByText(hasText("100 000 Ar"))).toBeInTheDocument();
    expect(within(dialog).getByText("Sucre 1kg")).toBeInTheDocument();
    expect(within(dialog).getByText(hasText("12 000 Ar"))).toBeInTheDocument();
  });
});

describe("Mission 2 — Ventes : création, contrôle de stock", () => {
  it("désactive dans le menu les produits et variantes dont le stock est nul", async () => {
    setup();
    const dialog = await openCreateDialog();
    const option = (value: string) =>
      Array.from(lineSelect(dialog).options).find((o) => o.value === value)!;
    expect(option("pr-20")).toBeDisabled(); // Huile : stock 0
    expect(option("pr-10")).not.toBeDisabled();
    expect(option("dv-11")).not.toBeDisabled();
    expect(option("pr-20").textContent).toMatch(/Stock: 0/);
    expect(option("dv-11").textContent).toMatch(/\[Variante\] Riz 5kg/);
  });

  it("sélectionner un article renseigne son prix et recalcule le total (remise comprise dans le total)", async () => {
    setup();
    const dialog = await openCreateDialog();
    await user().selectOptions(lineSelect(dialog), "pr-30"); // Sucre 4 000 Ar
    expect((fieldsByLabel(dialog, "P.U")[0] as HTMLInputElement).value).toBe("4000");
    fireEvent.change(fieldsByLabel(dialog, "Qté")[0], { target: { value: "3" } });
    expect(within(dialog).getByText("Total").nextElementSibling).toHaveTextContent("12 000 Ar");
    expect(within(dialog).getByText("Articles").nextElementSibling).toHaveTextContent("3 unités");
  });

  it("refuse une quantité supérieure au stock disponible, sans appel réseau", async () => {
    setup();
    const dialog = await openCreateDialog();
    await user().selectOptions(lineSelect(dialog), "pr-30"); // stock 5
    fireEvent.change(fieldsByLabel(dialog, "Qté")[0], { target: { value: "6" } });
    await submit(dialog);
    expect(toast.error).toHaveBeenCalledWith('Stock insuffisant pour "Sucre 1kg". Disponible: 5, Demandé: 6');
    expect(api.createDonneeVente).not.toHaveBeenCalled();
  });

  it("accepte une quantité égale au stock disponible", async () => {
    setup();
    const dialog = await openCreateDialog();
    await user().selectOptions(lineSelect(dialog), "pr-30");
    fireEvent.change(fieldsByLabel(dialog, "Qté")[0], { target: { value: "5" } });
    await submit(dialog);
    await waitFor(() => expect(api.createDonneeVente).toHaveBeenCalledTimes(1));
  });

  it("contrôle le stock de la variante (pas celui du produit parent)", async () => {
    setup();
    const dialog = await openCreateDialog();
    await user().selectOptions(lineSelect(dialog), "dv-11"); // variante : stock 20, parent : 100
    fireEvent.change(fieldsByLabel(dialog, "Qté")[0], { target: { value: "21" } });
    await submit(dialog);
    expect(toast.error).toHaveBeenCalledWith('Stock insuffisant pour "Riz 5kg". Disponible: 20, Demandé: 21');
    expect(api.createDonneeVente).not.toHaveBeenCalled();
  });

  it("contrôle le stock sur TOUTES les lignes", async () => {
    setup();
    const dialog = await openCreateDialog();
    await user().selectOptions(lineSelect(dialog, 0), "pr-10");
    await user().click(within(dialog).getByRole("button", { name: /Ajouter/ }));
    await user().selectOptions(lineSelect(dialog, 1), "pr-30");
    fireEvent.change(fieldsByLabel(dialog, "Qté")[1], { target: { value: "9" } });
    await submit(dialog);
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Stock insuffisant pour "Sucre 1kg"'));
    expect(api.createDonneeVente).not.toHaveBeenCalled();
  });

  it("refuse une ligne sans produit", async () => {
    setup();
    const dialog = await openCreateDialog();
    await submit(dialog);
    expect(toast.error).toHaveBeenCalledWith("Veuillez choisir un produit ou sous-produit");
    expect(api.createDonneeVente).not.toHaveBeenCalled();
  });

  it("refuse la vente si l'utilisateur n'est pas identifié", async () => {
    localStorage.clear();
    setup();
    const dialog = await openCreateDialog();
    await user().selectOptions(lineSelect(dialog), "pr-10");
    await submit(dialog);
    expect(toast.error).toHaveBeenCalledWith("Utilisateur non identifié. Veuillez vous reconnecter.");
    expect(api.createDonneeVente).not.toHaveBeenCalled();
  });
});

describe("Mission 2 — Ventes : règle métier de la vente à crédit", () => {
  it("le champ « Délai de paiement » n'apparaît que pour une vente à crédit", async () => {
    setup();
    const dialog = await openCreateDialog();
    expect(within(dialog).queryByText("Délai de paiement")).not.toBeInTheDocument();
    await user().selectOptions(typeSelect(dialog), "Crédit");
    expect(within(dialog).getByText("Délai de paiement")).toBeInTheDocument();
    await user().selectOptions(typeSelect(dialog), "Normal");
    expect(within(dialog).queryByText("Délai de paiement")).not.toBeInTheDocument();
  });

  it.each(["Particulier", "Professionnel", "Grossiste"])(
    "refuse la vente à crédit pour le segment « %s » (réservée aux VIP/Fidélisés)",
    async (segment) => {
      setup();
      const dialog = await openCreateDialog();
      await user().selectOptions(lineSelect(dialog), "pr-10");
      await user().selectOptions(segmentSelect(dialog), segment);
      await user().selectOptions(typeSelect(dialog), "Crédit");
      fireEvent.change(fieldByLabel(dialog, "Délai de paiement"), { target: { value: "2999-01-01" } });
      await submit(dialog);
      expect(toast.error).toHaveBeenCalledWith("La vente à crédit est réservée aux clients VIP/Fidélisés.");
      expect(api.createDonneeVente).not.toHaveBeenCalled(); // vérifié AVANT tout appel réseau
    },
  );

  it("exige un délai de paiement pour une vente à crédit VIP/Fidélisé", async () => {
    setup();
    const dialog = await openCreateDialog();
    await user().selectOptions(lineSelect(dialog), "pr-10");
    await user().selectOptions(segmentSelect(dialog), "VIP/Fidélisé");
    await user().selectOptions(typeSelect(dialog), "Crédit");
    fireEvent.submit(dialog.querySelector("form")!); // contourne l'attribut HTML « required »
    expect(toast.error).toHaveBeenCalledWith("Veuillez préciser un délai de paiement pour la vente à crédit.");
    expect(api.createDonneeVente).not.toHaveBeenCalled();
  });

  it("enregistre une vente à crédit VIP/Fidélisé avec son délai de paiement", async () => {
    setup();
    const dialog = await openCreateDialog();
    await user().selectOptions(lineSelect(dialog), "pr-10");
    await user().selectOptions(segmentSelect(dialog), "VIP/Fidélisé");
    await user().selectOptions(typeSelect(dialog), "Crédit");
    fireEvent.change(fieldByLabel(dialog, "Délai de paiement"), { target: { value: "2999-06-30" } });
    await submit(dialog);

    await waitFor(() => expect(api.createDonneeVente).toHaveBeenCalledTimes(1));
    expect(api.createDonneeVente.mock.calls[0][0]).toMatchObject({
      utilisateur: 7,
      type_vente: "Crédit",
      segment_clientele: "VIP/Fidélisé",
      delai_paiement: "2999-06-30",
    });
  });

  it("une vente directe est envoyée avec delai_paiement=null, même si un délai avait été saisi avant de changer de type", async () => {
    setup();
    const dialog = await openCreateDialog();
    await user().selectOptions(lineSelect(dialog), "pr-10");
    await user().selectOptions(typeSelect(dialog), "Crédit");
    fireEvent.change(fieldByLabel(dialog, "Délai de paiement"), { target: { value: "2999-06-30" } });
    await user().selectOptions(typeSelect(dialog), "Normal");
    await submit(dialog);
    await waitFor(() => expect(api.createDonneeVente).toHaveBeenCalled());
    const payload = api.createDonneeVente.mock.calls[0][0] as CreateDonneeVenteData;
    expect(payload.type_vente).toBe("Normal");
    expect(payload.delai_paiement).toBeNull();
  });
});

describe("Mission 2 — Ventes : enregistrement d'une vente", () => {
  it("envoie le payload complet, confirme, ferme le formulaire et recharge la liste", async () => {
    setup();
    await screen.findByText("Aucune vente enregistrée");
    const before = api.getDonneeVentes.mock.calls.length;
    const dialog = await openCreateDialog();

    await user().selectOptions(segmentSelect(dialog), "Grossiste");
    await user().selectOptions(fieldByLabel(dialog, "Mode de Paiement") as HTMLSelectElement, "Virement");
    await user().selectOptions(lineSelect(dialog), "pr-10");
    fireEvent.change(fieldsByLabel(dialog, "Qté")[0], { target: { value: "4" } });
    await submit(dialog);

    await waitFor(() => expect(api.createDonneeVente).toHaveBeenCalledTimes(1));
    expect(api.createDonneeVente.mock.calls[0][0]).toMatchObject({
      utilisateur: 7,
      segment_clientele: "Grossiste",
      mode_paiement: "Virement",
      type_vente: "Normal",
      delai_paiement: null,
      lignes_data: [{ produit: 10, produit_dv: null, quantite: 4, prix_unitaire: 50000, remise_applique: 0 }],
    });
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Vente enregistrée"));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(api.getDonneeVentes.mock.calls.length).toBeGreaterThan(before));
  });

  it("une variante est envoyée avec produit_dv et son produit parent", async () => {
    setup();
    const dialog = await openCreateDialog();
    await user().selectOptions(lineSelect(dialog), "dv-11");
    await submit(dialog);
    await waitFor(() => expect(api.createDonneeVente).toHaveBeenCalled());
    const payload = api.createDonneeVente.mock.calls[0][0] as CreateDonneeVenteData;
    expect(payload.lignes_data![0]).toMatchObject({ produit: 10, produit_dv: 11, prix_unitaire: 11000 });
  });

  it("affiche l'erreur de l'API et garde le formulaire ouvert si l'enregistrement échoue", async () => {
    api.createDonneeVente.mockRejectedValue(new Error("Stock insuffisant côté serveur"));
    setup();
    const dialog = await openCreateDialog();
    await user().selectOptions(lineSelect(dialog), "pr-10");
    await submit(dialog);
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Stock insuffisant côté serveur"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("« Annuler » ferme le formulaire et le réinitialise", async () => {
    setup();
    let dialog = await openCreateDialog();
    await user().selectOptions(segmentSelect(dialog), "Grossiste");
    await user().click(within(dialog).getByRole("button", { name: "Annuler" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    dialog = await openCreateDialog();
    expect(segmentSelect(dialog).value).toBe("Particulier");
  });
});

describe("Mission 2 — Ventes : enregistrement d'un paiement (paiement partiel possible)", () => {
  const vente = (over: Partial<DonneeVente> = {}) =>
    makeVente({ id: 4, montant_total: "70000", montant_paye: "20000", statut_paiement: "Partiel", mode_paiement: "Orange Money", ...over });

  it.each([
    ["Non payé"],
    ["Partiel"],
  ] as const)("propose « Enregistrer un paiement » pour une vente %s", async (paiement) => {
    setup([vente({ statut_paiement: paiement })]);
    await screen.findByText("VT-001");
    await openActions("VT-001");
    expect(await screen.findByRole("menuitem", { name: /Enregistrer un paiement/ })).toBeInTheDocument();
  });

  it("ne le propose pas pour une vente soldée ni pour une vente dont le délai de crédit est dépassé", async () => {
    setup([
      makeVente({ id: 1, numero_vente: "VT-SOLDEE", statut_paiement: "Payé", status: "Livré" }),
      makeVente({ id: 2, numero_vente: "VT-RETARD", type_vente: "Crédit", delai_paiement: "2000-01-01" }),
    ]);
    await screen.findByText("VT-SOLDEE");
    await openActions("VT-SOLDEE");
    await screen.findByRole("menuitem", { name: /Annuler la vente/ });
    expect(screen.queryByRole("menuitem", { name: /Enregistrer un paiement/ })).not.toBeInTheDocument();
    await user().keyboard("{Escape}");
    await openActions("VT-RETARD");
    await screen.findByRole("menuitem", { name: /Annuler la vente/ });
    expect(screen.queryByRole("menuitem", { name: /Enregistrer un paiement/ })).not.toBeInTheDocument();
  });

  it("enregistre un versement partiel avec le mode choisi, puis recharge la liste", async () => {
    api.payerDonneeVente.mockResolvedValue(vente());
    setup([vente()]);
    await screen.findByText("VT-001");
    const avant = api.getDonneeVentes.mock.calls.length;
    await openActions("VT-001");
    await user().click(await screen.findByRole("menuitem", { name: /Enregistrer un paiement/ }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Reste à payer").nextElementSibling).toHaveTextContent("50 000 Ar");
    fireEvent.change(within(dialog).getByLabelText(/Montant versé/), { target: { value: "15000" } });
    await user().selectOptions(within(dialog).getByLabelText("Mode de paiement"), "Espèces");
    await user().type(within(dialog).getByLabelText(/Note/), "Solde client");
    await user().click(within(dialog).getByRole("button", { name: "Enregistrer le paiement" }));

    await waitFor(() => expect(api.payerDonneeVente).toHaveBeenCalledTimes(1));
    expect(api.payerDonneeVente.mock.calls[0].slice(0, 2)).toEqual([4, { montant: 15000, mode_paiement: "Espèces", notes: "Solde client" }]);
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Paiement enregistré"));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(api.getDonneeVentes.mock.calls.length).toBeGreaterThan(avant));
  });

  it("une erreur du serveur affiche son message et laisse la fenêtre ouverte", async () => {
    api.payerDonneeVente.mockRejectedValue(new Error("Impossible d'enregistrer un paiement : la vente est annulée."));
    setup([vente()]);
    await screen.findByText("VT-001");
    await openActions("VT-001");
    await user().click(await screen.findByRole("menuitem", { name: /Enregistrer un paiement/ }));
    await user().click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Enregistrer le paiement" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("la vente est annulée")));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("le détail liste l'historique des paiements de la vente", async () => {
    setup([
      vente({
        paiements: [
          { id: 1, montant: "20000.00", mode_paiement: "Orange Money", date_paiement: "2025-03-12T09:00:00Z", notes: "Acompte" },
        ],
      }),
    ]);
    await screen.findByText("VT-001");
    await user().click(within(rowOf("VT-001")).getAllByRole("button")[0]);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Paiements")).toBeInTheDocument();
    expect(within(dialog).getByText(/Orange Money · Acompte/)).toBeInTheDocument();
    expect(within(dialog).getByText(hasText("20 000 Ar"))).toBeInTheDocument();
  });

  it("le détail n'affiche pas de section « Paiements » quand il n'y en a pas", async () => {
    setup([makeVente({ paiements: [] })]);
    await screen.findByText("VT-001");
    await user().click(within(rowOf("VT-001")).getAllByRole("button")[0]);
    expect(within(await screen.findByRole("dialog")).queryByText("Paiements")).not.toBeInTheDocument();
  });
});
