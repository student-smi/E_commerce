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
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:max-w-md bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-2">
            <span className="text-xl">🛍️</span>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">
              Your Cart {items.length > 0 && <span className="text-gray-500 text-sm font-medium">({items.length})</span>}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close cart"
          >
            ✕
          </button>
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 divide-y divide-gray-100">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 py-12">
              <span className="text-5xl mb-3">🛍️</span>
              <p className="text-base sm:text-lg font-bold text-gray-700">Your cart is empty</p>
              <p className="text-xs text-gray-400 mt-1 max-w-[200px]">Looks like you haven't added any items yet.</p>
              <button
                onClick={() => {
                  onClose();
                  navigate('/products');
                }}
                className="mt-5 bg-black text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors"
              >
                Browse Catalog
              </button>
            </div>
          ) : (
            <ul className="space-y-4 pt-1">
              {items.map((item) => (
                <li key={item.productId} className="flex gap-3 sm:gap-4 py-3 first:pt-0">
                  <img
                    src={item.imageUrl || 'https://via.placeholder.com/80x100?text=Item'}
                    alt={item.name}
                    className="w-18 h-22 sm:w-20 sm:h-24 object-cover rounded-xl bg-gray-100 shrink-0"
                  />
                  <div className="flex flex-col flex-1 min-w-0">
                    <p className="font-semibold text-sm sm:text-base text-gray-900 truncate">{item.name}</p>
                    <p className="text-xs sm:text-sm text-gray-500 mb-2">{formatPrice(item.price)}</p>
                    <div className="flex items-center gap-2 mt-auto">
                      {/* Quantity Controls */}
                      <div className="flex items-center border border-gray-300 rounded-xl bg-white">
                        <button
                          onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-l-xl disabled:opacity-30 active:scale-95"
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span className="w-8 text-center text-xs sm:text-sm font-bold text-gray-900">{item.quantity}</span>
                        <button
                          onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}
                          disabled={item.quantity >= item.stock}
                          className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-r-xl disabled:opacity-30 active:scale-95"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>

                      <span className="text-xs sm:text-sm font-bold text-gray-900 ml-auto">
                        {formatPrice(item.price * item.quantity)}
                      </span>

                      <button
                        onClick={() => handleRemove(item.productId)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
          <div className="border-t border-gray-100 p-4 sm:p-6 bg-gray-50/80 space-y-3">
            <div className="flex justify-between items-baseline text-base sm:text-lg font-bold text-gray-900">
              <span>Subtotal</span>
              <span className="text-xl sm:text-2xl font-extrabold">{formatPrice(total)}</span>
            </div>
            <button
              onClick={handleCheckout}
              className="w-full bg-black text-white py-3.5 sm:py-4 rounded-2xl font-bold text-sm sm:text-base hover:bg-gray-800 active:scale-[0.99] transition-all shadow-md"
            >
              Checkout Now →
            </button>
          </div>
        )}
      </div>
    </>
  );
}
