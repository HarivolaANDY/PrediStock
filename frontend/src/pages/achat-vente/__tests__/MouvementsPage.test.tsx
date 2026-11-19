/**
 * MISSION 4 (2/2) — Historique des transactions (MouvementsPage.tsx)
 *
 * Mémoire §3.4 — problème traité :
 *   • fusion de deux ressources hétérogènes (mouvements de stock + remboursements) dans un seul
 *     tableau chronologique, avec un indicateur (isRefund) pour les distinguer
 * Fonctionnalités attendues :
 *   • historique chronologique unique des mouvements (achats, ventes) et remboursements
 *   • filtres Tous / Achats / Ventes / Remboursements + recherche par produit ou raison
 *   • indicateur visuel distinct pour les ventes réalisées à crédit
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { MouvementStock, Remboursement } from "@/types/achatVente";

vi.mock("@/services/achatVenteService", () => ({
  getMouvements: vi.fn(),
  getRemboursements: vi.fn(),
}));

import * as svc from "@/services/achatVenteService";
import MouvementsPage from "../MouvementsPage";
import { renderWithProviders } from "@/test/renderWithProviders";
import { hasText, kpiCard, rowOf } from "@/test/helpers";
import { iso, makeMouvement, makeRemboursement } from "@/test/fixtures";

const api = vi.mocked(svc);
const user = () => userEvent.setup();

const achat = makeMouvement({ id: 1, movement_type: "IN", quantity: 5, produit_name: "Riz 25kg", reason: "Livraison bon de commande", referrence: "BC-001", timestamp: iso("2025-03-11") });
const vente = makeMouvement({ id: 2, movement_type: "OUT", quantity: 3, produit_name: "Huile 1L", reason: "Vente comptoir", referrence: "VT-001", notes: null, timestamp: iso("2025-03-13") });
const venteCredit = makeMouvement({ id: 3, movement_type: "OUT", quantity: 2, produit_name: "Sucre 1kg", reason: "Vente à crédit", referrence: "VT-002", notes: "Crédit", timestamp: iso("2025-03-12") });
const rembAchat = makeRemboursement({ id: 1, source_type: "Achat", numero_transaction: "BC-009", montant: 100000, raison: "Commande annulée", date_remboursement: iso("2025-03-15") });
const rembVente = makeRemboursement({ id: 2, source_type: "Vente", numero_transaction: "VT-009", montant: 70000, raison: "Retour client", date_remboursement: iso("2025-03-10") });

function setup(mvts: MouvementStock[] = [achat, vente, venteCredit], rembs: Remboursement[] = [rembAchat, rembVente]) {
  api.getMouvements.mockResolvedValue(mvts);
  api.getRemboursements.mockResolvedValue(rembs);
  return renderWithProviders(<MouvementsPage />);
}

/** Textes de la colonne « raison / réf » dans l'ordre d'affichage des lignes. */
const refsInOrder = () =>
  screen
    .getAllByRole("row")
    .slice(1) // en-tête
    .map((r) => within(r).getAllByRole("cell")[4].textContent ?? "");

beforeEach(() => {
  api.getMouvements.mockResolvedValue([]);
  api.getRemboursements.mockResolvedValue([]);
});

