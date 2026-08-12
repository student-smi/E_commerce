import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useCartStore } from '../store/cartStore';

interface Props {
  open: boolean;
  onClose: () => void;
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function CartDrawer({ open, onClose }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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

  function handleCheckout() {
    onClose();
    navigate('/checkout');
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            Your Cart {items.length > 0 && <span className="text-gray-500 text-base font-normal">({items.length})</span>}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-2xl leading-none"
            aria-label="Close cart"
          >
            ×
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
              <p className="text-5xl mb-4">🛍️</p>
              <p className="text-lg font-medium">Your cart is empty</p>
              <button
                onClick={onClose}
                className="mt-4 text-black underline text-sm"
              >
                Continue shopping
              </button>
            </div>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => (
                <li key={item.productId} className="flex gap-4">
                  <img
                    src={item.imageUrl || 'https://via.placeholder.com/80x100?text=Item'}
                    alt={item.name}
                    className="w-20 h-24 object-cover rounded-lg bg-gray-100 flex-shrink-0"
                  />
                  <div className="flex flex-col flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{item.name}</p>
                    <p className="text-sm text-gray-500 mb-2">{formatPrice(item.price)}</p>
                    <div className="flex items-center gap-2 mt-auto">
                      {/* Quantity controls */}
                      <div className="flex items-center border border-gray-300 rounded-lg">
                        <button
                          onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="px-2 py-1 text-sm hover:bg-gray-100 disabled:opacity-40"
                        >
                          −
                        </button>
                        <span className="px-3 py-1 text-sm font-medium">{item.quantity}</span>
                        <button
                          onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}
                          disabled={item.quantity >= item.stock}
                          className="px-2 py-1 text-sm hover:bg-gray-100 disabled:opacity-40"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-sm font-semibold text-gray-800 ml-auto">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                      <button
                        onClick={() => handleRemove(item.productId)}
                        className="text-gray-400 hover:text-red-500 text-sm ml-1"
                        aria-label="Remove item"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t px-6 py-4 space-y-3">
            <div className="flex justify-between text-lg font-bold text-gray-900">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
            <button
              onClick={handleCheckout}
              className="w-full bg-black text-white py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors"
            >
              Proceed to Checkout
            </button>
          </div>
        )}
      </div>
    </>
  );
}
