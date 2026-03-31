import { API_BASE_URL } from "@/config/api.config";
export interface AlertData {
  id: string;
  type_alert: string;
  product: string;
  sku_alert: string; 
  message: string;
  priorite: string;
  creer_le: string;
  est_resolu: boolean;
}

export const fetchAlerts = async (): Promise<AlertData[]> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/alerte/`, {
    headers: {
      'Authorization': `Token ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok){
    throw new Error("Erreur lors de la récupération des alertes");
  }

  const data = await response.json();
  const results = Array.isArray(data) ? data : data.results || [];

  return results.map((item: any) => ({
    id: item.id,
    type_alert: item.type_alert,
    product: item.product_name || "-",
    sku_alert: item.sku_alert,
    compteur: item.compteur,
    message: item.message,
    priorite: item.priorite,
    creer_le: item.creer_le,
    est_resolu: item.est_resolu,
  }))
};
