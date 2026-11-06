/**
 * MISSION 4 (1/2) — Analyse financière (AnalysePage.tsx)
 *
 * Mémoire §3.4 — problèmes traités :
 *   • agrégation de trois sources (achats, ventes, remboursements) dans un même graphique,
 *     malgré des champs de date différents
 *   • granularité adaptative : par jour jusqu'à 31 jours d'écart, par mois au-delà
 * Fonctionnalités attendues :
 *   • indicateurs : total achats, total ventes, remboursements en cours (à encaisser /
 *     à rembourser), marge estimée
 *   • filtres : produit, plage de dates, type de flux
 *   • graphique de flux de trésorerie consolidé
 */
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { BonCommande, DonneeVente, Remboursement } from "@/types/achatVente";

// Recharts ne sait pas se dimensionner sous jsdom : on le remplace par un double qui
// expose les DONNÉES réellement transmises au graphique (c'est ce que l'on veut vérifier).
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AreaChart: ({ data, children }: { data: unknown; children: ReactNode }) => (
    <div data-testid="area-chart" data-points={JSON.stringify(data)}>{children}</div>
  ),
  Area: ({ dataKey }: { dataKey: string }) => <div data-testid={`area-${dataKey}`} />,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}));
vi.mock("@/services/achatVenteService", () => ({
  getAnalytics: vi.fn(),
  getBonCommandes: vi.fn(),
  getDonneeVentes: vi.fn(),
  getRemboursements: vi.fn(),
}));

import * as svc from "@/services/achatVenteService";
import AnalysePage from "../AnalysePage";
import { renderWithProviders } from "@/test/renderWithProviders";
import { fieldByLabel, hasText, kpiCard } from "@/test/helpers";
import { iso, makeCommande, makeRemboursement, makeVente } from "@/test/fixtures";

const api = vi.mocked(svc);
const user = () => userEvent.setup();

interface Point {
  date: string;
  achats: number;
  ventes: number;
  remboursements: number;
  products: string[];
}

const commandeLivree = makeCommande({ id: 1, status: "Livré", montant_total: 100000, creer_le: iso("2025-03-10") });
const commandeEnAttente = makeCommande({
  id: 2, status: "En attente", montant_total: 500000, creer_le: iso("2025-03-10"),
  lignes: [{ id: 9, bon_commande: 2, produit: 30, product_name: "Sucre 1kg", quantite: 1, prix_unitaire: 500000, montant_ligne: 500000 }],
});
const venteLivree = makeVente({ id: 1, status: "Livré", montant_total: "250000", date_vente: iso("2025-03-12") });
const venteEnAttente = makeVente({ id: 2, status: "En attente", montant_total: "999999", date_vente: iso("2025-03-12") });
const rembAchat = makeRemboursement({ id: 1, source_type: "Achat", montant: 20000, statut_reglement: "Non réglé", date_remboursement: iso("2025-03-15") });
const rembVente = makeRemboursement({ id: 2, source_type: "Vente", montant: 30000, statut_reglement: "Non réglé", date_remboursement: iso("2025-03-15") });
const rembVenteReglee = makeRemboursement({ id: 3, source_type: "Vente", montant: 99999, statut_reglement: "Réglé", date_remboursement: iso("2025-03-20") });

function setup(over: { commandes?: BonCommande[]; ventes?: DonneeVente[]; rembs?: Remboursement[] } = {}) {
  api.getAnalytics.mockResolvedValue({ total_purchases: 0, total_sales: 0, margin: 0, purchase_count: 0, sale_count: 0 });
  api.getBonCommandes.mockResolvedValue(over.commandes ?? [commandeLivree, commandeEnAttente]);
  api.getDonneeVentes.mockResolvedValue(over.ventes ?? [venteLivree, venteEnAttente]);
  api.getRemboursements.mockResolvedValue(over.rembs ?? [rembAchat, rembVente, rembVenteReglee]);
  return renderWithProviders(<AnalysePage />);
}

