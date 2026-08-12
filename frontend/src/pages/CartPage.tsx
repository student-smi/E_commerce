import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useCart } from '../hooks/useCart';
import { useCartStore } from '../store/cartStore';
import api from '../lib/api';

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function CartPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isLoading } = useCart();
  const { items } = useCartStore();

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  async function handleQuantityChange(productId: string, quantity: number) {
    try {
      await api.patch('/cart/update', { productId, quantity });
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    } catch (err: any) {
      alert(err.response?.data?.error || 'Could not update quantity');
    }
  }

  async function handleRemove(productId: string) {
    try {
      await api.delete(`/cart/remove/${productId}`);
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    } catch {
      alert('Could not remove item');
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h1>

      {items.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4">🛍️</p>
          <p className="text-lg font-medium mb-4">Your cart is empty</p>
          <button
            onClick={() => navigate('/products')}
            className="bg-black text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition-colors"
          >
            Shop Now
          </button>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-gray-200 mb-8">
            {items.map((item) => (
              <li key={item.productId} className="flex gap-6 py-6">
                <img
                  src={item.imageUrl || 'https://via.placeholder.com/100x120?text=Item'}
                  alt={item.name}
                  className="w-24 h-28 object-cover rounded-xl bg-gray-100 flex-shrink-0"
                />
                <div className="flex flex-col flex-1">
                  <p className="font-semibold text-gray-900 text-lg">{item.name}</p>
                  <p className="text-gray-500 text-sm mb-auto">{item.category}</p>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center border border-gray-300 rounded-lg">
                      <button
                        onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        className="px-3 py-2 hover:bg-gray-100 disabled:opacity-40"
                      >
                        −
                      </button>
                      <span className="px-4 py-2 font-medium">{item.quantity}</span>
                      <button
                        onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}
                        disabled={item.quantity >= item.stock}
                        className="px-3 py-2 hover:bg-gray-100 disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-bold text-gray-900">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                      <button
                        onClick={() => handleRemove(item.productId)}
                        className="text-gray-400 hover:text-red-500 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="bg-gray-50 rounded-2xl p-6">
            <div className="flex justify-between text-xl font-bold text-gray-900 mb-4">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
            <button
              onClick={() => navigate('/checkout')}
              className="w-full bg-black text-white py-4 rounded-xl font-medium text-lg hover:bg-gray-800 transition-colors"
            >
              Proceed to Checkout
            </button>
          </div>
        </>
      )}
    </div>
  );
}
