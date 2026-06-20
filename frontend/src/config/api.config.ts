// Configuration API pour Predistock

// URL de base de l'API — toujours avec le préfixe /api
const API_ORIGIN = import.meta.env.VITE_API_URL || "http://localhost:8000";
export const API_BASE_URL = `${API_ORIGIN}/api`;

// Configuration du token
export const getAuthToken = () => {
  return localStorage.getItem('token') || '';
};

// Headers communs pour les requêtes API
export const getAuthHeaders = () => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Token ${localStorage.getItem('token')}` : '',
  };
};