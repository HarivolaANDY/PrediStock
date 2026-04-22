import { API_BASE_URL, getAuthHeaders } from "@/config/api.config";
import { unites_mesures } from "@/types/unites_mesures";

export const API_URL = `${API_BASE_URL}/catalogue/products/`;

export async function saveProduct(data: FormData | Record<string, unknown>, token?: string) {
  let method = "POST";
  let url = `${API_URL}`;
  
  // Extraire l'ID soit du FormData soit directement des données
  const id = data instanceof FormData ? data.get('id') : data.id;
  
  if (id) {
    method = "PATCH";  // Utiliser PATCH au lieu de PUT pour la mise à jour partielle
    url = `${API_URL}${id}/`;  // Utiliser l'endpoint /:id/ pour la modification
    console.log('Update URL:', url);
  }

  // Si les données sont déjà dans un FormData, les convertir en JSON
  if (data instanceof FormData) {
    try {
      const jsonData: Record<string, unknown> = {};
      
      // Convertir les données du FormData en objet JSON
      data.forEach((value, key) => {
        if (key === 'price') {
          jsonData[key] = parseFloat(value as string);
        } else if (key === 'stock_threshold' || key === 'current_stock') {
          jsonData[key] = parseInt(value as string, 10);
        } else if (key === 'category' || key === 'supplier') {
          jsonData[key] = value ? parseInt(value as string, 10) : null;
        } else if (key === 'is_active' || key === 'est_perissable') {
          jsonData[key] = value === 'true';
        } else {
          jsonData[key] = value;
        }
      });

      // Assurez-vous que tous les champs requis sont présents
      const requiredFields = {
        name: jsonData.name || '',
        description: jsonData.description || '',
        price: jsonData.price || 0,
        stock_threshold: jsonData.stock_threshold || 0,
        current_stock: jsonData.current_stock || 0,
        sku: jsonData.sku || '',
        is_active: true,
        category: jsonData.category || null,
        supplier: jsonData.supplier || null,
        est_perissable: jsonData.est_perissable || false,
        unite_mesure: jsonData.unite_mesure || 'unit',
      };

      console.log('Données JSON préparées:', requiredFields);
      
      // Log de la configuration de la requête
      // Préparer les headers
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Token ${localStorage.getItem('token')}` } : getAuthHeaders()),
      };

      console.log('Configuration requête:', {
        url,
        method,
        headers,
        body: requiredFields
      });
      
      const response = await fetch(url, {
        method,
        body: JSON.stringify(requiredFields),
        headers,
      });
      
      const result = await response.json() as ProductApiResponse;
      console.log('Response:', result);

      if (!response.ok || result.status === "error") {
        throw new Error(result.message || "Erreur lors de l'enregistrement");
      }

      return result.data;
    } catch (error: unknown) {
      console.error('Erreur détaillée:', error);
      const errorMessage = error instanceof Error ? error.message : "Erreur lors de l'enregistrement du produit";
      throw new Error(errorMessage);
    }
  }

  // Pour les données non-FormData, les formater et les envoyer en JSON
  const productData = data as Record<string, unknown>;
  const formattedData = {
    price: (productData.price as string)?.toString() ?? "0",
    stock_threshold: parseInt((productData.stock_threshold as string) || "0", 10),
    current_stock: parseInt((productData.current_stock as string) || "0", 10),
    is_active: true,
    sku: productData.sku as string || `SKU-${Date.now()}`,
    description: productData.description as string || "Aucune description",
    name: productData.name as string || "",
    category: productData.category ? (typeof productData.category === 'object' && productData.category !== null ? (productData.category as { id: number }).id : productData.category) : null,
    supplier: productData.supplier ? (typeof productData.supplier === 'object' && productData.supplier !== null ? (productData.supplier as { id: number }).id : productData.supplier) : null,
    est_perissable: Boolean(productData.est_perissable),
  };

  const headers = {
      "Content-Type": "application/json",
      "Authorization": `Token ${localStorage.getItem('token')}`,
  };

  const response = await fetch(url, {
    method,
    headers,
    body: JSON.stringify(formattedData),
  });

  const result = await response.json() as ProductApiResponse;

  if (response.ok && (result.status === "success" || result.status === "ok")) {
    return result.data;
  }

  throw new Error(result.message || "Erreur lors de l'enregistrement");
}