import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useCartStore } from '../store/cartStore';

// ── CheckoutPage — Simulated Payment (no real gateway required) ──
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

  // Simulated card fields
  const [card, setCard] = useState({
    number: '',
    expiry: '',
    cvv:    '',
    name:   '',
  });

  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [step,    setStep]    = useState<'address' | 'payment'>('address');

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  function handleAddressChange(field: string, value: string) {
    setAddress((prev) => ({ ...prev, [field]: value }));
  }

  function handleCardChange(field: string, value: string) {
    // Auto-format card number with spaces
    if (field === 'number') {
      value = value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
    }
    // Auto-format expiry MM/YY
    if (field === 'expiry') {
      value = value.replace(/\D/g, '').slice(0, 4);
      if (value.length >= 3) value = value.slice(0, 2) + '/' + value.slice(2);
    }
    if (field === 'cvv') value = value.replace(/\D/g, '').slice(0, 4);
    setCard((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Create simulated payment order on backend
      const { data: orderData } = await api.post('/payments/order', {});

      // 2. Simulate payment verification (always succeeds in sim mode)
      const simPaymentId = `pay_sim_${Date.now()}`;
      await api.post('/payments/verify', {
        razorpay_order_id:   orderData.razorpayOrderId,
        razorpay_payment_id: simPaymentId,
        razorpay_signature:  'sim_signature',
      });

      // 3. Create order record in our DB
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
        razorpayPaymentId: simPaymentId,
        razorpayOrderId:   orderData.razorpayOrderId,
        shippingAddress,
      });

      // 4. Clear cart and navigate to confirmation
      clearCart();
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      navigate(`/orders/confirmation?orderId=${newOrder.orderId}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
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
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Checkout</h1>

      {/* Sim mode banner */}
      <div className="mb-6 p-3 bg-yellow-50 border border-yellow-300 rounded-lg text-sm text-yellow-800">
        🧪 <strong>Test Mode</strong> — payments are simulated. No real money is charged.
        Use any card details to complete the order.
      </div>

      {/* Step tabs */}
      <div className="flex border-b mb-8">
        <button
          onClick={() => setStep('address')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            step === 'address' ? 'border-black text-black' : 'border-transparent text-gray-400'
          }`}
        >
          1. Shipping
        </button>
        <button
          onClick={() => step === 'payment' && setStep('address')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            step === 'payment' ? 'border-black text-black' : 'border-transparent text-gray-400'
          }`}
        >
          2. Payment
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Step 1: Shipping Address ── */}
        {step === 'address' && (
          <section>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1 *</label>
                <input
                  required
                  placeholder="123 Main Street"
                  value={address.line1}
                  onChange={(e) => handleAddressChange('line1', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
                <input
                  placeholder="Apt, Suite, etc."
                  value={address.line2}
                  onChange={(e) => handleAddressChange('line2', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                <input required value={address.city} onChange={(e) => handleAddressChange('city', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                <input required value={address.state} onChange={(e) => handleAddressChange('state', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code *</label>
                <input required value={address.postalCode} onChange={(e) => handleAddressChange('postalCode', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
                <input required value={address.country} onChange={(e) => handleAddressChange('country', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black" />
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!address.line1 || !address.city || !address.state || !address.postalCode || !address.country) {
                  setError('Please fill in all required address fields.');
                  return;
                }
                setError('');
                setStep('payment');
              }}
              className="mt-6 w-full bg-black text-white py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors"
            >
              Continue to Payment →
            </button>
          </section>
        )}

        {/* ── Step 2: Payment ── */}
        {step === 'payment' && (
          <section>
            <div className="border border-gray-200 rounded-xl p-5 bg-gray-50 space-y-4">
              <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <span>💳</span> Card Details
                <span className="ml-auto text-xs font-normal text-gray-400">(simulated — any values work)</span>
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cardholder Name</label>
                <input
                  placeholder="John Doe"
                  value={card.name}
                  onChange={(e) => handleCardChange('name', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
                <input
                  placeholder="4111 1111 1111 1111"
                  value={card.number}
                  onChange={(e) => handleCardChange('number', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black bg-white font-mono tracking-widest"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry (MM/YY)</label>
                  <input
                    placeholder="12/28"
                    value={card.expiry}
                    onChange={(e) => handleCardChange('expiry', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CVV</label>
                  <input
                    placeholder="123"
                    type="password"
                    value={card.cvv}
                    onChange={(e) => handleCardChange('cvv', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Order summary */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 mt-4 space-y-2">
              <p className="text-sm font-semibold text-gray-700 mb-2">Order Summary</p>
              {items.map((item) => (
                <div key={item.productId} className="flex justify-between text-sm text-gray-600">
                  <span>{item.name} × {item.quantity}</span>
                  <span>₹{((item.price * item.quantity) / 100).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t">
                <span>Total</span>
                <span>₹{(total / 100).toFixed(2)}</span>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm mt-4">
                {error}
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setStep('address')}
                className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-xl font-medium hover:border-black transition-colors"
              >
                ← Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-black text-white py-3 rounded-xl font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing…
                  </span>
                ) : (
                  `Place Order — ₹${(total / 100).toFixed(2)}`
                )}
              </button>
            </div>
          </section>
        )}

        {/* Show error on address step too */}
        {step === 'address' && error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}
      </form>
    </div>
  );
}