describe("Mission 4 — Transactions : historique unifié", () => {
  it("fusionne mouvements de stock et remboursements dans UNE liste triée du plus récent au plus ancien", async () => {
    setup();
    await screen.findByText("Riz 25kg");
    const refs = refsInOrder();
    // 15/03 remb. achat · 13/03 vente · 12/03 vente crédit · 11/03 achat · 10/03 remb. vente
    expect(refs[0]).toContain("BC-009");
    expect(refs[1]).toContain("VT-001");
    expect(refs[2]).toContain("VT-002");
    expect(refs[3]).toContain("BC-001");
    expect(refs[4]).toContain("VT-009");
    expect(refs).toHaveLength(5);
  });

  it("une entrée de stock (IN) est présentée comme un ACHAT avec une quantité positive", async () => {
    setup();
    await screen.findByText("Riz 25kg");
    const row = rowOf("Riz 25kg");
    expect(within(row).getByText("ACHAT")).toBeInTheDocument();
    expect(within(row).getByText("+5")).toBeInTheDocument();
    expect(within(row).getByText("Livraison bon de commande")).toBeInTheDocument();
    expect(within(row).getByText("BC-001")).toBeInTheDocument();
  });

  it("une sortie de stock (OUT) est présentée comme une VENTE avec une quantité négative", async () => {
    setup();
    await screen.findByText("Huile 1L");
    const row = rowOf("Huile 1L");
    expect(within(row).getByText("VENTE")).toBeInTheDocument();
    expect(within(row).getByText("-3")).toBeInTheDocument();
  });

  it("un autre type de mouvement conserve son libellé technique", async () => {
    setup([makeMouvement({ id: 7, movement_type: "ADJUSTMENT", produit_name: "Farine", quantity: 1 })], []);
    await screen.findByText("Farine");
    expect(within(rowOf("Farine")).getByText("ADJUSTMENT")).toBeInTheDocument();
  });

  it("un remboursement d'ACHAT est signalé « REMB. ENCAISSER » avec son montant (et non une quantité)", async () => {
    setup();
    await screen.findByText("BC-009");
    const row = rowOf("BC-009");
    expect(within(row).getByText("REMB. ENCAISSER")).toBeInTheDocument();
    expect(within(row).getByText("Remboursement financier")).toBeInTheDocument();
    expect(within(row).getByText(hasText("100 000 Ar"))).toBeInTheDocument();
    expect(within(row).getByText("Commande annulée")).toBeInTheDocument();
  });

  it("un remboursement de VENTE est signalé « REMB. VERSER »", async () => {
    setup();
    await screen.findByText("VT-009");
    const row = rowOf("VT-009");
    expect(within(row).getByText("REMB. VERSER")).toBeInTheDocument();
    expect(within(row).getByText(hasText("70 000 Ar"))).toBeInTheDocument();
  });

  it("affiche l'indicateur CRÉDIT uniquement pour une vente (OUT) réalisée à crédit", async () => {
    setup();
    await screen.findByText("Sucre 1kg");
    expect(within(rowOf("Sucre 1kg")).getByText("CRÉDIT")).toBeInTheDocument();
    expect(within(rowOf("Huile 1L")).queryByText("CRÉDIT")).not.toBeInTheDocument();
    expect(within(rowOf("Riz 25kg")).queryByText("CRÉDIT")).not.toBeInTheDocument();
  });

  it("n'affiche pas l'indicateur CRÉDIT sur un achat dont les notes contiennent « Crédit »", async () => {
    setup([makeMouvement({ id: 8, movement_type: "IN", produit_name: "Lait", notes: "Crédit" })], []);
    await screen.findByText("Lait");
    expect(within(rowOf("Lait")).queryByText("CRÉDIT")).not.toBeInTheDocument();
  });

  it("choisit le meilleur nom de produit disponible, sinon #<id>", async () => {
    setup(
      [
        makeMouvement({ id: 1, produit_display_name: "Riz 25kg — Sac", produit_name: "Riz" }),
        makeMouvement({ id: 2, produit_name: undefined, produit_dv_name: "Variante 5kg", produit: null, produit_dv: 11 }),
        makeMouvement({ id: 3, produit_name: undefined, produit_dv_name: undefined, produit: 42, produit_dv: null }),
      ],
      [],
    );
    expect(await screen.findByText("Riz 25kg — Sac")).toBeInTheDocument();
    expect(screen.getByText("Variante 5kg")).toBeInTheDocument();
    expect(screen.getByText("#42")).toBeInTheDocument();
  });

  it("affiche « — » / « N/A » quand raison et référence sont absentes", async () => {
    setup([makeMouvement({ reason: null, referrence: null })], []);
    await screen.findByText("Riz 25kg");
    const row = rowOf("Riz 25kg");
    expect(within(row).getByText("—")).toBeInTheDocument();
    expect(within(row).getByText("N/A")).toBeInTheDocument();
  });

  it("affiche un état de chargement tant que l'une des deux sources n'a pas répondu", async () => {
    api.getMouvements.mockResolvedValue([achat]);
    api.getRemboursements.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<MouvementsPage />);
    expect(await screen.findByText("Chargement...")).toBeInTheDocument();
  });

  it("affiche « Aucune transaction trouvée » quand il n'y a rien", async () => {
    setup([], []);
    expect(await screen.findByText("Aucune transaction trouvée")).toBeInTheDocument();
  });

  it("« Actualiser » recharge les mouvements ET les remboursements", async () => {
    setup();
    await screen.findByText("Riz 25kg");
    const m = api.getMouvements.mock.calls.length;
    const r = api.getRemboursements.mock.calls.length;
    await user().click(screen.getByRole("button", { name: /Actualiser/ }));
    await waitFor(() => {
      expect(api.getMouvements.mock.calls.length).toBeGreaterThan(m);
      expect(api.getRemboursements.mock.calls.length).toBeGreaterThan(r);
    });
  });
});

