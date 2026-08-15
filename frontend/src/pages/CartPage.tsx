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
      <div className="flex flex-col items-center justify-center py-28 gap-3">
        <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Loading your shopping cart...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 mb-6 sm:mb-8 tracking-tight">
        Shopping Cart ({items.length})
      </h1>

      {items.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-3xl p-8 border border-gray-100">
          <span className="text-6xl mb-4 block">🛍️</span>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
          <p className="text-gray-500 text-sm sm:text-base mb-6 max-w-sm mx-auto">
            You don't have any items in your cart. Explore our collection and add your favorite picks!
          </p>
          <button
            onClick={() => navigate('/products')}
            className="bg-black text-white px-8 py-3.5 rounded-2xl font-semibold hover:bg-gray-800 active:scale-95 transition-all shadow-md"
          >
            Start Shopping
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Cart Items List */}
          <div className="lg:col-span-2 space-y-4">
            <ul className="divide-y divide-gray-100 bg-white rounded-3xl border border-gray-100 shadow-xs px-4 sm:px-6">
              {items.map((item) => (
                <li key={item.productId} className="py-4 sm:py-6 flex gap-3 sm:gap-6 items-center">
                  <img
                    src={item.imageUrl || 'https://via.placeholder.com/100x120?text=Item'}
                    alt={item.name}
                    className="w-20 h-24 sm:w-24 sm:h-28 object-cover rounded-2xl bg-gray-100 shrink-0"
                  />
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-gray-900 text-sm sm:text-lg truncate">{item.name}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-gray-500 font-medium">{item.category}</span>
                          {item.size && (
                            <span className="text-xs bg-gray-100 text-gray-800 font-bold px-2.5 py-0.5 rounded-lg border border-gray-200">
                              Size: {item.size}
                            </span>
                          )}
                          {item.color && (
                            <span className="text-xs bg-gray-100 text-gray-800 font-bold px-2.5 py-0.5 rounded-lg border border-gray-200">
                              Color: {item.color}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemove(item.productId)}
                        className="text-gray-400 hover:text-red-600 p-1 rounded-lg"
                        aria-label="Remove item"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      {/* Quantity Selector */}
                      <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50/50">
                        <button
                          onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="w-8 h-8 flex items-center justify-center font-bold text-gray-600 hover:bg-gray-200/60 rounded-l-xl disabled:opacity-30 active:scale-95 text-sm"
                        >
                          −
                        </button>
                        <span className="w-8 text-center text-xs sm:text-sm font-bold text-gray-900">{item.quantity}</span>
                        <button
                          onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}
                          disabled={item.quantity >= item.stock}
                          className="w-8 h-8 flex items-center justify-center font-bold text-gray-600 hover:bg-gray-200/60 rounded-r-xl disabled:opacity-30 active:scale-95 text-sm"
                        >
                          +
                        </button>
                      </div>

                      {/* Total for item */}
                      <div className="text-right">
                        <p className="text-sm sm:text-lg font-bold text-gray-900">
                          {formatPrice(item.price * item.quantity)}
                        </p>
                        {item.quantity > 1 && (
                          <p className="text-[11px] text-gray-400">
                            {formatPrice(item.price)} each
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Order Summary Sidebar */}
          <div className="bg-gray-50 rounded-3xl p-6 border border-gray-200/60 sticky top-24">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h2>

            <div className="space-y-3 border-b border-gray-200 pb-4 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} items)</span>
                <span className="font-semibold text-gray-900">{formatPrice(total)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span className="text-emerald-600 font-semibold">FREE</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Estimated Tax</span>
                <span className="text-gray-500">Calculated at checkout</span>
              </div>
            </div>

            <div className="flex justify-between items-baseline text-lg font-extrabold text-gray-900 my-4">
              <span>Total</span>
              <span className="text-2xl font-black">{formatPrice(total)}</span>
            </div>

            <button
              onClick={() => navigate('/checkout')}
              className="w-full bg-black text-white py-4 rounded-2xl font-bold text-base hover:bg-gray-800 active:scale-[0.99] transition-all shadow-md"
            >
              Proceed to Checkout →
            </button>

            <p className="text-center text-xs text-gray-400 mt-3">
              🔒 Safe & Secure 256-Bit Encrypted Checkout
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
