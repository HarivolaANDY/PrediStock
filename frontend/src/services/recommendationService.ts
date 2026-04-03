import api from '@/config/axios';

export interface Recommendation {
  id: number;
  product: number;
  date_prediction: string;
  type_recommandation: string;
  quantite_suggeree: number;
  prix_estime: number;
  priority: string;
  raisonnement: string;
  est_applique: boolean;
  creer_le: string;
  appliquee_le: string;
  product_details?: {
    name: string;
    current_stock: number;
  };
}

export interface Prediction {
  id: number;
  product: number;
  product_name?: string; // ← ajouter ce champ
  date_prediction: string;
  import_qty: number;
  import_lower_bound: number | null;
  import_upper_bound: number | null;
  export_qty: number;
  export_lower_bound: number | null;
  export_upper_bound: number | null;
  stock_prevu: number;
  rupture: boolean;
  horizon: number;
  modele_utilise: string;
  creer_le: string;
}

// Extrait le tableau de données quelle que soit la structure de la réponse
const extractArray = (raw: any): any[] => {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.results)) return raw.results;
  return [];
};

const recommendationService = {

  // ── Recommandations ────────────────────────────────────────────────────────
  getAll: async (): Promise<Recommendation[]> => {
    const response = await api.get('/forecasting/recommandations/');
    return extractArray(response.data);
  },

  apply: async (id: number): Promise<boolean> => {
    try {
      await api.post(`/forecasting/recommandations/${id}/apply/`);
      return true;
    } catch {
      return false;
    }
  },

  // ── Prédictions ────────────────────────────────────────────────────────────
  getPredictions: async (): Promise<Prediction[]> => {
    const response = await api.get('/forecasting/predictions/');
    return extractArray(response.data);
  },

  // Lance le pipeline de prévision immédiatement
  runPrediction: async (): Promise<{ message: string }> => {
    const response = await api.post('/forecasting/predict/', {});
    return response.data;
  },

  // ── Chatbot IA ─────────────────────────────────────────────────────────────
  chat: async (message: string): Promise<any> => {
    const response = await api.post('/forecasting/chat/', { message });
    const raw = response.data;
    return raw?.data ?? raw;
  },
};

export default recommendationService;