describe("Mission 4 — Transactions : indicateurs", () => {
  it("compte entrées (achats), sorties (ventes), remboursements et transactions filtrées", async () => {
    setup();
    await screen.findByText("Riz 25kg");
    expect(within(kpiCard("Transactions Filtrées")).getByText("5")).toBeInTheDocument();
    expect(within(kpiCard("Achats (Entrées)")).getByText("1")).toBeInTheDocument();
    expect(within(kpiCard("Ventes (Sorties)")).getByText("2")).toBeInTheDocument();
    expect(within(kpiCard("Remboursements")).getByText("2")).toBeInTheDocument();
  });
});

describe("Mission 4 — Transactions : filtres Tous / Achats / Ventes / Remboursements", () => {
  it("« ACHATS » : filtre côté client (un seul chargement) et n'affiche que les entrées de stock", async () => {
    setup();
    await screen.findByText("Riz 25kg");
    const appels = api.getMouvements.mock.calls.length;
    await user().click(screen.getByRole("button", { name: "ACHATS" }));
    expect(screen.getByText("Riz 25kg")).toBeInTheDocument();
    expect(screen.queryByText("Huile 1L")).not.toBeInTheDocument();
    expect(screen.queryByText("BC-009")).not.toBeInTheDocument(); // remboursements masqués
    // aucun filtre serveur sur le sens : il séparerait un achat de son annulation
    expect(api.getMouvements.mock.calls.length).toBe(appels);
    expect(api.getMouvements.mock.calls.every((c) => c.length === 0 || c[0] === undefined)).toBe(true);
  });

  it("« VENTES » : n'affiche que les sorties de stock", async () => {
    setup();
    await screen.findByText("Riz 25kg");
    await user().click(screen.getByRole("button", { name: "VENTES" }));
    expect(screen.queryByText("Riz 25kg")).not.toBeInTheDocument();
    expect(screen.getByText("Huile 1L")).toBeInTheDocument();
    expect(screen.getByText("Sucre 1kg")).toBeInTheDocument();
    expect(screen.queryByText("VT-009")).not.toBeInTheDocument();
  });

  it("« REMBOURSEMENTS » : n'affiche que les remboursements", async () => {
    setup();
    await screen.findByText("Riz 25kg");
    await user().click(screen.getByRole("button", { name: "REMBOURSEMENTS" }));
    expect(screen.getByText("BC-009")).toBeInTheDocument();
    expect(screen.getByText("VT-009")).toBeInTheDocument();
    expect(screen.queryByText("Riz 25kg")).not.toBeInTheDocument();
    expect(within(kpiCard("Transactions Filtrées")).getByText("2")).toBeInTheDocument();
  });

  it("« TOUS » rétablit l'historique complet", async () => {
    setup();
    await screen.findByText("Riz 25kg");
    await user().click(screen.getByRole("button", { name: "VENTES" }));
    await user().click(screen.getByRole("button", { name: "TOUS" }));
    expect(await screen.findByText("Riz 25kg")).toBeInTheDocument();
    expect(screen.getByText("BC-009")).toBeInTheDocument();
    expect(refsInOrder()).toHaveLength(5);
  });
});

