import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

export interface OrderItem {
  productId: string;
  name: string;
  imageUrl: string;
  quantity: number;
  priceAtPurchase: number;
}

export interface Order {
  id: string;
  userId: string;
  status: OrderStatus;
  totalAmount: number;
  shippingAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  paymentIntentId: string;
  createdAt: string;
  updatedAt: string;
  items?: OrderItem[];
}

export function useOrders() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: () => api.get<Order[]>('/orders').then((r) => r.data),
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ['order', id],
    queryFn: () => api.get<Order>(`/orders/${id}`).then((r) => r.data),
    enabled: !!id,
    retry: false,
  });
}
