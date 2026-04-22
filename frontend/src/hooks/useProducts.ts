import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL, getAuthHeaders } from '@/config/api.config';

export interface Product {
  id: number;
  product_img: string | null;
  name: string;
  sku: string;
  description: string;
  price: string;
  stock_threshold: number;
  current_stock: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category: number | null;
  supplier: number | null;
  unite_mesure: string;
}

interface ProductResponse {
  results: Product[];
  count: number;
  next: string | null;
  previous: string | null;
  total_stock?: number;
}

export interface ProductFilters {
  page?: number;
  category?: number | string;
  unite_mesure?: string;
  is_active?: boolean | string;
  search?: string;
}

export function useProducts(filters: ProductFilters = { page: 1 }) {
  const {
    page = 1,
    category,
    unite_mesure,
    is_active,
    search
  } = filters;

  const fetchProducts = async (): Promise<ProductResponse> => {
    const headers = getAuthHeaders();
    
    if (!headers.Authorization) {
      throw new Error("Erreur d'authentification : Aucun token trouvé.");
    }

    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    
    if (category) queryParams.append('category', category.toString());
    if (unite_mesure) queryParams.append('unite_mesure', unite_mesure);
    if (is_active !== undefined && is_active !== '') {
      queryParams.append('is_active', is_active.toString());
    }
    if (search) queryParams.append('name', search);

    const { handleHttpErrors } = await import('@/services/api');

    const response = await fetch(
      `${API_BASE_URL}/catalogue/products/?${queryParams.toString()}`,
      { headers }
    );

    return handleHttpErrors(response);
  };

  const query = useQuery({
    queryKey: ['products', page, category, unite_mesure, is_active, search],
    queryFn: fetchProducts,
  });

  return {
    products: query.data?.results || [],
    totalCount: query.data?.count || 0,
    totalStock: query.data?.total_stock || 0,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.refetch,
    hasNextPage: !!query.data?.next,
    hasPreviousPage: !!query.data?.previous,
  };
}
