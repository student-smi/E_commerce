import { create } from 'zustand';

export interface CartItem {
  productId: string;
  name: string;
  price: number;       // cents
  quantity: number;
  stock: number;
  imageUrl: string;
  category: string;
  size?: string;
  color?: string;
}

interface CartState {
  cartId: string | null;
  items: CartItem[];
  setCart: (cartId: string | null, items: CartItem[]) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>((set) => ({
  cartId: null,
  items: [],
  setCart: (cartId, items) => set({ cartId, items }),
  clearCart: () => set({ cartId: null, items: [] }),
  }));
