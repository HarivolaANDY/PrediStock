/**
 * MISSION 1 — Gestion des achats (AchatPage.tsx)
 *
 * Mémoire §3.1 — problèmes traités :
 *   • saisie dynamique de plusieurs lignes + total recalculé en temps réel
 *   • sélection produit / variante (encodage « pr-{id} » / « dv-{id} »)
 *   • exclusion des commandes déjà remboursées
 * Fonctionnalités attendues :
 *   • liste + filtres de statut + recherche (n° commande / fournisseur)
 *   • création avec fournisseur (et raccourci de création), lignes dynamiques, total auto
 *   • changement de statut : payé / livré / annulé, indicateurs mis à jour
 *   • fenêtre de détail des lignes
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { BonCommande, CreateBonCommandeData } from "@/types/achatVente";

vi.mock("@/services/achatVenteService", () => ({
  getBonCommandes: vi.fn(),
  createBonCommande: vi.fn(),
  updateBonCommande: vi.fn(),
  deleteBonCommande: vi.fn(),
  searchProduits: vi.fn(),
  getFournisseurs: vi.fn(),
  getRemboursements: vi.fn(),
  payerBonCommande: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
// Formulaires produit / fournisseur : hors périmètre, simulés par de simples déclencheurs.
vi.mock("@/components/ProductForm", () => ({
  ProductForm: ({ onSubmit }: { onSubmit: (d: FormData) => void }) => (
    <button onClick={() => onSubmit(new FormData())}>MOCK-CREER-PRODUIT</button>
  ),
}));
vi.mock("@/components/SupplierForm", () => ({
  SupplierForm: ({ onSubmit }: { onSubmit: (d: unknown) => void }) => (
    <button onClick={() => onSubmit({ name: "Nouveau Fournisseur" })}>MOCK-CREER-FOURNISSEUR</button>
  ),
}));

import * as svc from "@/services/achatVenteService";
import { toast } from "sonner";
import AchatPage from "../AchatPage";
import { renderWithProviders, loginAs } from "@/test/renderWithProviders";
import { fieldByLabel, fieldsByLabel, hasText, kpiCard, rowOf } from "@/test/helpers";
import { fournisseurs, makeCommande, makeRemboursement, produits } from "@/test/fixtures";

const api = vi.mocked(svc);
const user = () => userEvent.setup();

function setup(commandes: BonCommande[] = [], rembs = [makeRemboursement({ source_type: "Vente", source_id: 999 })]) {
  api.getBonCommandes.mockResolvedValue(commandes);
  api.getRemboursements.mockResolvedValue(rembs);
  api.getFournisseurs.mockResolvedValue(fournisseurs);
  api.searchProduits.mockResolvedValue(produits);
  return renderWithProviders(<AchatPage />);
}

/** Ouvre le menu d'actions (chevron) de la ligne d'un bon de commande. */
async function openActions(ref: string) {
  const row = rowOf(ref);
  const buttons = within(row).getAllByRole("button");
  await user().click(buttons[buttons.length - 1]);
}

async function openCreateDialog() {
  await user().click(await screen.findByRole("button", { name: /Nouvelle commande/ }));
  return screen.findByRole("dialog");
}

beforeEach(() => {
  loginAs({ id: 7 });
  api.createBonCommande.mockResolvedValue(makeCommande());
  api.updateBonCommande.mockResolvedValue(makeCommande());
  api.deleteBonCommande.mockResolvedValue(undefined);
});