// Un achat/une vente annulé(e) conserve son mouvement d'origine ET un mouvement inverse (historique).
describe("Mission 4 — Transactions : annulations (mouvements inverses)", () => {
  const achatAnnule = makeMouvement({
    id: 10, movement_type: "IN", quantity: 5, produit_name: "Riz 25kg", reason: "Livraison BC BC-050",
    referrence: "BC-LINE-50", annule_par: 11, timestamp: iso("2025-03-11"),
  });
  const achatInverse = makeMouvement({
    id: 11, movement_type: "OUT", quantity: 5, produit_name: "Riz 25kg", reason: "Annulation de la livraison BC BC-050",
    referrence: "BC-LINE-50", annule: 10, timestamp: iso("2025-03-12"),
  });
  const venteAnnulee = makeMouvement({
    id: 12, movement_type: "OUT", quantity: 3, produit_name: "Huile 1L", reason: "Vente VT-050",
    referrence: "SALE-50-1", notes: "Crédit", annule_par: 13, timestamp: iso("2025-03-13"),
  });
  const venteInverse = makeMouvement({
    id: 13, movement_type: "IN", quantity: 3, produit_name: "Huile 1L", reason: "Annulation vente VT-050",
    referrence: "SALE-50-1", annule: 12, timestamp: iso("2025-03-14"),
  });
  const achatReel = makeMouvement({
    id: 14, movement_type: "IN", quantity: 2, produit_name: "Sucre 1kg", reason: "Livraison BC BC-051",
    referrence: "BC-LINE-51", timestamp: iso("2025-03-10"),
  });
  const venteReelle = makeMouvement({
    id: 15, movement_type: "OUT", quantity: 1, produit_name: "Café 250g", reason: "Vente VT-051",
    referrence: "SALE-51-1", timestamp: iso("2025-03-09"),
  });
  const tous = [achatAnnule, achatInverse, venteAnnulee, venteInverse, achatReel, venteReelle];

  const rowByReason = (reason: string) => rowOf(reason);

  it("l'inverse d'un ACHAT s'affiche « ANNUL. ACHAT » avec une quantité négative, et non comme une VENTE", async () => {
    setup(tous, []);
    await screen.findByText("Annulation de la livraison BC BC-050");
    const row = rowByReason("Annulation de la livraison BC BC-050");
    expect(within(row).getByText("ANNUL. ACHAT")).toBeInTheDocument();
    expect(within(row).queryByText("VENTE")).not.toBeInTheDocument();
    expect(within(row).getByText("-5")).toBeInTheDocument(); // sortie de stock
  });

  it("l'inverse d'une VENTE s'affiche « ANNUL. VENTE » avec une quantité positive, et non comme un ACHAT", async () => {
    setup(tous, []);
    await screen.findByText("Annulation vente VT-050");
    const row = rowByReason("Annulation vente VT-050");
    expect(within(row).getByText("ANNUL. VENTE")).toBeInTheDocument();
    expect(within(row).queryByText("ACHAT")).not.toBeInTheDocument();
    expect(within(row).getByText("+3")).toBeInTheDocument(); // entrée de stock
  });

  it("l'original annulé reste visible, repéré « ANNULÉ » et atténué", async () => {
    setup(tous, []);
    await screen.findByText("Livraison BC BC-050");
    const row = rowByReason("Livraison BC BC-050");
    expect(within(row).getByText("ACHAT")).toBeInTheDocument();
    expect(within(row).getByText("ANNULÉ")).toBeInTheDocument();
    expect(row.className).toContain("opacity-60");
    // un mouvement non annulé n'a ni marque ni atténuation
    const reel = rowByReason("Livraison BC BC-051");
    expect(within(reel).queryByText("ANNULÉ")).not.toBeInTheDocument();
    expect(reel.className).not.toContain("opacity-60");
  });

  it("une vente à crédit annulée garde son indicateur CRÉDIT, mais pas son inverse", async () => {
    setup(tous, []);
    await screen.findByText("Vente VT-050");
    expect(within(rowByReason("Vente VT-050")).getByText("CRÉDIT")).toBeInTheDocument();
    expect(within(rowByReason("Annulation vente VT-050")).queryByText("CRÉDIT")).not.toBeInTheDocument();
  });

  it("affiche l'original et son annulation dans l'ordre chronologique (le plus récent d'abord)", async () => {
    setup([achatAnnule, achatInverse], []);
    await screen.findByText("Livraison BC BC-050");
    const refs = refsInOrder();
    expect(refs[0]).toContain("Annulation de la livraison BC BC-050"); // 12/03
    expect(refs[1]).toContain("Livraison BC BC-050"); // 11/03
  });

  it("« ACHATS » regroupe un achat et son annulation (de sens opposé) et exclut les ventes et leurs annulations", async () => {
    setup(tous, []);
    await screen.findByText("Livraison BC BC-050");
    await user().click(screen.getByRole("button", { name: "ACHATS" }));
    expect(screen.getByText("Livraison BC BC-050")).toBeInTheDocument();
    expect(screen.getByText("Annulation de la livraison BC BC-050")).toBeInTheDocument(); // OUT, mais nature « achat »
    expect(screen.getByText("Livraison BC BC-051")).toBeInTheDocument();
    expect(screen.queryByText("Vente VT-050")).not.toBeInTheDocument();
    expect(screen.queryByText("Annulation vente VT-050")).not.toBeInTheDocument(); // IN, mais nature « vente »
    expect(screen.queryByText("Vente VT-051")).not.toBeInTheDocument();
  });

  it("« VENTES » regroupe une vente et son annulation (de sens opposé) et exclut les achats et leurs annulations", async () => {
    setup(tous, []);
    await screen.findByText("Livraison BC BC-050");
    await user().click(screen.getByRole("button", { name: "VENTES" }));
    expect(screen.getByText("Vente VT-050")).toBeInTheDocument();
    expect(screen.getByText("Annulation vente VT-050")).toBeInTheDocument();
    expect(screen.getByText("Vente VT-051")).toBeInTheDocument();
    expect(screen.queryByText("Livraison BC BC-050")).not.toBeInTheDocument();
    expect(screen.queryByText("Annulation de la livraison BC BC-050")).not.toBeInTheDocument();
  });

  it("les indicateurs Achats/Ventes ne comptent que les transactions réelles (hors annulées et inverses)", async () => {
    setup(tous, []);
    await screen.findByText("Livraison BC BC-050");
    expect(within(kpiCard("Achats (Entrées)")).getByText("1")).toBeInTheDocument(); // BC-051 seul
    expect(within(kpiCard("Ventes (Sorties)")).getByText("1")).toBeInTheDocument(); // VT-051 seule
    expect(within(kpiCard("Transactions Filtrées")).getByText("6")).toBeInTheDocument(); // l'historique reste complet
  });

  it("la recherche retrouve les annulations par leur motif", async () => {
    setup(tous, []);
    await screen.findByText("Livraison BC BC-050");
    await user().type(screen.getByPlaceholderText("Rechercher produit, raison..."), "annulation");
    expect(screen.getByText("Annulation de la livraison BC BC-050")).toBeInTheDocument();
    expect(screen.getByText("Annulation vente VT-050")).toBeInTheDocument();
    expect(screen.queryByText("Livraison BC BC-051")).not.toBeInTheDocument();
  });

  it("les mouvements sans lien d'annulation (anciens enregistrements) s'affichent comme avant", async () => {
    setup([makeMouvement({ id: 20, annule: undefined, annule_par: undefined })], []);
    const row = rowOf(await screen.findByText("Livraison bon de commande").then((e) => e.textContent!));
    expect(within(row).getByText("ACHAT")).toBeInTheDocument();
    expect(within(row).queryByText("ANNULÉ")).not.toBeInTheDocument();
  });
});

