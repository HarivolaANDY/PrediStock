import api from '@/config/axios';
import { Recommendation, Prediction } from '@/types/types';

interface RawDataWithArray {
  data?: unknown[];
  results?: unknown[];
}

interface RawDataWithArray {
  data?: unknown[];
  results?: unknown[];
}

// Extrait le tableau de données quelle que soit la structure de la réponse
const extractArray = (raw: unknown): unknown[] => {
  if (Array.isArray(raw)) return raw;
  const obj = raw as RawDataWithArray;
  if (Array.isArray(obj?.data)) return obj.data;
  if (Array.isArray(obj?.results)) return obj.results;
  return [];
};

const recommendationService = {

  // ── Recommandations ────────────────────────────────────────────────────────
  getAll: async (): Promise<Recommendation[]> => {
    const response = await api.get('/forecasting/recommandations/');
    return extractArray(response.data) as Recommendation[];
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
    return extractArray(response.data) as Prediction[];
  },

  // Lance le pipeline de prévision immédiatement
  runPrediction: async (): Promise<{ message: string }> => {
    const response = await api.post('/forecasting/predict/', {});
    return response.data;
  },

  // ── Chatbot IA ─────────────────────────────────────────────────────────────
  chat: async (message: string): Promise<unknown> => {
    const response = await api.post('/forecasting/chat/', { message });
    const raw = response.data;
    return raw?.data ?? raw;
  },
};

export default recommendationService;