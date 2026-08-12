import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useCartStore } from '../store/cartStore';

// ── Razorpay type declaration ─────────────────────────────────
declare global {
  interface Window {
    Razorpay: any;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload  = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

// ── CheckoutPage ──────────────────────────────────────────────
export function CheckoutPage() {
  const navigate    = useNavigate();
  const queryClient = useQueryClient();
  const { cartId, items, clearCart } = useCartStore();

  const [address, setAddress] = useState({
    line1:      '',
    line2:      '',
    city:       '',
    state:      '',
    postalCode: '',
    country:    'IN',
  });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  function handleChange(field: string, value: string) {
    setAddress((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Load Razorpay checkout script
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        setError('Could not load payment gateway. Check your internet connection.');
        setLoading(false);
        return;
      }

      // 2. Create Razorpay order on backend
      const { data: orderData } = await api.post('/payments/order', {});
      const { razorpayOrderId, amount, currency, keyId } = orderData;

      // 3. Open Razorpay checkout popup
      await new Promise<void>((resolve, reject) => {
        const options = {
          key:         keyId,
          amount:      amount,
          currency:    currency,
          name:        'Clothing Store',
          description: 'Order Payment',
          order_id:    razorpayOrderId,
          prefill:     {},
          theme:       { color: '#000000' },

          handler: async (response: {
            razorpay_order_id:   string;
            razorpay_payment_id: string;
            razorpay_signature:  string;
          }) => {
            try {
              // 4. Verify payment signature server-side
              await api.post('/payments/verify', {
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature,
              });

              // 5. Create order record in our DB
              const shippingAddress = {
                line1:      address.line1,
                city:       address.city,
                state:      address.state,
                postalCode: address.postalCode,
                country:    address.country,
                ...(address.line2 ? { line2: address.line2 } : {}),
              };

              const { data: newOrder } = await api.post('/orders', {
                cartId,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpayOrderId:   response.razorpay_order_id,
                shippingAddress,
              });

              // 6. Clear cart and navigate to confirmation
              clearCart();
              queryClient.invalidateQueries({ queryKey: ['cart'] });
              navigate(`/orders/confirmation?orderId=${newOrder.orderId}`);
              resolve();
            } catch (err: any) {
              reject(new Error(err.response?.data?.error || 'Order creation failed'));
            }
          },

          modal: {
            ondismiss: () => reject(new Error('CANCELLED')),
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      });
    } catch (err: any) {
      if (err.message !== 'CANCELLED') {
        setError(err.message || 'Payment failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center text-gray-500">
        <p className="text-lg mb-4">Your cart is empty.</p>
        <button onClick={() => navigate('/products')} className="text-black underline">
          Continue Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Shipping address */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Shipping Address</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1 *</label>
              <input
                required
                value={address.line1}
                onChange={(e) => handleChange('line1', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
              <input
                value={address.line2}
                onChange={(e) => handleChange('line2', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
              <input
                required
                value={address.city}
                onChange={(e) => handleChange('city', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
              <input
                required
                value={address.state}
                onChange={(e) => handleChange('state', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code *</label>
              <input
                required
                value={address.postalCode}
                onChange={(e) => handleChange('postalCode', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
              <input
                required
                value={address.country}
                onChange={(e) => handleChange('country', e.target.value)}
                placeholder="IN"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Order summary */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
          {items.map((item) => (
            <div key={item.productId} className="flex justify-between text-sm text-gray-700">
              <span>{item.name} × {item.quantity}</span>
              <span>₹{((item.price * item.quantity) / 100).toFixed(2)}</span>
            </div>
          ))}
          <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t mt-2">
            <span>Total</span>
            <span>₹{(total / 100).toFixed(2)}</span>
          </div>
        </div>

        {/* Razorpay test card hint */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
          <strong>Test mode:</strong> Use card <code>4111 1111 1111 1111</code>, any future expiry, CVV <code>123</code>.
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white py-4 rounded-xl font-medium text-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Processing…' : `Pay ₹${(total / 100).toFixed(2)}`}
        </button>
      </form>
    </div>
  );
}
