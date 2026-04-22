import { useState, useEffect } from 'react';
import { API_BASE_URL, getAuthHeaders } from "@/config/api.config";

export type Product = {
  id: number;
  name: string;
  category: number | null;
  sku: string;
  description: string | null;
  price: number;
  stock_threshold: number;
  current_stock: number;
  supplier: number | null
  suppliers?: { id: string; name: string }[]  // ← M2M
  unite_mesure: string                         // ← unité
  is_active: boolean;
  created_at: string;
  updated_at: string;
  product_img: string | null;
  images?: {
    id: number;
    image: string;
    created_at: string;
  }[];
}

export const useProductDetails = (productId: string | undefined) => {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!productId) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/product/${productId}/`, {
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch product details');
        }

        const data = await response.json();
        setProduct(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  return { product, loading, error };
};
