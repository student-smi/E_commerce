import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;    // cents
  stock: number;
  category: string;
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductListResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
}

export interface ProductFilters {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
}

export function useProducts(filters: ProductFilters = {}) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: () =>
      api.get<ProductListResponse>('/products', { params: filters }).then((r) => r.data),
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => api.get<Product>(`/products/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}
