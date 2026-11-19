/**
 * RÉSULTAT ATTENDU — module Achats & Ventes
 *
 *   « à travers cette plateforme, on doit avoir une interface où gérer les achats et ventes
 *     avec un bon suivi, ainsi que les autres fonctionnalités, toujours bien opérationnelles. »
 *
 * Trois tests essentiels, un par clause du résultat attendu, qui s'appuient sur les quatre missions :
 *   1. toujours opérationnel  → les cinq écrans du module s'ouvrent depuis le menu ;
 *   2. bon suivi des achats   → mission 1 (Achats) + mission 4 (Transactions, Analyse) ;
 *   3. bon suivi des ventes   → mission 2 (Ventes) + mission 3 (Remboursements) + mission 4.
 *
 * Les écrans sont montés avec la vraie sidebar, face à un faux backend en mémoire
 * (voir moduleAchatsVentes.harness.tsx).
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
import {
  goTo, heading, installFakeBackend, kpiCard, openModuleMenu, renderModule, rowAction, SCREENS, user,
} from "@/test/moduleAchatsVentes.harness";

beforeEach(() => {
  loginAs({ id: 1, username: "andy" });
  installFakeBackend();
});

describe("Résultat attendu — une interface où gérer les achats et les ventes, toujours opérationnelle", () => {
  it("Toujours opérationnel : les cinq écrans s'ouvrent depuis le menu « Achats & Ventes »", async () => {
    renderModule();
    await openModuleMenu();
    for (const s of SCREENS) {
      await goTo(s.link);
      expect(await heading(s.heading)).toBeInTheDocument();
    }
  });

  it("Bon suivi des achats : commande → paiement → livraison → mouvement de stock → analyse", async () => {
    renderModule();
    await openModuleMenu();

    await user().click(await screen.findByRole("button", { name: /Nouvelle commande/ }));
    const dialog = await screen.findByRole("dialog");
    await user().selectOptions(fieldByLabel(dialog, "Fournisseur") as HTMLSelectElement, "1");
    await user().selectOptions(fieldsByLabel(dialog, "Produit / Variante")[0] as HTMLSelectElement, "pr-10");
    fireEvent.change(fieldsByLabel(dialog, "Qté")[0], { target: { value: "2" } });
    await user().click(within(dialog).getByRole("button", { name: "Valider la commande" }));
    await screen.findByText("BC-001");

    await rowAction("BC-001", /Marquer comme payé/);
    await rowAction("BC-001", /Marquer comme livré/);
    await waitFor(() => expect(within(rowOf("BC-001")).getByText("Livré")).toBeInTheDocument());

    await goTo("Transactions");
    const mouvement = (await screen.findByText("BC-001")).closest("tr")!;
    expect(within(mouvement).getByText("+2")).toBeInTheDocument();

    await goTo("Analyse");
    await waitFor(() => expect(within(kpiCard("Total Achats")).getByText("1 cmd")).toBeInTheDocument());
  });

  it("Bon suivi des ventes : vente → livraison → annulation → remboursement", async () => {
    renderModule("/buy-sell/ventes");
    await openModuleMenu();

    await user().click(await screen.findByRole("button", { name: /Nouvelle vente/ }));
    const dialog = await screen.findByRole("dialog");
    await user().selectOptions(fieldsByLabel(dialog, "Produit / Variante")[0] as HTMLSelectElement, "pr-10");
    await user().click(within(dialog).getByRole("button", { name: "Confirmer la vente" }));
    await screen.findByText("VT-001");

    await rowAction("VT-001", /Marquer comme payé/);
    await rowAction("VT-001", /Marquer comme livré/);
    await waitFor(() => expect(within(rowOf("VT-001")).getByText("Livré")).toBeInTheDocument());

    await goTo("Analyse");
    await waitFor(() => expect(within(kpiCard("Total Ventes")).getByText(hasText("50 000 Ar"))).toBeInTheDocument());

    await goTo("Ventes");
    await rowAction("VT-001", /Annuler la vente/);
    await goTo("Remboursements");
    const remboursement = (await screen.findByText("VT-001")).closest("tr")!;
    expect(within(remboursement).getByText("Non réglé")).toBeInTheDocument();
    expect(within(kpiCard("À Rembourser")).getByText(hasText("50 000 Ar"))).toBeInTheDocument();
  });
});
