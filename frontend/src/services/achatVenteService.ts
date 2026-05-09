import { API_BASE_URL } from "@/services/api";
import type {
  BonCommande,
  CreateBonCommandeData,
  DonneeVente,
  CreateDonneeVenteData,
  ProduitRenvoie,
  Recommandation,
  MouvementStock,
  AnalyticsData,
} from "@/types/achatVente";


const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Token ${localStorage.getItem("token")}`,
});

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: authHeaders(), ...options });
  const text = await res.text();
  
  if (!res.ok) {
    let msg = `Erreur ${res.status}`;
    try {
      if (text) {
        const parsed = JSON.parse(text);
        msg = parsed.message || parsed.detail || msg;
      }
    } catch { /* use default */ }
    throw new Error(msg);
  }

  if (!text) return null as unknown as T;

  try {
    const parsed = JSON.parse(text);
    // Unwrap StandardResponse envelope if present
    if (parsed && typeof parsed === "object" && "data" in parsed) return parsed.data as T;
    return parsed as T;
  } catch {
    return text as unknown as T;
  }
}


// ─── Bon Commande ─────────────────────────────────────────────────────────────

export const getBonCommandes = (params?: Record<string, string>) => {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return fetchJson<BonCommande[]>(`${API_BASE_URL}/api/commandes/bon-commande/${qs}`);
};

export const createBonCommande = (data: CreateBonCommandeData) =>
  fetchJson<BonCommande>(`${API_BASE_URL}/api/commandes/bon-commande/`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateBonCommande = (id: number, data: Partial<CreateBonCommandeData>) =>
  fetchJson<BonCommande>(`${API_BASE_URL}/api/commandes/bon-commande/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const deleteBonCommande = (id: number) =>
  fetchJson<void>(`${API_BASE_URL}/api/commandes/bon-commande/${id}/`, {
    method: "DELETE",
  });

// ─── Donnée Vente ─────────────────────────────────────────────────────────────


export const getDonneeVentes = (params?: Record<string, string>) => {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return fetchJson<DonneeVente[]>(`${API_BASE_URL}/api/commandes/donnee-vente/${qs}`);
};

export const createDonneeVente = (data: CreateDonneeVenteData) =>
  fetchJson<DonneeVente>(`${API_BASE_URL}/api/commandes/donnee-vente/`, {
    method: "POST",
    body: JSON.stringify(data),
  });

// ─── Retours ──────────────────────────────────────────────────────────────────

export const getRetours = (params?: Record<string, string>) => {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return fetchJson<ProduitRenvoie[]>(`${API_BASE_URL}/api/commandes/retours/${qs}`);
};

// ─── Analytics ────────────────────────────────────────────────────────────────

export const getAnalytics = () =>
  fetchJson<AnalyticsData>(`${API_BASE_URL}/api/commandes/analytics/`);

// ─── Recommandations ──────────────────────────────────────────────────────────

export const getRecommandations = (params?: Record<string, string>) => {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return fetchJson<Recommandation[]>(
    `${API_BASE_URL}/api/forecasting/recommandations/${qs}`
  );
};

export const applyRecommandation = (id: number) =>
  fetchJson<Recommandation>(
    `${API_BASE_URL}/api/forecasting/recommandations/${id}/apply/`,
    { method: "PATCH" }
  );

// ─── Mouvements de stock ──────────────────────────────────────────────────────

export const getMouvements = (params?: Record<string, string>) => {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return fetchJson<MouvementStock[]>(`${API_BASE_URL}/api/stock/mouvements/${qs}`);
};

// ─── Fournisseurs (for the purchase create form) ──────────────────────────────

export const getFournisseurs = () =>
  fetchJson<any>(`${API_BASE_URL}/api/catalogue/suppliers/`).then(res => {
    if (res && res.results && Array.isArray(res.results)) return res.results;
    return Array.isArray(res) ? res : [];
  });
// ─── Produits (for order lines) ───────────────────────────────────────────────

export const getProduits = () =>
  fetchJson<any>(`${API_BASE_URL}/api/catalogue/products/`).then(res => {
    // If paginated, return the results array
    if (res && res.results && Array.isArray(res.results)) return res.results;
    // Otherwise return the response as is (if it's already an array)
    return Array.isArray(res) ? res : [];
  });

export const searchProduits = (terme: string) =>
  fetchJson<any[]>(`${API_BASE_URL}/api/catalogue/products/`, {
    method: "POST",
    body: JSON.stringify({ chercher: terme }),
  });