describe("Mission 4 — Transactions : recherche", () => {
  const search = () => screen.getByPlaceholderText("Rechercher produit, raison...");

  it("recherche par nom de produit", async () => {
    setup();
    await screen.findByText("Riz 25kg");
    await user().type(search(), "huile");
    expect(screen.getByText("Huile 1L")).toBeInTheDocument();
    expect(screen.queryByText("Riz 25kg")).not.toBeInTheDocument();
  });

  it("recherche par raison", async () => {
    setup();
    await screen.findByText("Riz 25kg");
    await user().type(search(), "livraison");
    expect(screen.getByText("Riz 25kg")).toBeInTheDocument();
    expect(screen.queryByText("Huile 1L")).not.toBeInTheDocument();
  });

  it("recherche par référence (inclut les remboursements, dont la référence est le n° de transaction)", async () => {
    setup();
    await screen.findByText("Riz 25kg");
    await user().type(search(), "bc-009");
    expect(screen.getByText("BC-009")).toBeInTheDocument();
    expect(screen.queryByText("Riz 25kg")).not.toBeInTheDocument();
    expect(within(kpiCard("Transactions Filtrées")).getByText("1")).toBeInTheDocument();
  });

  it("recherche sans résultat : message dédié", async () => {
    setup();
    await screen.findByText("Riz 25kg");
    await user().type(search(), "zzzz");
    expect(screen.getByText("Aucune transaction trouvée")).toBeInTheDocument();
  });

  it("la recherche se combine avec le filtre de type", async () => {
    setup();
    await screen.findByText("Riz 25kg");
    await user().click(screen.getByRole("button", { name: "VENTES" }));
    await user().type(search(), "sucre");
    expect(screen.getByText("Sucre 1kg")).toBeInTheDocument();
    expect(screen.queryByText("Huile 1L")).not.toBeInTheDocument();
  });
});