describe("Mission 1 — Achats : liste et indicateurs de suivi", () => {
  it("affiche pour chaque commande référence, fournisseur, statut, montant et état du paiement", async () => {
    setup([makeCommande({ numero_commande: "BC-001", montant_total: 100000, statut_paiement: "Partiel" })]);
    await screen.findByText("BC-001");
    const row = rowOf("BC-001");
    expect(within(row).getByText("Fournisseur Alpha")).toBeInTheDocument();
    expect(within(row).getByText("En attente")).toBeInTheDocument();
    expect(within(row).getByText(hasText("100 000 Ar"))).toBeInTheDocument();
    expect(within(row).getByText("Partiel")).toBeInTheDocument();
  });

  it("affiche un état de chargement puis la liste", async () => {
    api.getBonCommandes.mockReturnValue(new Promise(() => {}));
    api.getRemboursements.mockResolvedValue([]);
    api.getFournisseurs.mockResolvedValue([]);
    api.searchProduits.mockResolvedValue([]);
    renderWithProviders(<AchatPage />);
    expect(await screen.findByText("Chargement...")).toBeInTheDocument();
  });

  it("affiche un message explicite quand aucune commande n'existe", async () => {
    setup([]);
    expect(await screen.findByText("Aucun bon de commande trouvé")).toBeInTheDocument();
  });

  it("calcule les indicateurs : total (hors annulées), en attente, livrées, payé / total", async () => {
    setup([
      makeCommande({ id: 1, numero_commande: "BC-001", status: "En attente", montant_total: 100000, montant_paye: 0 }),
      makeCommande({ id: 2, numero_commande: "BC-002", status: "Livré", montant_total: 200000, montant_paye: 200000, statut_paiement: "Payé" }),
      makeCommande({ id: 3, numero_commande: "BC-003", status: "Annulé", montant_total: 50000, montant_paye: 0 }),
    ]);
    await screen.findByText("BC-001");
    expect(within(kpiCard("Total Commandes")).getByText("2")).toBeInTheDocument();
    expect(within(kpiCard("En Attente")).getByText("1")).toBeInTheDocument();
    expect(within(kpiCard("Livrées")).getByText("1")).toBeInTheDocument();
    expect(within(kpiCard("Payé / Total")).getByText(hasText("200 000 Ar / 300 000 Ar"))).toBeInTheDocument();
  });

  it("filtre par statut côté API (En attente / Livré / Annulé) et revient à « Tous les bons »", async () => {
    setup([makeCommande()]);
    await screen.findByText("BC-001");
    expect(api.getBonCommandes).toHaveBeenLastCalledWith(undefined);

    await user().click(screen.getByRole("button", { name: "Livré" }));
    await waitFor(() => expect(api.getBonCommandes).toHaveBeenLastCalledWith({ status: "Livré" }));

    await user().click(screen.getByRole("button", { name: "Annulé" }));
    await waitFor(() => expect(api.getBonCommandes).toHaveBeenLastCalledWith({ status: "Annulé" }));

    await user().click(screen.getByRole("button", { name: "Tous les bons" }));
    await waitFor(() => expect(api.getBonCommandes).toHaveBeenLastCalledWith(undefined));
  });

  it("recherche par numéro de commande ou par fournisseur (insensible à la casse)", async () => {
    setup([
      makeCommande({ id: 1, numero_commande: "BC-001", fournisseur_name: "Fournisseur Alpha" }),
      makeCommande({ id: 2, numero_commande: "BC-002", fournisseur_name: "Fournisseur Beta" }),
    ]);
    await screen.findByText("BC-001");
    const search = screen.getByPlaceholderText("N° commande, fournisseur...");

    await user().type(search, "bc-002");
    expect(screen.queryByText("BC-001")).not.toBeInTheDocument();
    expect(screen.getByText("BC-002")).toBeInTheDocument();

    await user().clear(search);
    await user().type(search, "alpha");
    expect(screen.getByText("BC-001")).toBeInTheDocument();
    expect(screen.queryByText("BC-002")).not.toBeInTheDocument();
  });

  it("pagine la liste par 10 et permet de naviguer entre les pages", async () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      makeCommande({ id: i + 1, numero_commande: `BC-${String(i + 1).padStart(3, "0")}` }),
    );
    setup(many);
    await screen.findByText("BC-001");
    expect(screen.getByText("Page 1 sur 2")).toBeInTheDocument();
    expect(screen.queryByText("BC-011")).not.toBeInTheDocument();

    await user().click(screen.getByRole("button", { name: "Suivant" }));
    expect(screen.getByText("Page 2 sur 2")).toBeInTheDocument();
    expect(screen.getByText("BC-011")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Suivant" })).toBeDisabled();

    await user().click(screen.getByRole("button", { name: "Précédent" }));
    expect(screen.getByText("BC-001")).toBeInTheDocument();
  });

  it("« Actualiser » recharge la liste depuis l'API", async () => {
    setup([makeCommande()]);
    await screen.findByText("BC-001");
    const before = api.getBonCommandes.mock.calls.length;
    await user().click(screen.getByRole("button", { name: /Actualiser/ }));
    await waitFor(() => expect(api.getBonCommandes.mock.calls.length).toBeGreaterThan(before));
  });
});

describe("Mission 1 — Achats : exclusion des commandes déjà remboursées", () => {
  it("masque une commande couverte par un remboursement de type « Achat »", async () => {
    setup(
      [
        makeCommande({ id: 1, numero_commande: "BC-001" }),
        makeCommande({ id: 2, numero_commande: "BC-002" }),
      ],
      [makeRemboursement({ source_type: "Achat", source_id: 2 })],
    );
    expect(await screen.findByText("BC-001")).toBeInTheDocument();
    expect(screen.queryByText("BC-002")).not.toBeInTheDocument();
    // et les indicateurs ne la comptent pas
    expect(within(kpiCard("Total Commandes")).getByText("1")).toBeInTheDocument();
  });

  it("ne masque pas une commande dont l'id coïncide avec un remboursement de VENTE", async () => {
    setup([makeCommande({ id: 5, numero_commande: "BC-005" })], [makeRemboursement({ source_type: "Vente", source_id: 5 })]);
    expect(await screen.findByText("BC-005")).toBeInTheDocument();
  });
});