const points = (): Point[] => JSON.parse(screen.getByTestId("area-chart").getAttribute("data-points") ?? "[]");
const setDates = (debut: string, fin: string) => {
  fireEvent.change(fieldByLabel(document.body, "Date de début"), { target: { value: debut } });
  fireEvent.change(fieldByLabel(document.body, "Date de fin"), { target: { value: fin } });
};
async function chooseFlux(label: "Tous les flux" | "Achats" | "Ventes" | "Retours") {
  await user().click(screen.getByRole("combobox"));
  await user().click(await screen.findByRole("option", { name: label }));
}

beforeEach(() => {
  api.getAnalytics.mockResolvedValue({ total_purchases: 0, total_sales: 0, margin: 0, purchase_count: 0, sale_count: 0 });
});

describe("Mission 4 — Analyse : indicateurs de synthèse", () => {
  it("totalise les achats et ventes LIVRÉS uniquement (les commandes/ventes en attente sont ignorées)", async () => {
    setup();
    await screen.findByText(hasText("100 000 Ar"));
    const achats = kpiCard("Total Achats");
    expect(within(achats).getByText(hasText("100 000 Ar"))).toBeInTheDocument();
    expect(within(achats).getByText("1 cmd")).toBeInTheDocument();
    const ventes = kpiCard("Total Ventes");
    expect(within(ventes).getByText(hasText("250 000 Ar"))).toBeInTheDocument();
    expect(within(ventes).getByText("1 vnt")).toBeInTheDocument();
  });

  it("ignore les commandes annulées dans les totaux", async () => {
    setup({ commandes: [commandeLivree, makeCommande({ id: 5, status: "Annulé", montant_total: 777777 })] });
    await screen.findByText(hasText("100 000 Ar"));
    expect(within(kpiCard("Total Achats")).getByText("1 cmd")).toBeInTheDocument();
  });

  it("remboursements en cours : ventile « à encaisser » (achats) et « à rembourser » (ventes) hors remboursements réglés", async () => {
    setup();
    await screen.findByText(hasText("100 000 Ar"));
    const card = kpiCard("Remboursements");
    expect(within(card).getByText(hasText("50 000 Ar"))).toBeInTheDocument(); // 20 000 + 30 000, pas les 99 999 réglés
    expect(within(card).getByText("À encaisser").nextElementSibling).toHaveTextContent("20 000 Ar");
    expect(within(card).getByText("À rembourser").nextElementSibling).toHaveTextContent("30 000 Ar");
  });

  it("marge estimée = ventes − achats − montants à rembourser (profit)", async () => {
    setup();
    await screen.findByText(hasText("100 000 Ar"));
    const card = kpiCard("Marges (est.)");
    expect(within(card).getByText(hasText("120 000 Ar"))).toBeInTheDocument(); // 250 000 − 100 000 − 30 000
    expect(within(card).getByText("Profit ↑")).toBeInTheDocument();
  });

  it("signale un déficit (marge négative) avec le libellé et la couleur adaptés", async () => {
    setup({ ventes: [makeVente({ status: "Livré", montant_total: "10000" })] });
    await screen.findByText(hasText("100 000 Ar"));
    const card = kpiCard("Marges (est.)");
    expect(within(card).getByText(hasText("-120 000 Ar"))).toBeInTheDocument(); // 10 000 − 100 000 − 30 000
    expect(within(card).getByText("Déficit ↓")).toBeInTheDocument();
    expect(within(card).getByText(hasText("-120 000 Ar")).className).toContain("text-red-600");
  });

  it("affiche des indicateurs à 0 Ar sans données (aucun NaN)", async () => {
    setup({ commandes: [], ventes: [], rembs: [] });
    await screen.findByText("Aucune donnée graphable");
    expect(within(kpiCard("Total Achats")).getByText(hasText("0 Ar"))).toBeInTheDocument();
    expect(within(kpiCard("Marges (est.)")).getByText(hasText("0 Ar"))).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/NaN/);
  });

  it("« Actualiser » recharge les indicateurs depuis l'API", async () => {
    setup();
    await screen.findByText(hasText("100 000 Ar"));
    const before = api.getAnalytics.mock.calls.length;
    await user().click(screen.getByRole("button", { name: /Actualiser/ }));
    await waitFor(() => expect(api.getAnalytics.mock.calls.length).toBeGreaterThan(before));
  });
});