describe("Mission 4 — Transactions : traçabilité par lot", () => {
  it("affiche le numéro de lot sous la référence d'une entrée livrée", async () => {
    setup([makeMouvement({ id: 1, referrence: "BC-LINE-5", reason: "Livraison BC BC-00005", lot_numero: "LOT-BC-00005-5" })], []);
    await screen.findByText("Livraison BC BC-00005");
    const row = rowOf("Riz 25kg");
    expect(within(row).getByText("Lot LOT-BC-00005-5")).toBeInTheDocument();
  });

  it("l'annulation d'une livraison porte le même lot que l'entrée annulée", async () => {
    setup([
      makeMouvement({ id: 10, movement_type: "IN", reason: "Livraison BC BC-00005", annule_par: 11, lot_numero: "LOT-BC-00005-5", timestamp: iso("2025-03-11") }),
      makeMouvement({ id: 11, movement_type: "OUT", reason: "Annulation de la livraison BC BC-00005", annule: 10, lot_numero: "LOT-BC-00005-5", timestamp: iso("2025-03-12") }),
    ], []);
    await screen.findByText("Annulation de la livraison BC BC-00005");
    expect(screen.getAllByText("Lot LOT-BC-00005-5")).toHaveLength(2);
  });

  it("n'affiche rien de plus pour un mouvement sans lot (vente, ancien enregistrement)", async () => {
    setup([makeMouvement({ id: 2, movement_type: "OUT", reason: "Vente VT-001", lot_numero: null })], []);
    await screen.findByText("Vente VT-001");
    expect(screen.queryByText(/^Lot /)).not.toBeInTheDocument();
  });
});
