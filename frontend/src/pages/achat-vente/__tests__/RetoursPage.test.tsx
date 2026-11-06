/**
 * MISSION 3 — Gestion des remboursements (RetoursPage.tsx)
 *
 * Mémoire §3.3 — problèmes traités :
 *   • deux origines (achat / vente) aux informations différentes dans une seule fenêtre de détail
 *   • coût du chargement initial : le détail de la source n'est chargé qu'à l'ouverture
 * Fonctionnalités attendues :
 *   • liste + filtre par source (achats / ventes) + recherche par n° de transaction
 *   • indicateurs « montant à rembourser » (ventes) et « montant à encaisser » (achats)
 *   • action « Régler » pour marquer un remboursement comme réglé
 *   • détail : commande ou vente d'origine rechargée, avec ses lignes de produits
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Remboursement } from "@/types/achatVente";

vi.mock("@/services/achatVenteService", () => ({
  getRemboursements: vi.fn(),
  updateRemboursement: vi.fn(),
  getBonCommande: vi.fn(),
  getDonneeVente: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import * as svc from "@/services/achatVenteService";
import { toast } from "sonner";
import RemboursementsPage from "../RetoursPage";
import { renderWithProviders } from "@/test/renderWithProviders";
import { hasText, rowOf } from "@/test/helpers";
import { makeCommande, makeRemboursement, makeVente } from "@/test/fixtures";

const api = vi.mocked(svc);
const user = () => userEvent.setup();

const achatNonRegle = makeRemboursement({ id: 1, source_type: "Achat", source_id: 11, numero_transaction: "BC-011", montant: 100000, statut_reglement: "Non réglé", raison: "Commande annulée" });
const venteNonRegle = makeRemboursement({ id: 2, source_type: "Vente", source_id: 22, numero_transaction: "VT-022", montant: 70000, statut_reglement: "Non réglé", raison: "Client insatisfait" });
const venteRegle = makeRemboursement({ id: 3, source_type: "Vente", source_id: 33, numero_transaction: "VT-033", montant: 99999, statut_reglement: "Réglé" });

function setup(rembs: Remboursement[] = [achatNonRegle, venteNonRegle, venteRegle]) {
  api.getRemboursements.mockResolvedValue(rembs);
  return renderWithProviders(<RemboursementsPage />);
}

const card = (label: string) => screen.getByText(label).closest(".rounded-2xl") as HTMLElement;

beforeEach(() => {
  api.updateRemboursement.mockResolvedValue(achatNonRegle);
});

describe("Mission 3 — Remboursements : vue centralisée", () => {
  it("liste source, n° de transaction, montant et statut de règlement", async () => {
    setup();
    await screen.findByText("BC-011");
    const row = rowOf("BC-011");
    expect(within(row).getByText("Achat")).toBeInTheDocument();
    expect(within(row).getByText(hasText("100 000 Ar"))).toBeInTheDocument();
    expect(within(row).getByText("Non réglé")).toBeInTheDocument();
    expect(within(rowOf("VT-033")).getByText("Réglé")).toBeInTheDocument();
  });

  it("distingue visuellement les deux origines par un badge de couleur différent", async () => {
    setup();
    await screen.findByText("BC-011");
    const achatBadge = within(rowOf("BC-011")).getByText("Achat");
    const venteBadge = within(rowOf("VT-022")).getByText("Vente");
    expect(achatBadge.className).toContain("emerald");
    expect(venteBadge.className).toContain("blue");
    expect(achatBadge.className).not.toBe(venteBadge.className);
  });

  it("affiche un état de chargement puis « Aucun enregistrement » pour une liste vide", async () => {
    api.getRemboursements.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<RemboursementsPage />);
    expect(await screen.findByText("Chargement...")).toBeInTheDocument();
  });

  it("affiche « Aucun enregistrement » quand il n'y a aucun remboursement", async () => {
    setup([]);
    expect(await screen.findByText("Aucun enregistrement")).toBeInTheDocument();
  });

  it("« Actualiser » recharge les remboursements", async () => {
    setup();
    await screen.findByText("BC-011");
    const before = api.getRemboursements.mock.calls.length;
    await user().click(screen.getByRole("button", { name: /Actualiser/ }));
    await waitFor(() => expect(api.getRemboursements.mock.calls.length).toBeGreaterThan(before));
  });
});

describe("Mission 3 — Remboursements : indicateurs de trésorerie", () => {
  it("« À rembourser » = ventes annulées non réglées ; « À encaisser » = achats annulés non réglés", async () => {
    setup();
    await screen.findByText("BC-011");
    expect(within(card("À Rembourser")).getByText(hasText("70 000 Ar"))).toBeInTheDocument();
    expect(within(card("À Encaisser")).getByText(hasText("100 000 Ar"))).toBeInTheDocument();
  });

  it("les remboursements déjà réglés ne sont plus comptés dans les montants en attente", async () => {
    setup([venteRegle]); // 99 999 Ar déjà réglés
    await screen.findByText("VT-033");
    expect(within(card("À Rembourser")).getByText(hasText("0 Ar"))).toBeInTheDocument();
    expect(within(card("À Encaisser")).getByText(hasText("0 Ar"))).toBeInTheDocument();
  });

  it("additionne plusieurs remboursements de même nature", async () => {
    setup([
      makeRemboursement({ id: 1, source_type: "Vente", numero_transaction: "VT-1", montant: 10000 }),
      makeRemboursement({ id: 2, source_type: "Vente", numero_transaction: "VT-2", montant: 25000 }),
    ]);
    await screen.findByText("VT-1");
    expect(within(card("À Rembourser")).getByText(hasText("35 000 Ar"))).toBeInTheDocument();
  });

  it("met à jour les montants après le règlement d'un remboursement (rechargement des données)", async () => {
    // 1er appel : non réglé ; après PATCH, le serveur renvoie « Réglé »
    api.getRemboursements
      .mockResolvedValueOnce([achatNonRegle])
      .mockResolvedValue([{ ...achatNonRegle, statut_reglement: "Réglé" }]);
    renderWithProviders(<RemboursementsPage />);
    await screen.findByText("BC-011");
    expect(within(card("À Encaisser")).getByText(hasText("100 000 Ar"))).toBeInTheDocument();

    await user().click(within(rowOf("BC-011")).getByRole("button", { name: "Régler" }));
    await waitFor(() => expect(within(card("À Encaisser")).getByText(hasText("0 Ar"))).toBeInTheDocument());
  });
});

describe("Mission 3 — Remboursements : filtres", () => {
  it("filtre par source : Ventes, Achats, puis Tous", async () => {
    setup();
    await screen.findByText("BC-011");

    await user().click(screen.getByRole("button", { name: /Ventes/ }));
    expect(screen.queryByText("BC-011")).not.toBeInTheDocument();
    expect(screen.getByText("VT-022")).toBeInTheDocument();
    expect(screen.getByText("VT-033")).toBeInTheDocument();

    await user().click(screen.getByRole("button", { name: /Achats/ }));
    expect(screen.getByText("BC-011")).toBeInTheDocument();
    expect(screen.queryByText("VT-022")).not.toBeInTheDocument();

    await user().click(screen.getByRole("button", { name: "Tous" }));
    expect(screen.getByText("BC-011")).toBeInTheDocument();
    expect(screen.getByText("VT-022")).toBeInTheDocument();
  });

  it("recherche par numéro de transaction (insensible à la casse) et se combine avec le filtre source", async () => {
    setup();
    await screen.findByText("BC-011");
    const search = screen.getByPlaceholderText("Rechercher...");

    await user().type(search, "vt-0");
    expect(screen.queryByText("BC-011")).not.toBeInTheDocument();
    expect(screen.getByText("VT-022")).toBeInTheDocument();

    await user().click(screen.getByRole("button", { name: /Achats/ }));
    expect(screen.queryByText("VT-022")).not.toBeInTheDocument();
    expect(screen.getByText("Aucun enregistrement")).toBeInTheDocument();
  });

  it("le filtrage n'altère pas les indicateurs (calculés sur tous les remboursements)", async () => {
    setup();
    await screen.findByText("BC-011");
    await user().click(screen.getByRole("button", { name: /Achats/ }));
    expect(within(card("À Rembourser")).getByText(hasText("70 000 Ar"))).toBeInTheDocument();
  });
});

describe("Mission 3 — Remboursements : règlement", () => {
  it("« Régler » envoie statut_reglement=Réglé et confirme", async () => {
    setup();
    await screen.findByText("BC-011");
    await user().click(within(rowOf("BC-011")).getByRole("button", { name: "Régler" }));
    await waitFor(() => expect(api.updateRemboursement).toHaveBeenCalled());
    expect(api.updateRemboursement.mock.calls[0].slice(0, 2)).toEqual([1, { statut_reglement: "Réglé" }]);
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Statut mis à jour"));
  });

  it("un remboursement réglé n'offre plus le bouton « Régler » mais l'indication « Payé »", async () => {
    setup();
    await screen.findByText("VT-033");
    const row = rowOf("VT-033");
    expect(within(row).queryByRole("button", { name: "Régler" })).not.toBeInTheDocument();
    expect(within(row).getByText("Payé")).toBeInTheDocument();
  });

  it("affiche l'erreur de l'API si le règlement échoue", async () => {
    api.updateRemboursement.mockRejectedValue(new Error("Remboursement déjà clôturé"));
    setup();
    await screen.findByText("BC-011");
    await user().click(within(rowOf("BC-011")).getByRole("button", { name: "Régler" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Remboursement déjà clôturé"));
  });
});

describe("Mission 3 — Remboursements : détail de la transaction source (chargement différé)", () => {
  it("ne charge AUCUN détail de commande/vente avec la liste (chargement initial allégé)", async () => {
    setup();
    await screen.findByText("BC-011");
    expect(api.getBonCommande).not.toHaveBeenCalled();
    expect(api.getDonneeVente).not.toHaveBeenCalled();
  });

  it("origine ACHAT : recharge le bon de commande source et affiche référence, raison, lignes et total", async () => {
    api.getBonCommande.mockResolvedValue(
      makeCommande({
        id: 11,
        numero_commande: "BC-011",
        montant_total: 133000,
        lignes: [
          { id: 1, bon_commande: 11, produit: 10, product_name: "Riz 25kg", quantite: 2, prix_unitaire: 50000, montant_ligne: 100000 },
          { id: 2, bon_commande: 11, produit: 11, product_name: "Riz 5kg", quantite: 3, prix_unitaire: 11000, montant_ligne: 33000 },
        ],
      }),
    );
    setup();
    await screen.findByText("BC-011");
    await user().click(within(rowOf("BC-011")).getAllByRole("button")[0]);

    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByText("Riz 25kg");
    expect(api.getBonCommande.mock.calls[0][0]).toBe(11);
    expect(api.getDonneeVente).not.toHaveBeenCalled();
    expect(within(dialog).getByText("BC-011")).toBeInTheDocument();
    expect(within(dialog).getByText(/Commande annulée/)).toBeInTheDocument();
    expect(within(dialog).getByText("Riz 5kg")).toBeInTheDocument();
    expect(within(dialog).getByText("x3")).toBeInTheDocument();
    expect(within(dialog).getByText(hasText("133 000 Ar"))).toBeInTheDocument();
  });

  it("origine VENTE : recharge la vente source (nom de produit issu de « produit_name »)", async () => {
    api.getDonneeVente.mockResolvedValue(makeVente({ id: 22, numero_vente: "VT-022", montant_total: "70000" }));
    setup();
    await screen.findByText("VT-022");
    await user().click(within(rowOf("VT-022")).getAllByRole("button")[0]);

    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByText("Huile 1L");
    expect(api.getDonneeVente.mock.calls[0][0]).toBe(22);
    expect(api.getBonCommande).not.toHaveBeenCalled();
    expect(within(dialog).getByText("VT-022")).toBeInTheDocument();
    expect(within(dialog).getByText(/Client insatisfait/)).toBeInTheDocument();
    expect(within(dialog).getByText("x10")).toBeInTheDocument();
  });

  it("affiche « Indisponible » et une erreur si la source ne peut pas être chargée", async () => {
    api.getBonCommande.mockRejectedValue(new Error("404"));
    setup();
    await screen.findByText("BC-011");
    await user().click(within(rowOf("BC-011")).getAllByRole("button")[0]);
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Impossible de charger les détails"));
    expect(await screen.findByText("Indisponible")).toBeInTheDocument();
  });

  it("source de type « Retour » : aucun appel réseau, détail indisponible", async () => {
    setup([makeRemboursement({ id: 9, source_type: "Retour", source_id: null, numero_transaction: "RT-009" })]);
    await screen.findByText("RT-009");
    await user().click(within(rowOf("RT-009")).getAllByRole("button")[0]);
    expect(await screen.findByText("Indisponible")).toBeInTheDocument();
    expect(api.getBonCommande).not.toHaveBeenCalled();
    expect(api.getDonneeVente).not.toHaveBeenCalled();
  });

  it("affiche un indicateur de chargement pendant la récupération, puis ferme proprement", async () => {
    let resolve!: (v: ReturnType<typeof makeCommande>) => void;
    api.getBonCommande.mockReturnValue(new Promise((r) => (resolve = r)));
    setup();
    await screen.findByText("BC-011");
    await user().click(within(rowOf("BC-011")).getAllByRole("button")[0]);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Chargement...")).toBeInTheDocument();

    resolve(makeCommande({ id: 11, numero_commande: "BC-011" }));
    await within(dialog).findByText("Riz 25kg");

    await user().click(within(dialog).getByRole("button", { name: "Fermer" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
