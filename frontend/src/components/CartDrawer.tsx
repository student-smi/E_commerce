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

      {/* Drawer — full width on mobile, max-md on desktop */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:max-w-sm bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-lg">🛍️</span>
            <h2 className="text-base font-bold text-gray-900">
              Cart {items.length > 0 && <span className="text-gray-500 font-medium">({items.length})</span>}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-gray-900 rounded-full hover:bg-gray-100 text-lg transition-colors"
            aria-label="Close cart"
          >
            ✕
          </button>
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <span className="text-5xl mb-3">🛍️</span>
              <p className="text-base font-bold text-gray-700">Your cart is empty</p>
              <p className="text-xs text-gray-400 mt-1 mb-5 max-w-[180px]">Add items from the catalog to get started</p>
              <button
                onClick={() => { onClose(); navigate('/products'); }}
                className="bg-black text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors"
              >
                Browse Catalog
              </button>
            </div>
          ) : (
            <ul className="space-y-0 divide-y divide-gray-100">
              {items.map((item) => (
                <li key={item.productId} className="py-3.5 flex gap-3">
                  {/* Product image */}
                  <img
                    src={item.imageUrl || 'https://via.placeholder.com/80x100?text=Item'}
                    alt={item.name}
                    className="w-16 h-20 object-cover rounded-xl bg-gray-100 shrink-0"
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col">
                    {/* Name + remove */}
                    <div className="flex items-start justify-between gap-1">
                      <p className="font-semibold text-sm text-gray-900 leading-tight line-clamp-2">{item.name}</p>
                      <button
                        onClick={() => handleRemove(item.productId)}
                        className="w-7 h-7 shrink-0 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors text-base ml-1"
                        aria-label="Remove item"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Variant badges */}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.size && (
                        <span className="text-[10px] bg-gray-100 text-gray-700 font-bold px-1.5 py-0.5 rounded-md">
                          {item.size}
                        </span>
                      )}
                      {item.color && (
                        <span className="text-[10px] bg-gray-100 text-gray-700 font-bold px-1.5 py-0.5 rounded-md">
                          {item.color}
                        </span>
                      )}
                    </div>

                    {/* Price + Qty controls on same row */}
                    <div className="flex items-center justify-between mt-auto pt-2">
                      {/* Qty stepper */}
                      <div className="flex items-center border border-gray-200 rounded-xl bg-white overflow-hidden">
                        <button
                          onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="w-8 h-8 flex items-center justify-center font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-30 active:scale-95 text-base"
                          aria-label="Decrease quantity"
                        >−</button>
                        <span className="w-7 text-center text-xs font-bold text-gray-900">{item.quantity}</span>
                        <button
                          onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}
                          disabled={item.quantity >= item.stock}
                          className="w-8 h-8 flex items-center justify-center font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-30 active:scale-95 text-base"
                          aria-label="Increase quantity"
                        >+</button>
                      </div>

                      {/* Item total */}
                      <span className="text-sm font-extrabold text-gray-900">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer / Checkout */}
        {items.length > 0 && (
          <div className="border-t border-gray-100 px-4 sm:px-5 py-4 bg-white space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Subtotal</span>
              <span className="text-lg font-extrabold text-gray-900">{formatPrice(total)}</span>
            </div>
            <button
              onClick={handleCheckout}
              className="w-full bg-black text-white py-4 rounded-2xl font-bold text-sm hover:bg-gray-800 active:scale-[0.99] transition-all shadow-md"
            >
              Checkout Now →
            </button>
            <p className="text-center text-[11px] text-gray-400">🔒 Secure Checkout</p>
          </div>
        )}
      </div>
    </>
  );
}