describe("Mission 4 — Analyse : graphique de flux (agrégation de trois sources)", () => {
  it("fusionne achats, ventes et remboursements d'un même mois en UN point, dates sources différentes", async () => {
    setup();
    await screen.findByTestId("area-chart");
    const pts = points();
    expect(pts).toHaveLength(1);
    expect(pts[0]).toMatchObject({
      achats: 100000, // commande livrée (creer_le)
      ventes: 250000, // vente livrée (date_vente)
      remboursements: 149999, // 20 000 + 30 000 + 99 999 : le graphique garde l'historique, y compris réglé
    });
  });

  it("liste les produits impliqués (achats : product_name, ventes : produit_name) sans doublon", async () => {
    setup({ commandes: [commandeLivree, makeCommande({ id: 3, status: "Livré", montant_total: 1, creer_le: iso("2025-03-11") })] });
    await screen.findByTestId("area-chart");
    expect(points()[0].products).toEqual(["Riz 25kg", "Huile 1L"]);
  });

  it("trie les périodes chronologiquement (et non par libellé alphabétique)", async () => {
    setup({
      commandes: [
        makeCommande({ id: 1, status: "Livré", montant_total: 5, creer_le: iso("2025-04-05") }), // « avr. 25 »
        makeCommande({ id: 2, status: "Livré", montant_total: 7, creer_le: iso("2025-03-05") }), // « mars 25 »
      ],
      ventes: [],
      rembs: [],
    });
    await screen.findByTestId("area-chart");
    const pts = points();
    expect(pts).toHaveLength(2);
    expect(pts.map((p) => p.achats)).toEqual([7, 5]); // mars puis avril
  });

  it("cumule plusieurs transactions du même mois", async () => {
    setup({
      commandes: [
        makeCommande({ id: 1, status: "Livré", montant_total: 100, creer_le: iso("2025-03-01") }),
        makeCommande({ id: 2, status: "Livré", montant_total: 250, creer_le: iso("2025-03-28") }),
      ],
      ventes: [],
      rembs: [],
    });
    await screen.findByTestId("area-chart");
    expect(points()).toHaveLength(1);
    expect(points()[0].achats).toBe(350);
  });

  it("affiche « Aucune donnée graphable » quand rien n'est à tracer", async () => {
    setup({ commandes: [], ventes: [], rembs: [] });
    expect(await screen.findByText("Aucune donnée graphable")).toBeInTheDocument();
    expect(screen.queryByTestId("area-chart")).not.toBeInTheDocument();
  });

  it("trace les trois séries par défaut et les trois légendes", async () => {
    setup();
    await screen.findByTestId("area-chart");
    expect(screen.getByTestId("area-achats")).toBeInTheDocument();
    expect(screen.getByTestId("area-ventes")).toBeInTheDocument();
    expect(screen.getByTestId("area-remboursements")).toBeInTheDocument();
    expect(screen.getByText("ACHATS")).toBeInTheDocument();
    expect(screen.getByText("VENTES")).toBeInTheDocument();
    expect(screen.getByText("RETOURS")).toBeInTheDocument();
  });
});

describe("Mission 4 — Analyse : granularité adaptative (jour / mois)", () => {
  it("par défaut (aucune période) : regroupement par mois", async () => {
    setup();
    expect(await screen.findByText(/Comparatif temporel \(par mois\)/)).toBeInTheDocument();
  });

  it("période ≤ 31 jours : regroupement par jour, un point par jour actif, triés", async () => {
    setup();
    await screen.findByTestId("area-chart");
    setDates("2025-03-01", "2025-03-31");
    expect(await screen.findByText(/Comparatif temporel \(par jour\)/)).toBeInTheDocument();
    const pts = points();
    expect(pts).toHaveLength(4); // 10 (achat), 12 (vente), 15 (remb.), 20 (remb. réglé)
    expect(pts.map((p) => [p.achats, p.ventes, p.remboursements])).toEqual([
      [100000, 0, 0],
      [0, 250000, 0],
      [0, 0, 50000],
      [0, 0, 99999],
    ]);
  });

  it("bascule exacte : 31 jours d'écart → jour ; 32 jours → mois", async () => {
    setup();
    await screen.findByTestId("area-chart");
    setDates("2025-03-01", "2025-04-01"); // 31 jours
    expect(await screen.findByText(/\(par jour\)/)).toBeInTheDocument();
    setDates("2025-03-01", "2025-04-02"); // 32 jours
    expect(await screen.findByText(/\(par mois\)/)).toBeInTheDocument();
  });

  it("une seule borne renseignée ne suffit pas à passer en regroupement par jour", async () => {
    setup();
    await screen.findByTestId("area-chart");
    fireEvent.change(fieldByLabel(document.body, "Date de début"), { target: { value: "2025-03-01" } });
    expect(screen.getByText(/\(par mois\)/)).toBeInTheDocument();
  });

  it("l'ordre des bornes est sans importance (écart absolu)", async () => {
    setup();
    await screen.findByTestId("area-chart");
    setDates("2025-03-31", "2025-03-01");
    expect(screen.getByText(/\(par jour\)/)).toBeInTheDocument();
  });
});

