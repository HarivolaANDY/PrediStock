/**
 * INTÉGRATION — module Achats & Ventes dans son ensemble
 *
 * Résultat attendu (discours) :
 *   « à travers cette plateforme, on doit avoir une interface où gérer les achats et ventes
 *     avec un bon suivi, ainsi que les autres fonctionnalités, toujours bien opérationnelles. »
 *
 * Mémoire §2.2.2 : le module regroupe CINQ écrans dans le menu « Achats & Ventes ».
 * Mémoire §3 : TanStack Query maintient les écrans synchronisés « sans état global dédié ».
 *
 * Ces tests montent la vraie sidebar, les vrais écrans et un vrai routeur, avec un QueryClient
 * partagé (comme en production), face à un faux backend en mémoire qui reproduit les effets
 * métier des signaux Django :
 *   • livraison d'un achat / d'une vente  → mouvement de stock (IN / OUT)
 *   • annulation d'une transaction payée  → remboursement « Non réglé »
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within, fireEvent } from "@testing-library/react";

vi.mock("@/services/achatVenteService", () => ({
  getBonCommandes: vi.fn(),
  getBonCommande: vi.fn(),
  createBonCommande: vi.fn(),
  updateBonCommande: vi.fn(),
  deleteBonCommande: vi.fn(),
  getDonneeVentes: vi.fn(),
  getDonneeVente: vi.fn(),
  createDonneeVente: vi.fn(),
  updateDonneeVente: vi.fn(),
  deleteDonneeVente: vi.fn(),
  getRemboursements: vi.fn(),
  updateRemboursement: vi.fn(),
  getAnalytics: vi.fn(),
  getMouvements: vi.fn(),
  getFournisseurs: vi.fn(),
  searchProduits: vi.fn(),
  payerBonCommande: vi.fn(),
  payerDonneeVente: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/components/ProductForm", () => ({ ProductForm: () => null }));
vi.mock("@/components/SupplierForm", () => ({ SupplierForm: () => null }));
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AreaChart: ({ children }: { children: React.ReactNode }) => <div data-testid="area-chart">{children}</div>,
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}));

import { loginAs } from "@/test/renderWithProviders";
import { fieldByLabel, fieldsByLabel, hasText, rowOf } from "@/test/helpers";
import { makeCommande, makeVente } from "@/test/fixtures";
import {
  db, goTo, heading, installFakeBackend, kpiCard, now, openModuleMenu, ref, renderModule, rowAction, SCREENS, user,
} from "@/test/moduleAchatsVentes.harness";

beforeEach(() => {
  loginAs({ id: 1, username: "andy" });
  installFakeBackend();
});

describe("Intégration — l'interface Achats & Ventes est complète et accessible", () => {
  it("le menu « Achats & Ventes » donne accès aux cinq écrans du module", async () => {
    renderModule();
    await openModuleMenu();
    for (const s of SCREENS) {
      expect(screen.getByRole("link", { name: s.link })).toBeInTheDocument();
    }
  });

  it.each(SCREENS)("l'écran « $link » se charge sans erreur et affiche son titre", async ({ link, heading: title }) => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    renderModule();
    await openModuleMenu();
    await goTo(link);
    expect(await heading(title)).toBeInTheDocument();
    // un écran « toujours opérationnel » ne doit déclencher aucune erreur React
    expect(spy.mock.calls.filter((c) => /Warning|Error: Uncaught|Cannot read/.test(String(c[0])))).toEqual([]);
  });

  it("on peut parcourir successivement les cinq écrans sans perdre le menu", async () => {
    renderModule();
    await openModuleMenu();
    for (const s of SCREENS) await goTo(s.link);
    await goTo("Achats");
    expect(screen.getByRole("link", { name: "Transactions" })).toBeInTheDocument();
  });

  it("chaque écran reste utilisable lorsque l'API ne renvoie encore aucune donnée", async () => {
    renderModule();
    await openModuleMenu();
    expect(await screen.findByText("Aucun bon de commande trouvé")).toBeInTheDocument();
    await goTo("Ventes");
    expect(await screen.findByText("Aucune vente enregistrée")).toBeInTheDocument();
    await goTo("Remboursements");
    expect(await screen.findByText("Aucun enregistrement")).toBeInTheDocument();
    await goTo("Analyse");
    expect(await screen.findByText("Aucune donnée graphable")).toBeInTheDocument();
    await goTo("Transactions");
    expect(await screen.findByText("Aucune transaction trouvée")).toBeInTheDocument();
  });
});

describe("Intégration — suivi complet d'un achat, de la commande à l'analyse financière", () => {
  it("commande → paiement → livraison → mouvement de stock → analyse, écrans synchronisés", async () => {
    renderModule();
    await openModuleMenu();

    // 1. Achats : création d'un bon de commande de 2 × Riz 25kg
    await user().click(await screen.findByRole("button", { name: /Nouvelle commande/ }));
    const dialog = await screen.findByRole("dialog");
    await user().selectOptions(fieldByLabel(dialog, "Fournisseur") as HTMLSelectElement, "1");
    await user().selectOptions(fieldsByLabel(dialog, "Produit / Variante")[0] as HTMLSelectElement, "pr-10");
    fireEvent.change(fieldsByLabel(dialog, "Qté")[0], { target: { value: "2" } });
    await user().click(within(dialog).getByRole("button", { name: "Valider la commande" }));
    await screen.findByText("BC-001");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(within(rowOf("BC-001")).getByText("En attente")).toBeInTheDocument();
    expect(within(rowOf("BC-001")).getByText(hasText("100 000 Ar"))).toBeInTheDocument();
    expect(within(kpiCard("Total Commandes")).getByText("1")).toBeInTheDocument();
    expect(within(kpiCard("En Attente")).getByText("1")).toBeInTheDocument();

    // 2. Paiement : l'indicateur « Payé / Total » suit immédiatement
    await rowAction("BC-001", /Marquer comme payé/);
    await waitFor(() => expect(within(rowOf("BC-001")).getByText("Payé")).toBeInTheDocument());
    expect(within(kpiCard("Payé / Total")).getByText(hasText("100 000 Ar / 100 000 Ar"))).toBeInTheDocument();

    // 3. Livraison : « En attente » → « Livrées »
    await rowAction("BC-001", /Marquer comme livré/);
    await waitFor(() => expect(within(rowOf("BC-001")).getByText("Livré")).toBeInTheDocument());
    expect(within(kpiCard("Livrées")).getByText("1")).toBeInTheDocument();
    expect(within(kpiCard("En Attente")).getByText("0")).toBeInTheDocument();

    // 4. Transactions : la livraison a généré un mouvement d'entrée visible dans l'historique
    await goTo("Transactions");
    const mvt = await screen.findByText("BC-001");
    const mvtRow = mvt.closest("tr")!;
    expect(within(mvtRow).getByText("ACHAT")).toBeInTheDocument();
    expect(within(mvtRow).getByText("+2")).toBeInTheDocument();
    expect(within(mvtRow).getByText("Riz 25kg")).toBeInTheDocument();

    // 5. Analyse : l'achat livré est consolidé dans la trésorerie
    await goTo("Analyse");
    await waitFor(() => expect(within(kpiCard("Total Achats")).getByText(hasText("100 000 Ar"))).toBeInTheDocument());
    expect(within(kpiCard("Total Achats")).getByText("1 cmd")).toBeInTheDocument();
    expect(within(kpiCard("Marges (est.)")).getByText(hasText("-100 000 Ar"))).toBeInTheDocument();
    expect(screen.getByTestId("area-chart")).toBeInTheDocument();
  });
});

describe("Intégration — suivi complet d'une vente, de la saisie au remboursement", () => {
  it("vente → paiement → livraison → analyse → annulation → remboursement réglé", async () => {
    // Un achat livré existe déjà (100 000 Ar), la vente se fait ensuite.
    db.commandes.push(makeCommande({ id: 1, numero_commande: "BC-001", status: "Livré", statut_paiement: "Payé", montant_total: 100000, montant_paye: 100000, creer_le: now() }));
    db.seq.cmd = 1;
    renderModule("/buy-sell/ventes");
    await openModuleMenu();

    // 1. Ventes : saisie d'une vente directe de 1 × Riz 25kg (50 000 Ar)
    await user().click(await screen.findByRole("button", { name: /Nouvelle vente/ }));
    const dialog = await screen.findByRole("dialog");
    await user().selectOptions(fieldsByLabel(dialog, "Produit / Variante")[0] as HTMLSelectElement, "pr-10");
    await user().click(within(dialog).getByRole("button", { name: "Confirmer la vente" }));
    await screen.findByText("VT-001");
    expect(within(kpiCard("Total Ventes")).getByText("1")).toBeInTheDocument();

    // 2. Paiement + livraison
    await rowAction("VT-001", /Marquer comme payé/);
    await waitFor(() => expect(within(rowOf("VT-001")).getByText("Payé")).toBeInTheDocument());
    await rowAction("VT-001", /Marquer comme livré/);
    await waitFor(() => expect(within(rowOf("VT-001")).getByText("Livré")).toBeInTheDocument());

    // 3. Transactions : sortie de stock « VENTE »
    await goTo("Transactions");
    const mvtRow = (await screen.findByText("VT-001")).closest("tr")!;
    expect(within(mvtRow).getByText("VENTE")).toBeInTheDocument();
    expect(within(mvtRow).getByText("-1")).toBeInTheDocument();

    // 4. Analyse : marge = 50 000 (vente) − 100 000 (achat) = −50 000
    await goTo("Analyse");
    await waitFor(() => expect(within(kpiCard("Total Ventes")).getByText(hasText("50 000 Ar"))).toBeInTheDocument());
    expect(within(kpiCard("Marges (est.)")).getByText(hasText("-50 000 Ar"))).toBeInTheDocument();

    // 5. Annulation de la vente payée → un remboursement « à rembourser » apparaît
    await goTo("Ventes");
    await rowAction("VT-001", /Annuler la vente/);
    await goTo("Remboursements");
    const rembRow = (await screen.findByText("VT-001")).closest("tr")!;
    expect(within(rembRow).getByText("Vente")).toBeInTheDocument();
    expect(within(rembRow).getByText("Non réglé")).toBeInTheDocument();
    expect(within(kpiCard("À Rembourser")).getByText(hasText("50 000 Ar"))).toBeInTheDocument();

    // 6. La vente remboursée disparaît de la liste des ventes
    await goTo("Ventes");
    await screen.findByText("Aucune vente enregistrée");

    // 7. Analyse : la vente annulée n'est plus comptée ; le remboursement en cours pèse sur la marge
    await goTo("Analyse");
    await waitFor(() => expect(within(kpiCard("Total Ventes")).getByText(hasText("0 Ar"))).toBeInTheDocument());
    expect(within(kpiCard("Remboursements")).getByText("À rembourser").nextElementSibling).toHaveTextContent("50 000 Ar");
    expect(within(kpiCard("Marges (est.)")).getByText(hasText("-150 000 Ar"))).toBeInTheDocument(); // 0 − 100 000 − 50 000

    // 8. Règlement du remboursement → les montants en attente retombent à zéro
    await goTo("Remboursements");
    await user().click(within((await screen.findByText("VT-001")).closest("tr")!).getByRole("button", { name: "Régler" }));
    await waitFor(() => expect(within(kpiCard("À Rembourser")).getByText(hasText("0 Ar"))).toBeInTheDocument());

    // 9. L'historique des transactions garde la trace de la vente, de son annulation ET du remboursement
    await goTo("Transactions");
    const lignes = (await screen.findAllByText("VT-001")).map((e) => e.closest("tr")!);
    expect(lignes).toHaveLength(3);
    const contient = (texte: string) => lignes.find((r) => within(r).queryByText(texte));
    expect(contient("REMB. VERSER")).toBeDefined();
    const annulation = contient("ANNUL. VENTE")!;
    expect(annulation).toBeDefined();
    expect(within(annulation).getByText("+1")).toBeInTheDocument(); // le stock est restitué
    const originale = contient("ANNULÉ")!;
    expect(within(originale).getByText("VENTE")).toBeInTheDocument();
    expect(within(originale).getByText("-1")).toBeInTheDocument();
  });
});

describe("Intégration — historique conservé après annulation d'un achat livré", () => {
  it("l'achat livré puis annulé laisse l'entrée d'origine (annulée) et son mouvement inverse dans Transactions", async () => {
    db.commandes.push(makeCommande({ id: 1, numero_commande: "BC-001", status: "En attente", statut_paiement: "Non payé", montant_paye: 0, creer_le: now() }));
    renderModule("/buy-sell/achats");
    await openModuleMenu();
    await screen.findByText("BC-001");

    await rowAction("BC-001", /Marquer comme livré/);
    await waitFor(() => expect(within(rowOf("BC-001")).getByText("Livré")).toBeInTheDocument());
    await rowAction("BC-001", /Annuler la commande/);
    await waitFor(() => expect(within(rowOf("BC-001")).getByText("Annulé")).toBeInTheDocument());

    await goTo("Transactions");
    const lignes = (await screen.findAllByText("BC-001")).map((e) => e.closest("tr")!);
    expect(lignes).toHaveLength(2);

    const annulation = lignes.find((r) => within(r).queryByText("ANNUL. ACHAT"))!;
    expect(annulation).toBeDefined();
    expect(within(annulation).queryByText("VENTE")).not.toBeInTheDocument(); // sortie, mais pas une vente
    expect(within(annulation).getByText("-2")).toBeInTheDocument(); // la commande de test porte sur 2 unités

    const originale = lignes.find((r) => within(r).queryByText("ANNULÉ"))!;
    expect(within(originale).getByText("ACHAT")).toBeInTheDocument();
    expect(within(originale).getByText("+2")).toBeInTheDocument();

    // les compteurs ne retiennent que les transactions réelles : aucune ici
    expect(within(kpiCard("Achats (Entrées)")).getByText("0")).toBeInTheDocument();
    expect(within(kpiCard("Ventes (Sorties)")).getByText("0")).toBeInTheDocument();
  });
});

describe("Intégration — achat annulé après paiement", () => {
  it("le remboursement « à encaisser » est visible dans Remboursements, Transactions et Analyse", async () => {
    db.commandes.push(makeCommande({ id: 1, numero_commande: "BC-001", status: "En attente", statut_paiement: "Payé", montant_total: 80000, montant_paye: 80000, creer_le: now() }));
    renderModule("/buy-sell/achats");
    await openModuleMenu();
    await screen.findByText("BC-001");

    await rowAction("BC-001", /Annuler la commande/);

    await goTo("Remboursements");
    const row = (await screen.findByText("BC-001")).closest("tr")!;
    expect(within(row).getByText("Achat")).toBeInTheDocument();
    expect(within(kpiCard("À Encaisser")).getByText(hasText("80 000 Ar"))).toBeInTheDocument();

    await goTo("Transactions");
    const trRow = (await screen.findByText("BC-001")).closest("tr")!;
    expect(within(trRow).getByText("REMB. ENCAISSER")).toBeInTheDocument();

    await goTo("Analyse");
    await waitFor(() => expect(within(kpiCard("Remboursements")).getByText("À encaisser").nextElementSibling).toHaveTextContent("80 000 Ar"));
    // la commande annulée n'est pas comptée comme un achat
    expect(within(kpiCard("Total Achats")).getByText(hasText("0 Ar"))).toBeInTheDocument();

    // et elle a disparu de la liste des achats
    await goTo("Achats");
    await screen.findByText("Aucun bon de commande trouvé");
  });

  // Mémoire §3.1 « Commandes déjà remboursées » : une commande annulée après paiement génère un
  // remboursement côté API ; elle ne doit plus apparaître comme commande active. Cela exige que
  // l'écran Achats recharge aussi la liste des remboursements après l'annulation.
  it("l'annulation d'une commande payée la retire immédiatement de la liste Achats", async () => {
    db.commandes.push(makeCommande({ id: 1, numero_commande: "BC-001", status: "En attente", statut_paiement: "Payé", montant_total: 80000, montant_paye: 80000, creer_le: now() }));
    renderModule("/buy-sell/achats");
    await screen.findByText("BC-001");
    await rowAction("BC-001", /Annuler la commande/);
    await waitFor(() => expect(screen.queryByText("BC-001")).not.toBeInTheDocument());
    expect(await screen.findByText("Aucun bon de commande trouvé")).toBeInTheDocument();
  });

  it("une commande partiellement payée puis annulée est aussi retirée, et seul le montant versé est à encaisser", async () => {
    db.commandes.push(makeCommande({ id: 1, numero_commande: "BC-001", status: "En attente", statut_paiement: "Partiel", montant_total: 80000, montant_paye: 30000, creer_le: now() }));
    renderModule("/buy-sell/achats");
    await openModuleMenu();
    await screen.findByText("BC-001");
    await rowAction("BC-001", /Annuler la commande/);
    await waitFor(() => expect(screen.queryByText("BC-001")).not.toBeInTheDocument());

    await goTo("Remboursements");
    await screen.findByText("BC-001");
    expect(within(kpiCard("À Encaisser")).getByText(hasText("30 000 Ar"))).toBeInTheDocument();
  });

  it("une commande annulée SANS paiement reste visible (aucun remboursement n'est généré)", async () => {
    db.commandes.push(makeCommande({ id: 1, numero_commande: "BC-001", status: "En attente", statut_paiement: "Non payé", montant_paye: 0, creer_le: now() }));
    renderModule("/buy-sell/achats");
    await screen.findByText("BC-001");
    await rowAction("BC-001", /Annuler la commande/);
    await waitFor(() => expect(within(rowOf("BC-001")).getByText("Annulé")).toBeInTheDocument());
    expect(db.rembs).toHaveLength(0);
  });
});

describe("Intégration — vente annulée après paiement", () => {
  it("l'annulation d'une vente payée la retire immédiatement de la liste Ventes", async () => {
    db.ventes.push(makeVente({ id: 1, numero_vente: "VT-001", status: "En attente", statut_paiement: "Payé", montant_total: "50000", montant_paye: "50000" }));
    renderModule("/buy-sell/ventes");
    await screen.findByText("VT-001");
    await rowAction("VT-001", /Annuler la vente/);
    await waitFor(() => expect(screen.queryByText("VT-001")).not.toBeInTheDocument());
    expect(await screen.findByText("Aucune vente enregistrée")).toBeInTheDocument();
  });

  it("une vente annulée SANS paiement reste visible (aucun remboursement n'est généré)", async () => {
    db.ventes.push(makeVente({ id: 1, numero_vente: "VT-001", status: "En attente", statut_paiement: "Non payé", montant_paye: "0" }));
    renderModule("/buy-sell/ventes");
    await screen.findByText("VT-001");
    await rowAction("VT-001", /Annuler la vente/);
    await waitFor(() => expect(within(rowOf("VT-001")).getByText("Annulé")).toBeInTheDocument());
    expect(db.rembs).toHaveLength(0);
  });
});

describe("Intégration — paiement en plusieurs versements", () => {
  async function verser(ref: string, montant: number, mode?: string) {
    await rowAction(ref, /Enregistrer un paiement/);
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/Montant versé/), { target: { value: String(montant) } });
    if (mode) await user().selectOptions(within(dialog).getByLabelText("Mode de paiement"), mode);
    await user().click(within(dialog).getByRole("button", { name: "Enregistrer le paiement" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  }

  it("achat : deux versements successifs font passer la commande de « Non payé » à « Partiel » puis « Payé »", async () => {
    db.commandes.push(makeCommande({ id: 1, numero_commande: "BC-001", montant_total: 100000, montant_paye: 0, creer_le: now() }));
    renderModule("/buy-sell/achats");
    await screen.findByText("BC-001");
    expect(within(rowOf("BC-001")).getByText("Non payé")).toBeInTheDocument();

    await verser("BC-001", 40000, "Virement");
    await waitFor(() => expect(within(rowOf("BC-001")).getByText("Partiel")).toBeInTheDocument());
    expect(within(kpiCard("Payé / Total")).getByText(hasText("40 000 Ar / 100 000 Ar"))).toBeInTheDocument();

    await verser("BC-001", 60000);
    await waitFor(() => expect(within(rowOf("BC-001")).getByText("Payé")).toBeInTheDocument());
    expect(within(kpiCard("Payé / Total")).getByText(hasText("100 000 Ar / 100 000 Ar"))).toBeInTheDocument();

    // une commande soldée ne propose plus d'enregistrer un paiement
    const boutons = within(rowOf("BC-001")).getAllByRole("button");
    await user().click(boutons[boutons.length - 1]);
    await screen.findByRole("menuitem", { name: /Annuler la commande/ });
    expect(screen.queryByRole("menuitem", { name: /Enregistrer un paiement/ })).not.toBeInTheDocument();
    await user().keyboard("{Escape}");

    // l'historique des deux versements est consultable dans le détail
    await user().click(within(rowOf("BC-001")).getAllByRole("button")[0]);
    const detail = await screen.findByRole("dialog");
    expect(within(detail).getByText("Paiements")).toBeInTheDocument();
    expect(within(detail).getAllByRole("listitem")).toHaveLength(2);
    expect(within(detail).getByText(hasText("40 000 Ar"))).toBeInTheDocument();
    expect(within(detail).getByText(hasText("60 000 Ar"))).toBeInTheDocument();
  });

  it("vente : un versement partiel est suivi comme créance puis soldé", async () => {
    db.ventes.push(makeVente({ id: 1, numero_vente: "VT-001", montant_total: "70000", montant_paye: "0", date_vente: now() }));
    renderModule("/buy-sell/ventes");
    await screen.findByText("VT-001");

    await verser("VT-001", 20000, "Orange Money");
    await waitFor(() => expect(within(rowOf("VT-001")).getByText("Partiel")).toBeInTheDocument());
    expect(within(kpiCard("Encaissements")).getByText(hasText("20 000 Ar"))).toBeInTheDocument();

    await verser("VT-001", 50000);
    await waitFor(() => expect(within(rowOf("VT-001")).getByText("Payé")).toBeInTheDocument());
    expect(within(kpiCard("Encaissements")).getByText(hasText("70 000 Ar"))).toBeInTheDocument();
  });
});
