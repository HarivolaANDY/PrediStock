import api from '@/config/axios';
import { AxiosResponse } from 'axios';

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

interface ApiResponse {
  data: Recommendation[];
  message: string;
  status_code: number;
}

const recommendationService = {
  getAll: (): Promise<AxiosResponse<ApiResponse>> => {
    return api.get('/recommandation/');
  }
};

export default recommendationService;