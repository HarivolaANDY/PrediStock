// Configuration API pour Predistock

// URL de base de l'API — toujours avec le préfixe /api
const API_ORIGIN = import.meta.env.VITE_API_URL || "http://localhost:8000";
export const API_BASE_URL = `${API_ORIGIN}/api`;

// Configuration du token
export const getAuthToken = () => {
  // Récupérer le token depuis localStorage
  const storedToken = localStorage.getItem('token');
  
  // Si un token existe dans localStorage, l'utiliser
  if (storedToken) {
    return storedToken;
  }
  
  // Sinon, utiliser un token par défaut depuis les variables d'environnement
  // Cette approche permet d'avoir un token de développement qui ne sera pas commité sur GitHub
  const defaultToken = (import.meta.env as { VITE_DEFAULT_AUTH_TOKEN?: string }).VITE_DEFAULT_AUTH_TOKEN || '';
  
  // Si aucun token n'est disponible, afficher un avertissement dans la console
  if (!defaultToken) {
    console.warn('Aucun token d\'authentification trouvé. Veuillez configurer VITE_DEFAULT_AUTH_TOKEN dans votre fichier .env.local');
  }
  
  return defaultToken;
};

// Headers communs pour les requêtes API
export const getAuthHeaders = () => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Token ${localStorage.getItem('token')}` : '',
  };
};