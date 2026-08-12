import { useSearchParams, useNavigate } from 'react-router-dom';

export function OrderConfirmationPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <div className="text-6xl mb-6">🎉</div>
      <h1 className="text-3xl font-bold text-gray-900 mb-3">Order Placed!</h1>
      <p className="text-gray-600 mb-2">Thank you for your purchase.</p>
      {orderId && (
        <p className="text-sm text-gray-500 mb-8">
          Order ID: <span className="font-mono font-medium text-gray-800">{orderId}</span>
        </p>
      )}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={() => navigate('/orders')}
          className="bg-black text-white px-8 py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors"
        >
          View My Orders
        </button>
        <button
          onClick={() => navigate('/products')}
          className="border border-gray-300 text-gray-700 px-8 py-3 rounded-xl font-medium hover:border-black transition-colors"
        >
          Continue Shopping
        </button>
      </div>
    </div>
  );
}
