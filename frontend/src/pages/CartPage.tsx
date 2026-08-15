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
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);

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
      <div className="flex flex-col items-center justify-center py-28 gap-3">
        <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Loading your shopping cart...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 sm:py-10">
      {/* Page Title */}
      <h1 className="text-xl sm:text-3xl font-extrabold text-gray-900 mb-5 sm:mb-8 tracking-tight">
        🛍️ Cart <span className="text-gray-400 font-medium text-base">({items.length} {items.length === 1 ? 'item' : 'items'})</span>
      </h1>

      {items.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-3xl border border-gray-100 px-6">
          <span className="text-5xl mb-3 block">🛍️</span>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Your cart is empty</h2>
          <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">
            Explore our collection and add your favorite picks!
          </p>
          <button
            onClick={() => navigate('/products')}
            className="bg-black text-white px-8 py-3 rounded-2xl font-semibold hover:bg-gray-800 active:scale-95 transition-all shadow-md"
          >
            Start Shopping
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-8 items-start">

          {/* ── Cart Items ── */}
          <div className="lg:col-span-2">
            <ul className="space-y-3">
              {items.map((item) => (
                <li
                  key={item.productId}
                  className="bg-white rounded-2xl border border-gray-100 shadow-xs p-3.5 sm:p-5 flex gap-3 sm:gap-4"
                >
                  {/* Image */}
                  <img
                    src={item.imageUrl || 'https://via.placeholder.com/100x120?text=Item'}
                    alt={item.name}
                    className="w-20 h-24 sm:w-24 sm:h-28 object-cover rounded-xl bg-gray-100 shrink-0"
                  />

                  {/* Details */}
                  <div className="flex-1 min-w-0 flex flex-col">
                    {/* Name + Remove */}
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-gray-900 text-sm sm:text-base leading-tight line-clamp-2">{item.name}</p>
                      <button
                        onClick={() => handleRemove(item.productId)}
                        className="w-8 h-8 shrink-0 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors text-sm font-bold"
                        aria-label="Remove item"
                      >✕</button>
                    </div>

                    {/* Category + Variant badges */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className="text-[11px] text-gray-400 font-medium">{item.category}</span>
                      {item.size && (
                        <span className="text-[11px] bg-gray-100 text-gray-800 font-bold px-2 py-0.5 rounded-md border border-gray-200">
                          Size: {item.size}
                        </span>
                      )}
                      {item.color && (
                        <span className="text-[11px] bg-gray-100 text-gray-800 font-bold px-2 py-0.5 rounded-md border border-gray-200">
                          {item.color}
                        </span>
                      )}
                    </div>

                    {/* Qty stepper + Price — pushed to bottom */}
                    <div className="flex items-center justify-between mt-auto pt-3">
                      {/* Qty stepper */}
                      <div className="flex items-center border-2 border-gray-200 rounded-xl bg-white overflow-hidden">
                        <button
                          onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="w-9 h-9 flex items-center justify-center text-base font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-30 active:scale-95"
                        >−</button>
                        <span className="w-8 text-center text-sm font-bold text-gray-900">{item.quantity}</span>
                        <button
                          onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}
                          disabled={item.quantity >= item.stock}
                          className="w-9 h-9 flex items-center justify-center text-base font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-30 active:scale-95"
                        >+</button>
                      </div>

                      {/* Price */}
                      <div className="text-right">
                        <p className="text-base sm:text-lg font-extrabold text-gray-900">
                          {formatPrice(item.price * item.quantity)}
                        </p>
                        {item.quantity > 1 && (
                          <p className="text-[11px] text-gray-400">{formatPrice(item.price)} each</p>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Order Summary ── */}
          {/* On mobile: shown below items as a card. On desktop: sticky sidebar */}
          <div className="bg-gray-50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-gray-200/60 lg:sticky lg:top-24">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-4">Order Summary</h2>

            <div className="space-y-2.5 border-b border-gray-200 pb-4 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal ({totalQty} {totalQty === 1 ? 'item' : 'items'})</span>
                <span className="font-semibold text-gray-900">{formatPrice(total)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span className="text-emerald-600 font-bold">FREE</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Estimated Tax</span>
                <span className="text-gray-400 text-xs">At checkout</span>
              </div>
            </div>

            <div className="flex justify-between items-baseline mt-4 mb-4">
              <span className="text-base font-bold text-gray-900">Total</span>
              <span className="text-xl sm:text-2xl font-black text-gray-900">{formatPrice(total)}</span>
            </div>

            <button
              onClick={() => navigate('/checkout')}
              className="w-full bg-black text-white py-4 rounded-2xl font-bold text-sm sm:text-base hover:bg-gray-800 active:scale-[0.99] transition-all shadow-md"
            >
              Proceed to Checkout →
            </button>

            <p className="text-center text-[11px] text-gray-400 mt-3">
              🔒 Safe & Secure 256-Bit Encrypted Checkout
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
