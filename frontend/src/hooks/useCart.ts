import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import api from '../lib/api';
import { useCartStore, CartItem } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';

interface CartResponse {
  cartId: string | null;
  items: CartItem[];
}

export function useCart() {
  const { isAuthenticated } = useAuthStore();
  const { setCart } = useCartStore();

  const query = useQuery({
    queryKey: ['cart'],
    queryFn: () => api.get<CartResponse>('/cart').then((r) => r.data),
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (query.data) {
      setCart(query.data.cartId, query.data.items);
    }
  }, [query.data, setCart]);

  return query;
}