describe("Mission 4 — Analyse : filtres", () => {
  it("filtre par date de début : exclut les transactions antérieures", async () => {
    setup();
    await screen.findByTestId("area-chart");
    fireEvent.change(fieldByLabel(document.body, "Date de début"), { target: { value: "2025-03-11" } });
    expect(within(kpiCard("Total Achats")).getByText(hasText("0 Ar"))).toBeInTheDocument(); // achat du 10 exclu
    expect(within(kpiCard("Total Ventes")).getByText(hasText("250 000 Ar"))).toBeInTheDocument(); // vente du 12 gardée
  });

  it("filtre par date de fin : inclut toute la journée de fin, exclut le lendemain", async () => {
    setup();
    await screen.findByTestId("area-chart");
    fireEvent.change(fieldByLabel(document.body, "Date de fin"), { target: { value: "2025-03-10" } });
    expect(within(kpiCard("Total Achats")).getByText(hasText("100 000 Ar"))).toBeInTheDocument(); // achat du 10 inclus
    expect(within(kpiCard("Total Ventes")).getByText(hasText("0 Ar"))).toBeInTheDocument(); // vente du 12 exclue
  });

  it("type de flux « Ventes » : ni achats ni remboursements, une seule série et une seule légende", async () => {
    setup();
    await screen.findByTestId("area-chart");
    await chooseFlux("Ventes");
    expect(within(kpiCard("Total Achats")).getByText(hasText("0 Ar"))).toBeInTheDocument();
    expect(within(kpiCard("Total Ventes")).getByText(hasText("250 000 Ar"))).toBeInTheDocument();
    expect(within(kpiCard("Remboursements")).getByText(hasText("0 Ar"), { selector: "span" })).toBeInTheDocument();
    expect(screen.getByTestId("area-ventes")).toBeInTheDocument();
    expect(screen.queryByTestId("area-achats")).not.toBeInTheDocument();
    expect(screen.queryByTestId("area-remboursements")).not.toBeInTheDocument();
    expect(screen.getByText("VENTES")).toBeInTheDocument();
    expect(screen.queryByText("ACHATS")).not.toBeInTheDocument();
    expect(screen.queryByText("RETOURS")).not.toBeInTheDocument();
  });

  it("type de flux « Achats » : ni ventes ni remboursements", async () => {
    setup();
    await screen.findByTestId("area-chart");
    await chooseFlux("Achats");
    expect(within(kpiCard("Total Achats")).getByText(hasText("100 000 Ar"))).toBeInTheDocument();
    expect(within(kpiCard("Total Ventes")).getByText(hasText("0 Ar"))).toBeInTheDocument();
    expect(screen.getByTestId("area-achats")).toBeInTheDocument();
    expect(screen.queryByTestId("area-ventes")).not.toBeInTheDocument();
    expect(points()[0]).toMatchObject({ achats: 100000, ventes: 0, remboursements: 0 });
  });

  it("type de flux « Retours » : seule la série des remboursements est tracée, avec sa légende", async () => {
    setup();
    await screen.findByTestId("area-chart");
    await chooseFlux("Retours");
    expect(screen.getByTestId("area-remboursements")).toBeInTheDocument();
    expect(screen.queryByTestId("area-achats")).not.toBeInTheDocument();
    expect(screen.queryByTestId("area-ventes")).not.toBeInTheDocument();
    expect(screen.getByText("RETOURS")).toBeInTheDocument();
    expect(screen.queryByText("ACHATS")).not.toBeInTheDocument();
    expect(screen.queryByText("VENTES")).not.toBeInTheDocument();
  });

  // Cohérence des trois modes : « Achats » exclut les ventes, « Ventes » exclut les achats, et
  // « Retours » exclut les deux. Auparavant, « Retours » laissait les totaux achats/ventes (et donc
  // la marge) calculés sur l'ensemble des flux.
  it("type de flux « Retours » : totaux achats et ventes à 0 Ar, le graphique ne contient que des remboursements", async () => {
    setup();
    await screen.findByTestId("area-chart");
    await chooseFlux("Retours");
    expect(within(kpiCard("Total Achats")).getByText(hasText("0 Ar"))).toBeInTheDocument();
    expect(within(kpiCard("Total Achats")).getByText("0 cmd")).toBeInTheDocument();
    expect(within(kpiCard("Total Ventes")).getByText(hasText("0 Ar"))).toBeInTheDocument();
    expect(within(kpiCard("Total Ventes")).getByText("0 vnt")).toBeInTheDocument();
    expect(points()[0]).toMatchObject({ achats: 0, ventes: 0, remboursements: 149999 });
  });

  it("type de flux « Retours » : la marge ne reflète que les montants à rembourser", async () => {
    setup();
    await screen.findByTestId("area-chart");
    await chooseFlux("Retours");
    const marge = kpiCard("Marges (est.)");
    expect(within(marge).getByText(hasText("-30 000 Ar"))).toBeInTheDocument(); // 0 − 0 − 30 000 à rembourser
    expect(within(marge).getByText("Déficit ↓")).toBeInTheDocument();
    // les remboursements en cours restent affichés
    expect(within(kpiCard("Remboursements")).getByText(hasText("50 000 Ar"))).toBeInTheDocument();
  });

  it("revenir à « Tous les flux » rétablit les totaux achats et ventes", async () => {
    setup();
    await screen.findByTestId("area-chart");
    await chooseFlux("Retours");
    await chooseFlux("Tous les flux");
    expect(within(kpiCard("Total Achats")).getByText(hasText("100 000 Ar"))).toBeInTheDocument();
    expect(within(kpiCard("Total Ventes")).getByText(hasText("250 000 Ar"))).toBeInTheDocument();
  });

  it("recherche par produit : ne garde que les achats/ventes contenant ce produit (insensible à la casse)", async () => {
    setup();
    await screen.findByTestId("area-chart");
    await user().type(screen.getByPlaceholderText("Nom du produit..."), "HUILE");
    expect(within(kpiCard("Total Achats")).getByText(hasText("0 Ar"))).toBeInTheDocument(); // l'achat porte sur du riz
    expect(within(kpiCard("Total Ventes")).getByText(hasText("250 000 Ar"))).toBeInTheDocument(); // la vente porte sur de l'huile
  });

  it("recherche par produit sans résultat : le graphique indique l'absence de données", async () => {
    setup({ rembs: [] });
    await screen.findByTestId("area-chart");
    await user().type(screen.getByPlaceholderText("Nom du produit..."), "inexistant");
    expect(await screen.findByText("Aucune donnée graphable")).toBeInTheDocument();
  });

  it("« Réinitialiser » efface tous les filtres", async () => {
    setup();
    await screen.findByTestId("area-chart");
    setDates("2025-03-01", "2025-03-31");
    await user().type(screen.getByPlaceholderText("Nom du produit..."), "huile");
    await chooseFlux("Ventes");
    expect(screen.getByText(/\(par jour\)/)).toBeInTheDocument();

    await user().click(screen.getByRole("button", { name: "Réinitialiser" }));
    expect((fieldByLabel(document.body, "Date de début") as HTMLInputElement).value).toBe("");
    expect((fieldByLabel(document.body, "Date de fin") as HTMLInputElement).value).toBe("");
    expect(screen.getByPlaceholderText("Nom du produit...")).toHaveValue("");
    expect(screen.getByText(/\(par mois\)/)).toBeInTheDocument();
    expect(within(kpiCard("Total Achats")).getByText(hasText("100 000 Ar"))).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveTextContent("Tous les flux");
  });
});
