import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useCartStore } from '../store/cartStore';

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

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
    if (field === 'number') {
      value = value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
    }
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

      // 2. Simulate payment verification
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
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <span className="text-5xl mb-3 block">🛍️</span>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
        <p className="text-gray-500 mb-6 text-sm">Please add items to your cart before proceeding to checkout.</p>
        <button
          onClick={() => navigate('/products')}
          className="bg-black text-white px-6 py-3 rounded-2xl font-semibold hover:bg-gray-800 transition-colors"
        >
          Explore Catalog
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">Checkout</h1>
        <p className="text-sm text-gray-500 mt-1">Complete your purchase safely and securely</p>
      </div>

      {/* Simulated Mode Banner */}
      <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs sm:text-sm text-amber-800 flex items-start gap-3 shadow-2xs">
        <span className="text-lg">🧪</span>
        <div>
          <strong className="font-bold">Sandbox Mode Active:</strong> Payments are completely simulated. No real charges will be made. You may enter any test details.
        </div>
      </div>

      {/* Step Tabs Indicator */}
      <div className="grid grid-cols-2 gap-2 p-1.5 bg-gray-100 rounded-2xl mb-8">
        <button
          type="button"
          onClick={() => setStep('address')}
          className={`py-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            step === 'address'
              ? 'bg-white text-black shadow-xs'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-black text-white text-xs flex items-center justify-center">1</span>
          <span>Shipping Address</span>
        </button>
        <button
          type="button"
          onClick={() => {
            if (address.line1 && address.city && address.state && address.postalCode) {
              setStep('payment');
            } else {
              setError('Please fill in shipping address first.');
            }
          }}
          className={`py-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            step === 'payment'
              ? 'bg-white text-black shadow-xs'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center ${step === 'payment' ? 'bg-black text-white' : 'bg-gray-300 text-gray-700'}`}>2</span>
          <span>Payment Details</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm font-medium flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Shipping Address */}
        {step === 'address' && (
          <div className="bg-white border border-gray-100 rounded-3xl p-5 sm:p-8 shadow-xs space-y-4">
            <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
              <span>📍</span>
              <span>Where should we send your order?</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                  Street Address *
                </label>
                <input
                  required
                  placeholder="Flat / House No., Street, Area"
                  value={address.line1}
                  onChange={(e) => handleAddressChange('line1', e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                  Apartment, Suite, Landmark (Optional)
                </label>
                <input
                  placeholder="Near City Park, Apt 4B"
                  value={address.line2}
                  onChange={(e) => handleAddressChange('line2', e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                  City *
                </label>
                <input
                  required
                  placeholder="e.g. Mumbai"
                  value={address.city}
                  onChange={(e) => handleAddressChange('city', e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                  State / Province *
                </label>
                <input
                  required
                  placeholder="e.g. Maharashtra"
                  value={address.state}
                  onChange={(e) => handleAddressChange('state', e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                  Postal Code / PIN *
                </label>
                <input
                  required
                  placeholder="e.g. 400001"
                  value={address.postalCode}
                  onChange={(e) => handleAddressChange('postalCode', e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                  Country *
                </label>
                <input
                  required
                  placeholder="Country"
                  value={address.country}
                  onChange={(e) => handleAddressChange('country', e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
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
              className="mt-6 w-full bg-black text-white py-4 rounded-2xl font-bold text-base hover:bg-gray-800 active:scale-[0.99] transition-all shadow-md flex items-center justify-center gap-2"
            >
              <span>Continue to Payment</span>
              <span>→</span>
            </button>
          </div>
        )}

        {/* Step 2: Payment Details */}
        {step === 'payment' && (
          <div className="bg-white border border-gray-100 rounded-3xl p-5 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span>💳</span>
                <span>Payment Information</span>
              </h2>
              <button
                type="button"
                onClick={() => setStep('address')}
                className="text-xs text-gray-500 hover:text-black underline font-medium"
              >
                Edit Address
              </button>
            </div>

            {/* Total Order Summary in Payment step */}
            <div className="bg-gray-50 p-4 rounded-2xl flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-500 font-medium">Order Total ({items.length} items)</p>
                <p className="text-xl font-extrabold text-gray-900">{formatPrice(total)}</p>
              </div>
              <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full">
                Free Delivery Included
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                  Cardholder Name
                </label>
                <input
                  required
                  placeholder="e.g. John Doe"
                  value={card.name}
                  onChange={(e) => handleCardChange('name', e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                  Card Number
                </label>
                <input
                  required
                  inputMode="numeric"
                  placeholder="4242 4242 4242 4242"
                  value={card.number}
                  onChange={(e) => handleCardChange('number', e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                    Expiry (MM/YY)
                  </label>
                  <input
                    required
                    inputMode="numeric"
                    placeholder="12/28"
                    value={card.expiry}
                    onChange={(e) => handleCardChange('expiry', e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black font-mono text-center"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                    CVV / CVC
                  </label>
                  <input
                    required
                    inputMode="numeric"
                    placeholder="123"
                    value={card.cvv}
                    onChange={(e) => handleCardChange('cvv', e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black font-mono text-center"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setStep('address')}
                className="order-2 sm:order-1 sm:w-1/3 py-4 border border-gray-300 rounded-2xl font-semibold text-sm hover:bg-gray-50 active:scale-95 transition-all text-center"
              >
                ← Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="order-1 sm:order-2 flex-1 bg-black text-white py-4 rounded-2xl font-bold text-base hover:bg-gray-800 active:scale-[0.99] disabled:opacity-50 transition-all shadow-md flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processing Payment...</span>
                  </>
                ) : (
                  <>
                    <span>🔒 Pay {formatPrice(total)} Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
