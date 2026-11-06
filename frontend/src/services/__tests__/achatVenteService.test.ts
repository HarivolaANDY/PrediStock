/**
 * Couche service du module Achats & Ventes (src/services/achatVenteService.ts).
 *
 * Mémoire, §2.2.3 : « Ces cinq écrans s'appuient sur une couche de service dédiée […]
 * avec des fonctions typées par ressource (bons de commande, ventes, remboursements,
 * mouvements de stock, fournisseurs, produits). »
 * Objectif du stage : « Consommer correctement l'API REST déjà exposée par l'équipe backend ».
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getBonCommandes,
  getBonCommande,
  createBonCommande,
  updateBonCommande,
  deleteBonCommande,
  getDonneeVentes,
  getDonneeVente,
  createDonneeVente,
  updateDonneeVente,
  deleteDonneeVente,
  getRemboursements,
  updateRemboursement,
  getAnalytics,
  getMouvements,
  getFournisseurs,
  getProduits,
  searchProduits,
  payerBonCommande,
  payerDonneeVente,
} from "@/services/achatVenteService";
import { API_BASE_URL } from "@/services/api";

function jsonResponse(body: unknown, status = 200) {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), { status });
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  localStorage.setItem("token", "abc123");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const lastCall = () => {
  const [url, init] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1]!;
  return { url: url as string, init: (init ?? {}) as RequestInit };
};

describe("Service Achats & Ventes — transport HTTP", () => {
  it("envoie le jeton d'authentification et le Content-Type JSON sur chaque requête", async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));
    await getBonCommandes();
    expect(lastCall().init.headers).toEqual({
      "Content-Type": "application/json",
      Authorization: "Token abc123",
    });
  });

  it("déballe l'enveloppe StandardResponse { data } renvoyée par l'API", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: true, data: [{ id: 1 }] }));
    await expect(getBonCommandes()).resolves.toEqual([{ id: 1 }]);
  });

  it("retourne directement le JSON quand il n'y a pas d'enveloppe", async () => {
    fetchMock.mockResolvedValue(jsonResponse([{ id: 2 }]));
    await expect(getBonCommandes()).resolves.toEqual([{ id: 2 }]);
  });

  it("retourne null pour une réponse vide (ex. DELETE 204)", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 200 }));
    await expect(deleteBonCommande(3)).resolves.toBeNull();
  });

  it("remonte le message métier du backend (champ « message »)", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: "Stock insuffisant" }, 400));
    await expect(createDonneeVente({ utilisateur: 1 })).rejects.toThrow("Stock insuffisant");
  });

  it("remonte le message du champ « detail » (format DRF)", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ detail: "Jeton invalide." }, 401));
    await expect(getAnalytics()).rejects.toThrow("Jeton invalide.");
  });

  it("utilise « Erreur <code> » quand le corps d'erreur n'est pas exploitable", async () => {
    fetchMock.mockResolvedValue(jsonResponse("<html>boom</html>", 500));
    await expect(getBonCommandes()).rejects.toThrow("Erreur 500");
  });

  it("utilise « Erreur <code> » quand le corps d'erreur est vide", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 404 }));
    await expect(getBonCommande(9)).rejects.toThrow("Erreur 404");
  });
});

describe("Mission 1 — Achats : bons de commande", () => {
  it("liste les bons de commande sur /api/commandes/bon-commande/", async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));
    await getBonCommandes();
    expect(lastCall().url).toBe(`${API_BASE_URL}/api/commandes/bon-commande/`);
  });

  it("transmet le filtre de statut en query string", async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));
    await getBonCommandes({ status: "Livré" });
    expect(lastCall().url).toBe(`${API_BASE_URL}/api/commandes/bon-commande/?status=Livr%C3%A9`);
  });

  it("lit le détail d'un bon de commande", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 7 }));
    await getBonCommande(7);
    expect(lastCall().url).toBe(`${API_BASE_URL}/api/commandes/bon-commande/7/`);
  });

  it("crée un bon de commande multi-lignes en POST avec le corps JSON", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 1 }, 201));
    const payload = {
      fournisseur: 1,
      utilisateur: 2,
      lignes_data: [
        { produit: 10, produit_dv: null, quantite: 2, prix_unitaire: 50000 },
        { produit: 10, produit_dv: 11, quantite: 3, prix_unitaire: 11000 },
      ],
    };
    await createBonCommande(payload);
    const { url, init } = lastCall();
    expect(url).toBe(`${API_BASE_URL}/api/commandes/bon-commande/`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual(payload);
  });

  it("met à jour le statut/paiement en PATCH (changement de statut)", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 4 }));
    await updateBonCommande(4, { status: "Livré" });
    const { url, init } = lastCall();
    expect(url).toBe(`${API_BASE_URL}/api/commandes/bon-commande/4/`);
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({ status: "Livré" });
  });

  it("supprime un bon de commande en DELETE", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await deleteBonCommande(4);
    const { url, init } = lastCall();
    expect(url).toBe(`${API_BASE_URL}/api/commandes/bon-commande/4/`);
    expect(init.method).toBe("DELETE");
  });
});

describe("Mission 2 — Ventes : données de vente", () => {
  it("liste les ventes avec filtre de statut", async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));
    await getDonneeVentes({ status: "Annulé" });
    expect(lastCall().url).toBe(`${API_BASE_URL}/api/commandes/donnee-vente/?status=Annul%C3%A9`);
  });

  it("lit le détail d'une vente", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 5 }));
    await getDonneeVente(5);
    expect(lastCall().url).toBe(`${API_BASE_URL}/api/commandes/donnee-vente/5/`);
  });

  it("crée une vente à crédit avec son délai de paiement", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 1 }, 201));
    const payload = {
      utilisateur: 1,
      type_vente: "Crédit",
      segment_clientele: "VIP/Fidélisé",
      delai_paiement: "2025-12-31",
      lignes_data: [{ produit: 10, quantite: 1, prix_unitaire: 50000, remise_applique: 0 }],
    };
    await createDonneeVente(payload);
    const { url, init } = lastCall();
    expect(url).toBe(`${API_BASE_URL}/api/commandes/donnee-vente/`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual(payload);
  });

  it("met à jour une vente en PATCH", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 5 }));
    await updateDonneeVente(5, { statut_paiement: "Payé", montant_paye: "70000" });
    const { url, init } = lastCall();
    expect(url).toBe(`${API_BASE_URL}/api/commandes/donnee-vente/5/`);
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({ statut_paiement: "Payé", montant_paye: "70000" });
  });

  it("supprime une vente en DELETE", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await deleteDonneeVente(5);
    expect(lastCall().init.method).toBe("DELETE");
    expect(lastCall().url).toBe(`${API_BASE_URL}/api/commandes/donnee-vente/5/`);
  });
});

describe("Mission 3 — Remboursements", () => {
  it("liste les remboursements", async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));
    await getRemboursements();
    expect(lastCall().url).toBe(`${API_BASE_URL}/api/commandes/remboursements/`);
  });

  it("marque un remboursement comme réglé via PATCH", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 3 }));
    await updateRemboursement(3, { statut_reglement: "Réglé" });
    const { url, init } = lastCall();
    expect(url).toBe(`${API_BASE_URL}/api/commandes/remboursements/3/`);
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({ statut_reglement: "Réglé" });
  });
});

describe("Mission 4 — Analyse et Transactions", () => {
  it("lit les indicateurs d'analyse sur /api/commandes/analytics/", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ total_purchases: 1 }));
    await expect(getAnalytics()).resolves.toEqual({ total_purchases: 1 });
    expect(lastCall().url).toBe(`${API_BASE_URL}/api/commandes/analytics/`);
  });

  it("lit les mouvements de stock sans filtre", async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));
    await getMouvements();
    expect(lastCall().url).toBe(`${API_BASE_URL}/api/stock/mouvements/`);
  });

  it("filtre les mouvements par type (IN = achats, OUT = ventes)", async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));
    await getMouvements({ movement_type: "IN" });
    expect(lastCall().url).toBe(`${API_BASE_URL}/api/stock/mouvements/?movement_type=IN`);
  });
});

describe("Données de référence : fournisseurs et produits", () => {
  it("getFournisseurs accepte une réponse paginée { results }", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ count: 1, results: [{ id: 1, name: "A" }], next: null, previous: null }));
    await expect(getFournisseurs()).resolves.toEqual([{ id: 1, name: "A" }]);
    expect(lastCall().url).toBe(`${API_BASE_URL}/api/catalogue/suppliers/`);
  });

  it("getFournisseurs accepte aussi un tableau simple", async () => {
    fetchMock.mockResolvedValue(jsonResponse([{ id: 2, name: "B" }]));
    await expect(getFournisseurs()).resolves.toEqual([{ id: 2, name: "B" }]);
  });

  it("getFournisseurs retourne [] si la réponse est inattendue (jamais undefined)", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ foo: "bar" }));
    await expect(getFournisseurs()).resolves.toEqual([]);
  });

  it("getProduits gère le format paginé, le tableau simple et le format inattendu", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ results: [{ id: 1 }] }));
    await expect(getProduits()).resolves.toEqual([{ id: 1 }]);
    fetchMock.mockResolvedValueOnce(jsonResponse([{ id: 2 }]));
    await expect(getProduits()).resolves.toEqual([{ id: 2 }]);
    fetchMock.mockResolvedValueOnce(jsonResponse({}));
    await expect(getProduits()).resolves.toEqual([]);
  });

  it("searchProduits interroge le catalogue en POST { chercher } (produits + variantes)", async () => {
    fetchMock.mockResolvedValue(jsonResponse([{ id: 10, is_deriv: false }, { id: 11, is_deriv: true }]));
    const res = await searchProduits("riz");
    const { url, init } = lastCall();
    expect(url).toBe(`${API_BASE_URL}/api/catalogue/products/`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ chercher: "riz" });
    expect(res).toHaveLength(2);
  });
});

describe("Paiements : enregistrer un versement (paiement partiel possible)", () => {
  it("payerBonCommande envoie le versement en POST sur /bon-commande/<id>/payer/", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 4, statut_paiement: "Partiel" }));
    const res = await payerBonCommande(4, { montant: 20000, mode_paiement: "Virement", notes: "Acompte" });
    const { url, init } = lastCall();
    expect(url).toBe(`${API_BASE_URL}/api/commandes/bon-commande/4/payer/`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ montant: 20000, mode_paiement: "Virement", notes: "Acompte" });
    expect(res).toMatchObject({ statut_paiement: "Partiel" });
  });

  it("payerDonneeVente envoie le versement en POST sur /donnee-vente/<id>/payer/", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 5, statut_paiement: "Payé" }));
    await payerDonneeVente(5, { montant: 70000 });
    const { url, init } = lastCall();
    expect(url).toBe(`${API_BASE_URL}/api/commandes/donnee-vente/5/payer/`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ montant: 70000 });
  });

  it("remonte le message du serveur quand le versement est refusé (champ « message »)", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: false, message: "Le montant (70 000 Ar) dépasse le reste à payer (50 000 Ar)." }, 400));
    await expect(payerBonCommande(4, { montant: 70000 })).rejects.toThrow("dépasse le reste à payer");
  });

  it("remonte aussi les messages de règle métier au format DRF (champ « detail », chaîne)", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ detail: "La vente à crédit est réservée aux clients VIP/Fidélisés." }, 400));
    await expect(createDonneeVente({ utilisateur: 1, type_vente: "Crédit" })).rejects.toThrow("réservée aux clients VIP/Fidélisés");
  });
});