describe("Mission 1 — Achats : actions de changement de statut", () => {
  it("commande « En attente » : propose payer, livrer, annuler et supprimer", async () => {
    setup([makeCommande({ status: "En attente", statut_paiement: "Non payé" })]);
    await screen.findByText("BC-001");
    await openActions("BC-001");
    expect(await screen.findByRole("menuitem", { name: /Marquer comme payé/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Marquer comme livré/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Annuler la commande/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Supprimer l'entrée/ })).toBeInTheDocument();
  });

  it("« Marquer comme payé » envoie statut_paiement=Payé et montant_paye=montant_total", async () => {
    setup([makeCommande({ id: 4, montant_total: 120000 })]);
    await screen.findByText("BC-001");
    await openActions("BC-001");
    await user().click(await screen.findByRole("menuitem", { name: /Marquer comme payé/ }));
    await waitFor(() => expect(api.updateBonCommande).toHaveBeenCalled());
    expect(api.updateBonCommande.mock.calls[0].slice(0, 2)).toEqual([4, { statut_paiement: "Payé", montant_paye: 120000 }]);
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Mise à jour réussie"));
  });

  it("« Marquer comme livré » envoie status=Livré puis recharge la liste", async () => {
    setup([makeCommande({ id: 4 })]);
    await screen.findByText("BC-001");
    const before = api.getBonCommandes.mock.calls.length;
    await openActions("BC-001");
    await user().click(await screen.findByRole("menuitem", { name: /Marquer comme livré/ }));
    await waitFor(() => expect(api.updateBonCommande).toHaveBeenCalled());
    expect(api.updateBonCommande.mock.calls[0].slice(0, 2)).toEqual([4, { status: "Livré" }]);
    // invalidation TanStack Query → rechargement de la liste (indicateurs mis à jour)
    await waitFor(() => expect(api.getBonCommandes.mock.calls.length).toBeGreaterThan(before));
  });

  it("« Annuler la commande » envoie status=Annulé", async () => {
    setup([makeCommande({ id: 4 })]);
    await screen.findByText("BC-001");
    await openActions("BC-001");
    await user().click(await screen.findByRole("menuitem", { name: /Annuler la commande/ }));
    await waitFor(() => expect(api.updateBonCommande).toHaveBeenCalled());
    expect(api.updateBonCommande.mock.calls[0].slice(0, 2)).toEqual([4, { status: "Annulé" }]);
  });

  it("commande livrée mais non payée : propose « Encaisser paiement » et plus « Marquer comme livré »", async () => {
    setup([makeCommande({ status: "Livré", statut_paiement: "Non payé" })]);
    await screen.findByText("BC-001");
    await openActions("BC-001");
    expect(await screen.findByRole("menuitem", { name: /Encaisser paiement/ })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /Marquer comme livré/ })).not.toBeInTheDocument();
  });

  it("commande livrée ET payée : plus aucune action de statut, seulement annuler / supprimer", async () => {
    setup([makeCommande({ status: "Livré", statut_paiement: "Payé" })]);
    await screen.findByText("BC-001");
    await openActions("BC-001");
    await screen.findByRole("menuitem", { name: /Supprimer l'entrée/ });
    expect(screen.queryByRole("menuitem", { name: /Encaisser paiement/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /Marquer comme payé/ })).not.toBeInTheDocument();
  });

  it("commande annulée : aucune action de statut n'est proposée", async () => {
    setup([makeCommande({ status: "Annulé" })]);
    await screen.findByText("BC-001");
    await openActions("BC-001");
    await screen.findByRole("menuitem", { name: /Supprimer l'entrée/ });
    expect(screen.queryByRole("menuitem", { name: /Annuler la commande/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /Marquer comme/ })).not.toBeInTheDocument();
  });

  it("affiche le message d'erreur de l'API si la mise à jour échoue", async () => {
    api.updateBonCommande.mockRejectedValue(new Error("Transition de statut interdite"));
    setup([makeCommande()]);
    await screen.findByText("BC-001");
    await openActions("BC-001");
    await user().click(await screen.findByRole("menuitem", { name: /Marquer comme livré/ }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Transition de statut interdite"));
  });
});

describe("Mission 1 — Achats : suppression", () => {
  it("demande confirmation puis supprime la commande choisie", async () => {
    setup([makeCommande({ id: 9 })]);
    await screen.findByText("BC-001");
    await openActions("BC-001");
    await user().click(await screen.findByRole("menuitem", { name: /Supprimer l'entrée/ }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/Cette action est irréversible/)).toBeInTheDocument();
    expect(api.deleteBonCommande).not.toHaveBeenCalled();

    await user().click(within(dialog).getByRole("button", { name: "Supprimer" }));
    await waitFor(() => expect(api.deleteBonCommande).toHaveBeenCalled());
    expect(api.deleteBonCommande.mock.calls[0][0]).toBe(9);
  });

  it("n'appelle pas l'API si l'utilisateur annule la suppression", async () => {
    setup([makeCommande()]);
    await screen.findByText("BC-001");
    await openActions("BC-001");
    await user().click(await screen.findByRole("menuitem", { name: /Supprimer l'entrée/ }));
    const dialog = await screen.findByRole("dialog");
    await user().click(within(dialog).getByRole("button", { name: "Annuler" }));
    expect(api.deleteBonCommande).not.toHaveBeenCalled();
  });

  // Règle « supprimable seulement sans trace » : le backend renvoie `supprimable: false` pour une
  // commande payée, livrée ou remboursée ; on l'annule au lieu de la supprimer.
  it("commande non supprimable : l'action « Supprimer » est remplacée par une explication", async () => {
    setup([makeCommande({ status: "Livré", statut_paiement: "Payé", supprimable: false })]);
    await screen.findByText("BC-001");
    await openActions("BC-001");
    await screen.findByRole("menuitem", { name: /Annuler la commande/ });
    expect(screen.queryByRole("menuitem", { name: /Supprimer l'entrée/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Non supprimable.*annulez-la plutôt/)).toBeInTheDocument();
  });

  it("commande annulée et non supprimable : indique qu'elle est conservée dans l'historique", async () => {
    setup([makeCommande({ status: "Annulé", supprimable: false })]);
    await screen.findByText("BC-001");
    await openActions("BC-001");
    expect(await screen.findByText("Conservée dans l'historique (non supprimable)")).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /Supprimer l'entrée/ })).not.toBeInTheDocument();
  });

  it("commande supprimable (ou champ absent) : l'action « Supprimer » reste proposée", async () => {
    setup([makeCommande({ id: 1, numero_commande: "BC-001", supprimable: true }), makeCommande({ id: 2, numero_commande: "BC-002" })]);
    await screen.findByText("BC-001");
    await openActions("BC-001");
    expect(await screen.findByRole("menuitem", { name: /Supprimer l'entrée/ })).toBeInTheDocument();
    await user().keyboard("{Escape}");
    await openActions("BC-002");
    expect(await screen.findByRole("menuitem", { name: /Supprimer l'entrée/ })).toBeInTheDocument();
  });

  it("si le serveur refuse la suppression, affiche son message, ferme la confirmation et recharge la liste", async () => {
    api.deleteBonCommande.mockRejectedValue(
      new Error("Suppression impossible : un paiement a été enregistré. Annulez-la plutôt : l'annulation conserve l'historique et restitue le stock."),
    );
    setup([makeCommande({ id: 9 })]); // l'écran la croit supprimable (état périmé)
    await screen.findByText("BC-001");
    const avant = api.getBonCommandes.mock.calls.length;
    await openActions("BC-001");
    await user().click(await screen.findByRole("menuitem", { name: /Supprimer l'entrée/ }));
    await user().click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Supprimer" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Suppression impossible")));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(api.getBonCommandes.mock.calls.length).toBeGreaterThan(avant));
    expect(toast.success).not.toHaveBeenCalled();
  });
});

describe("Mission 1 — Achats : fenêtre de détail", () => {
  it("liste les lignes (produit, quantité, prix unitaire, total) et le total global", async () => {
    setup([
      makeCommande({
        montant_total: 133000,
        lignes: [
          { id: 1, bon_commande: 1, produit: 10, product_name: "Riz 25kg", quantite: 2, prix_unitaire: 50000, montant_ligne: 100000 },
          { id: 2, bon_commande: 1, produit: 11, product_name: "Riz 5kg", quantite: 3, prix_unitaire: 11000, montant_ligne: 33000 },
        ],
      }),
    ]);
    await screen.findByText("BC-001");
    const eye = within(rowOf("BC-001")).getAllByRole("button")[0];
    await user().click(eye);

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Détails du bon d'achat")).toBeInTheDocument();
    expect(within(dialog).getByText("Riz 25kg")).toBeInTheDocument();
    expect(within(dialog).getByText("x2")).toBeInTheDocument();
    expect(within(dialog).getByText(hasText("50 000 Ar"))).toBeInTheDocument();
    expect(within(dialog).getByText("Riz 5kg")).toBeInTheDocument();
    expect(within(dialog).getByText("x3")).toBeInTheDocument();
    expect(within(dialog).getByText(hasText("33 000 Ar"))).toBeInTheDocument();
    expect(within(dialog).getByText("Total Global")).toBeInTheDocument();
    expect(within(dialog).getByText(hasText("133 000 Ar"))).toBeInTheDocument();

    await user().click(within(dialog).getByRole("button", { name: "Fermer" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});

describe("Mission 1 — Achats : sélection multiple", () => {
  it("« tout sélectionner » coche les lignes de la page et peut être décoché", async () => {
    setup([makeCommande({ id: 1, numero_commande: "BC-001" }), makeCommande({ id: 2, numero_commande: "BC-002" })]);
    await screen.findByText("BC-001");
    const [selectAll, ...rows] = screen.getAllByRole("checkbox");
    await user().click(selectAll);
    rows.forEach((c) => expect(c).toBeChecked());
    await user().click(selectAll);
    rows.forEach((c) => expect(c).not.toBeChecked());
  });
});

describe("Mission 1 — Achats : création d'un bon de commande (formulaire multi-lignes)", () => {
  it("ouvre le formulaire avec une ligne vide, la date du jour et « Espèces » par défaut", async () => {
    setup();
    const dialog = await openCreateDialog();
    expect(within(dialog).getByText("Nouvelle Commande Fournisseur")).toBeInTheDocument();
    expect((fieldByLabel(dialog, "Mode de paiement") as HTMLSelectElement).value).toBe("Espèces");
    expect((fieldByLabel(dialog, "Date de commande (Obligatoire)") as HTMLInputElement).value).toBe(
      new Date().toISOString().split("T")[0],
    );
    expect(fieldsByLabel(dialog, "Qté")).toHaveLength(1);
    expect(within(dialog).getByText("Montant total estimé").nextElementSibling).toHaveTextContent("0 Ar");
  });

  it("sélectionner un produit renseigne automatiquement son prix unitaire", async () => {
    setup();
    const dialog = await openCreateDialog();
    const [select] = fieldsByLabel(dialog, "Produit / Variante") as HTMLSelectElement[];
    await user().selectOptions(select, "pr-10");
    const [pu] = fieldsByLabel(dialog, "P.U (Ar)") as HTMLInputElement[];
    expect(pu.value).toBe("50000");
  });

  it("recalcule en temps réel le montant de ligne, le nombre d'articles et le total (reduce)", async () => {
    setup();
    const dialog = await openCreateDialog();
    const [select] = fieldsByLabel(dialog, "Produit / Variante") as HTMLSelectElement[];
    await user().selectOptions(select, "pr-10"); // 50 000 Ar
    fireEvent.change(fieldsByLabel(dialog, "Qté")[0], { target: { value: "2" } });

    expect(within(dialog).getAllByText(hasText("100 000 Ar")).length).toBeGreaterThanOrEqual(2); // ligne + total
    expect(within(dialog).getByText("Articles totaux").nextElementSibling).toHaveTextContent("2");

    // 2e ligne : variante « Riz 5kg » 11 000 × 3 = 33 000
    await user().click(within(dialog).getByRole("button", { name: /Ajouter une ligne/ }));
    const selects = fieldsByLabel(dialog, "Produit / Variante") as HTMLSelectElement[];
    expect(selects).toHaveLength(2);
    await user().selectOptions(selects[1], "dv-11");
    fireEvent.change(fieldsByLabel(dialog, "Qté")[1], { target: { value: "3" } });

    expect(within(dialog).getByText("Montant total estimé").nextElementSibling).toHaveTextContent("133 000 Ar");
    expect(within(dialog).getByText("Articles totaux").nextElementSibling).toHaveTextContent("5");

    // modification manuelle du prix unitaire → total recalculé
    fireEvent.change(fieldsByLabel(dialog, "P.U (Ar)")[1], { target: { value: "10000" } });
    expect(within(dialog).getByText("Montant total estimé").nextElementSibling).toHaveTextContent("130 000 Ar");
  });

  it("supprime une ligne (seulement s'il en reste plusieurs) et met à jour le total", async () => {
    setup();
    const dialog = await openCreateDialog();
    // une seule ligne → pas de bouton de suppression de ligne
    expect(dialog.querySelectorAll("svg.lucide-trash-2")).toHaveLength(0);

    await user().click(within(dialog).getByRole("button", { name: /Ajouter une ligne/ }));
    expect(fieldsByLabel(dialog, "Qté")).toHaveLength(2);
    const trash = dialog.querySelectorAll("svg.lucide-trash-2");
    expect(trash).toHaveLength(2);
    await user().click(trash[0].closest("button")!);
    expect(fieldsByLabel(dialog, "Qté")).toHaveLength(1);
  });

  it("restreint les articles proposés à ceux du fournisseur choisi", async () => {
    setup();
    const dialog = await openCreateDialog();
    const options = () =>
      within(fieldsByLabel(dialog, "Produit / Variante")[0] as HTMLSelectElement)
        .getAllByRole("option")
        .map((o) => o.textContent ?? "");

    // sans fournisseur : tout le catalogue
    expect(options().join("|")).toMatch(/Huile 1L/);
    expect(options().join("|")).toMatch(/Riz 25kg/);

    await user().selectOptions(fieldByLabel(dialog, "Fournisseur") as HTMLSelectElement, "1");
    const filtered = options().join("|");
    expect(filtered).toMatch(/Riz 25kg/);
    expect(filtered).toMatch(/\[Variante\] Riz 5kg/);
    expect(filtered).not.toMatch(/Huile 1L/);
    expect(filtered).not.toMatch(/Sucre 1kg/);
  });

  it("encode produit et variante sans ambiguïté : une variante renvoie produit_dv ET son produit parent", async () => {
    setup();
    const dialog = await openCreateDialog();
    await user().selectOptions(fieldByLabel(dialog, "Fournisseur") as HTMLSelectElement, "1");
    const [select] = fieldsByLabel(dialog, "Produit / Variante") as HTMLSelectElement[];

    await user().selectOptions(select, "dv-11");
    expect(select.value).toBe("dv-11");

    await user().click(within(dialog).getByRole("button", { name: "Valider la commande" }));
    await waitFor(() => expect(api.createBonCommande).toHaveBeenCalled());
    const payload = api.createBonCommande.mock.calls[0][0] as CreateBonCommandeData;
    expect(payload.lignes_data![0]).toMatchObject({ produit: 10, produit_dv: 11, prix_unitaire: 11000, quantite: 1 });
  });

  it("crée le bon de commande (payload complet), confirme, ferme le formulaire et recharge la liste", async () => {
    setup();
    await screen.findByText("Aucun bon de commande trouvé");
    const before = api.getBonCommandes.mock.calls.length;
    const dialog = await openCreateDialog();

    await user().selectOptions(fieldByLabel(dialog, "Fournisseur") as HTMLSelectElement, "1");
    await user().selectOptions(fieldByLabel(dialog, "Mode de paiement") as HTMLSelectElement, "Virement");
    fireEvent.change(fieldByLabel(dialog, "Livraison Prévue"), { target: { value: "2025-04-01" } });
    const [select] = fieldsByLabel(dialog, "Produit / Variante") as HTMLSelectElement[];
    await user().selectOptions(select, "pr-10");
    fireEvent.change(fieldsByLabel(dialog, "Qté")[0], { target: { value: "2" } });

    await user().click(within(dialog).getByRole("button", { name: "Valider la commande" }));

    await waitFor(() => expect(api.createBonCommande).toHaveBeenCalledTimes(1));
    const payload = api.createBonCommande.mock.calls[0][0] as CreateBonCommandeData;
    expect(payload).toMatchObject({
      fournisseur: 1,
      utilisateur: 7,
      mode_paiement: "Virement",
      livraison_prevue: "2025-04-01",
      lignes_data: [{ produit: 10, produit_dv: null, quantite: 2, prix_unitaire: 50000 }],
    });
    expect(payload.date_commande).toBe(new Date().toISOString().split("T")[0]);

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Bon de commande créé avec succès"));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(api.getBonCommandes.mock.calls.length).toBeGreaterThan(before));
  });

  it("envoie livraison_prevue=null quand la date de livraison n'est pas renseignée", async () => {
    setup();
    const dialog = await openCreateDialog();
    await user().selectOptions(fieldByLabel(dialog, "Fournisseur") as HTMLSelectElement, "1");
    await user().selectOptions(fieldsByLabel(dialog, "Produit / Variante")[0] as HTMLSelectElement, "pr-10");
    await user().click(within(dialog).getByRole("button", { name: "Valider la commande" }));
    await waitFor(() => expect(api.createBonCommande).toHaveBeenCalled());
    expect((api.createBonCommande.mock.calls[0][0] as CreateBonCommandeData).livraison_prevue).toBeNull();
  });

  it("refuse la soumission sans fournisseur", async () => {
    setup();
    const dialog = await openCreateDialog();
    await user().click(within(dialog).getByRole("button", { name: "Valider la commande" }));
    expect(toast.error).toHaveBeenCalledWith("Veuillez choisir un fournisseur");
    expect(api.createBonCommande).not.toHaveBeenCalled();
  });

  it("refuse la soumission sans date de commande", async () => {
    setup();
    const dialog = await openCreateDialog();
    await user().selectOptions(fieldByLabel(dialog, "Fournisseur") as HTMLSelectElement, "1");
    fireEvent.change(fieldByLabel(dialog, "Date de commande (Obligatoire)"), { target: { value: "" } });
    fireEvent.submit(dialog.querySelector("form")!);
    expect(toast.error).toHaveBeenCalledWith("La date de commande est obligatoire. Veuillez la préciser.");
    expect(api.createBonCommande).not.toHaveBeenCalled();
  });

  it("refuse une ligne sans produit ni variante", async () => {
    setup();
    const dialog = await openCreateDialog();
    await user().selectOptions(fieldByLabel(dialog, "Fournisseur") as HTMLSelectElement, "1");
    await user().click(within(dialog).getByRole("button", { name: "Valider la commande" }));
    expect(toast.error).toHaveBeenCalledWith("Veuillez choisir un produit ou sous-produit pour chaque ligne");
    expect(api.createBonCommande).not.toHaveBeenCalled();
  });

  it("refuse la soumission si l'utilisateur n'est pas identifié", async () => {
    localStorage.clear();
    setup();
    const dialog = await openCreateDialog();
    await user().selectOptions(fieldByLabel(dialog, "Fournisseur") as HTMLSelectElement, "1");
    await user().selectOptions(fieldsByLabel(dialog, "Produit / Variante")[0] as HTMLSelectElement, "pr-10");
    await user().click(within(dialog).getByRole("button", { name: "Valider la commande" }));
    expect(toast.error).toHaveBeenCalledWith("Utilisateur non identifié. Veuillez vous reconnecter.");
    expect(api.createBonCommande).not.toHaveBeenCalled();
  });

  it("affiche l'erreur de l'API et conserve le formulaire ouvert si la création échoue", async () => {
    api.createBonCommande.mockRejectedValue(new Error("Fournisseur inactif"));
    setup();
    const dialog = await openCreateDialog();
    await user().selectOptions(fieldByLabel(dialog, "Fournisseur") as HTMLSelectElement, "1");
    await user().selectOptions(fieldsByLabel(dialog, "Produit / Variante")[0] as HTMLSelectElement, "pr-10");
    await user().click(within(dialog).getByRole("button", { name: "Valider la commande" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Fournisseur inactif"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("« Annuler » ferme le formulaire et réinitialise sa saisie", async () => {
    setup();
    let dialog = await openCreateDialog();
    await user().selectOptions(fieldByLabel(dialog, "Fournisseur") as HTMLSelectElement, "1");
    await user().click(within(dialog).getByRole("button", { name: /Ajouter une ligne/ }));
    await user().click(within(dialog).getByRole("button", { name: "Annuler" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    dialog = await openCreateDialog();
    expect((fieldByLabel(dialog, "Fournisseur") as HTMLSelectElement).value).toBe("");
    expect(fieldsByLabel(dialog, "Qté")).toHaveLength(1);
  });

  it("raccourci : crée un fournisseur sans quitter le formulaire puis recharge la liste des fournisseurs", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 3 }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    try {
      setup();
      const dialog = await openCreateDialog();
      const before = api.getFournisseurs.mock.calls.length;
      const supplierSelect = fieldByLabel(dialog, "Fournisseur") as HTMLSelectElement;
      await user().click(supplierSelect.parentElement!.querySelector("button")!);

      await user().click(await screen.findByRole("button", { name: "MOCK-CREER-FOURNISSEUR" }));
      await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Fournisseur créé"));

      const [url, init] = fetchMock.mock.calls[0];
      expect(String(url)).toMatch(/\/api\/catalogue\/suppliers\/$/);
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body)).toEqual({ name: "Nouveau Fournisseur" });
      await waitFor(() => expect(api.getFournisseurs.mock.calls.length).toBeGreaterThan(before));
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("signale l'échec de création d'un fournisseur", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 400 })));
    try {
      setup();
      const dialog = await openCreateDialog();
      const supplierSelect = fieldByLabel(dialog, "Fournisseur") as HTMLSelectElement;
      await user().click(supplierSelect.parentElement!.querySelector("button")!);
      await user().click(await screen.findByRole("button", { name: "MOCK-CREER-FOURNISSEUR" }));
      await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Erreur lors de la création du fournisseur"));
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("Mission 1 — Achats : enregistrement d'un paiement (paiement partiel possible)", () => {
  const commande = (over: Partial<BonCommande> = {}) =>
    makeCommande({ id: 4, montant_total: 100000, montant_paye: 30000, statut_paiement: "Partiel", mode_paiement: "Virement", ...over });

  it.each([
    ["En attente", "Non payé"],
    ["En attente", "Partiel"],
    ["Livré", "Non payé"],
    ["Livré", "Partiel"],
  ] as const)("propose « Enregistrer un paiement » pour une commande %s / %s", async (statut, paiement) => {
    setup([commande({ status: statut, statut_paiement: paiement })]);
    await screen.findByText("BC-001");
    await openActions("BC-001");
    expect(await screen.findByRole("menuitem", { name: /Enregistrer un paiement/ })).toBeInTheDocument();
  });

  it("ne le propose ni pour une commande soldée ni pour une commande annulée", async () => {
    setup([
      makeCommande({ id: 1, numero_commande: "BC-PAYEE", statut_paiement: "Payé", status: "Livré" }),
      makeCommande({ id: 2, numero_commande: "BC-ANNULEE", status: "Annulé" }),
    ]);
    await screen.findByText("BC-PAYEE");
    await openActions("BC-PAYEE");
    await screen.findByRole("menuitem", { name: /Annuler la commande/ });
    expect(screen.queryByRole("menuitem", { name: /Enregistrer un paiement/ })).not.toBeInTheDocument();
    await user().keyboard("{Escape}");
    await openActions("BC-ANNULEE");
    await screen.findByRole("menuitem", { name: /Supprimer l'entrée/ });
    expect(screen.queryByRole("menuitem", { name: /Enregistrer un paiement/ })).not.toBeInTheDocument();
  });

  it("ouvre la fenêtre avec le reste à payer, enregistre un versement partiel puis recharge la liste", async () => {
    api.payerBonCommande.mockResolvedValue(commande());
    setup([commande()]);
    await screen.findByText("BC-001");
    const avant = api.getBonCommandes.mock.calls.length;
    await openActions("BC-001");
    await user().click(await screen.findByRole("menuitem", { name: /Enregistrer un paiement/ }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Reste à payer").nextElementSibling).toHaveTextContent("70 000 Ar");
    const montant = within(dialog).getByLabelText(/Montant versé/) as HTMLInputElement;
    expect(montant.value).toBe("70000"); // pré-rempli avec le solde
    fireEvent.change(montant, { target: { value: "20000" } });
    await user().click(within(dialog).getByRole("button", { name: "Enregistrer le paiement" }));

    await waitFor(() => expect(api.payerBonCommande).toHaveBeenCalledTimes(1));
    expect(api.payerBonCommande.mock.calls[0].slice(0, 2)).toEqual([4, { montant: 20000, mode_paiement: "Virement" }]);
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Paiement enregistré"));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(api.getBonCommandes.mock.calls.length).toBeGreaterThan(avant));
  });

  it("« Solder » puis validation envoie le reste à payer exact", async () => {
    api.payerBonCommande.mockResolvedValue(commande());
    setup([commande()]);
    await screen.findByText("BC-001");
    await openActions("BC-001");
    await user().click(await screen.findByRole("menuitem", { name: /Enregistrer un paiement/ }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/Montant versé/), { target: { value: "1" } });
    await user().click(within(dialog).getByRole("button", { name: "Solder" }));
    await user().click(within(dialog).getByRole("button", { name: "Enregistrer le paiement" }));
    await waitFor(() => expect(api.payerBonCommande).toHaveBeenCalled());
    expect(api.payerBonCommande.mock.calls[0][1]).toMatchObject({ montant: 70000 });
  });

  it("une erreur du serveur affiche son message et laisse la fenêtre ouverte pour corriger", async () => {
    api.payerBonCommande.mockRejectedValue(new Error("Le montant (70 000 Ar) dépasse le reste à payer (50 000 Ar)."));
    setup([commande()]);
    await screen.findByText("BC-001");
    await openActions("BC-001");
    await user().click(await screen.findByRole("menuitem", { name: /Enregistrer un paiement/ }));
    await user().click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Enregistrer le paiement" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("dépasse le reste à payer")));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("le détail liste l'historique des paiements et le lot de chaque ligne", async () => {
    setup([
      commande({
        paiements: [
          { id: 1, montant: "20000.00", mode_paiement: "Espèces", date_paiement: "2025-03-12T09:00:00Z", notes: "" },
          { id: 2, montant: "10000.00", mode_paiement: "Virement", date_paiement: "2025-03-14T09:00:00Z", notes: "Acompte" },
        ],
        lignes: [{ id: 1, bon_commande: 4, produit: 10, product_name: "Riz 25kg", quantite: 2, prix_unitaire: 50000, montant_ligne: 100000, lot_numero: "LOT-BC-001-1" }],
      }),
    ]);
    await screen.findByText("BC-001");
    await user().click(within(rowOf("BC-001")).getAllByRole("button")[0]);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Paiements")).toBeInTheDocument();
    expect(within(dialog).getByText(/Espèces/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Virement · Acompte/)).toBeInTheDocument();
    expect(within(dialog).getByText(hasText("20 000 Ar"))).toBeInTheDocument();
    expect(within(dialog).getByText(hasText("10 000 Ar"))).toBeInTheDocument();
    expect(within(dialog).getByText("LOT-BC-001-1")).toBeInTheDocument();
  });

  it("le détail n'affiche pas de section « Paiements » quand rien n'a été payé, et « — » pour une ligne sans lot", async () => {
    setup([makeCommande({ paiements: [] })]);
    await screen.findByText("BC-001");
    await user().click(within(rowOf("BC-001")).getAllByRole("button")[0]);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).queryByText("Paiements")).not.toBeInTheDocument();
    expect(within(dialog).getByText("—")).toBeInTheDocument();
  });
});
