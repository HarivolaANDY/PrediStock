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
  const response = await fetch(`${API_BASE_URL}/notifications/alertes/`, {
    headers: {
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok){
    throw new Error("Erreur lors de la récupération des alertes");
  }

  const data = await response.json();
  const results = Array.isArray(data) ? data : data.results || [];

  return results.map((item: {
    id: string;
    type_alert: string;
    product_name?: string;
    sku_alert: string;
    compteur?: number;
    message: string;
    priorite: string;
    creer_le: string;
    est_resolu: boolean;
  }) => ({
    id: item.id,
    type_alert: item.type_alert,
    product: item.product_name || "-",
    sku_alert: item.sku_alert || "",
    compteur: item.compteur,
    message: item.message,
    priorite: item.priorite,
    creer_le: item.creer_le,
    est_resolu: item.est_resolu,
  }))
};

export const resolveAlert = async (alertId: string): Promise<boolean> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/notifications/alertes/${alertId}/`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ est_resolu: true, resolu_le: new Date().toISOString() })
  });
  
  if (!response.ok) {
    throw new Error("Erreur lors de la résolution de l'alerte");
  }
  
  return true;
};
