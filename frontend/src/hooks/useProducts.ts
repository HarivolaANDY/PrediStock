import { useState, useEffect, useCallback } from 'react'
import { API_BASE_URL, getAuthHeaders } from '@/config/api.config'
import API from "@/services/axios";

interface ProductResponse {
  status: string
  data: {
    count: number
    next: string | null
    previous: string | null
    results: Product[]
  }
  message: string
  errors: null | string[]
}

export interface Product {
  revenue: number
  stock: number
  status: string
  sold: number | string
  id: number
  product_img: string | null
  name: string
  sku: string
  description: string
  price: string
  stock_threshold: number
  current_stock: number
  unite_mesure: string
  is_active: boolean
  created_at: string
  updated_at: string
  category: number | null
  supplier: number | null
}

export async function getPDV(_page: number = 1) {
  try {
    const res = await API.get('/produits_dv/');
    return res.data.data;
  } catch (error) {
    console.error(error);
    return [];
  }
}

export function useProducts(page: number = 1) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [nextPage, setNextPage] = useState<string | null>(null)
  const [previousPage, setPreviousPage] = useState<string | null>(null)

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      
      // Vérifier si un token d'authentification est présent
      if (!headers.Authorization) {
        setError("Erreur d'authentification : Aucun token trouvé. Veuillez configurer VITE_DEFAULT_AUTH_TOKEN dans votre fichier .env.local")
        setLoading(false)
        return;
      }
      
      const response = await fetch(
          `${API_BASE_URL}/catalogue/products/?page=${page}`,
          { headers }
      )
      
      // Gérer les erreurs HTTP
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setError("Erreur d'authentification : Token invalide ou expiré. Veuillez vérifier votre configuration.")
        } else {
          setError(`Erreur serveur: ${response.status} ${response.statusText}`)
        }
        setLoading(false)
        return;
      }
      
      const result: ProductResponse = await response.json()
      
      if (result.data) {
        // Vérifier si les résultats sont directement dans data.results ou dans data
        const productResults = result.data.results || result.data;
        const count = result.data.count || (Array.isArray(result.data) ? result.data.length : 0);
        
        setProducts(Array.isArray(productResults) ? productResults : [])
        setTotalCount(count)
        setNextPage(result.data.next || null)
        setPreviousPage(result.data.previous || null)
        
        //console.log('Produits chargés:', productResults); // Debug log
      } else {
        setError(result.message || "Erreur lors du chargement des produits")
        console.error('Réponse API invalide:', result); // Debug log
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue")
    } finally {
      setLoading(false)
    }
  }, [page]);

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  return { 
    products, 
    loading, 
    error, 
    refetch: fetchProducts,
    totalCount,
    hasNextPage: !!nextPage,
    hasPreviousPage: !!previousPage
  }
}
