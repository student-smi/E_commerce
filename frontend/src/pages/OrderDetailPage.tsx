import { useNavigate, useParams } from 'react-router-dom';
import { useOrder, OrderStatus } from '../hooks/useOrders';

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending:   'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  shipped:   'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading, isError, error } = useOrder(id!);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // 404 handling
  if (isError || !order) {
    const is404 = (error as any)?.response?.status === 404;
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <p className="text-5xl mb-4">{is404 ? '🔍' : '⚠️'}</p>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          {is404 ? 'Order not found' : 'Failed to load order'}
        </h2>
        <p className="text-gray-500 mb-6">
          {is404 ? "This order doesn't exist or doesn't belong to your account." : 'Please try again later.'}
        </p>
        <button
          onClick={() => navigate('/orders')}
          className="bg-black text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition-colors"
        >
          Back to Orders
        </button>
      </div>
    );
  }

  const addr = order.shippingAddress;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate('/orders')}
        className="text-sm text-gray-500 hover:text-black mb-6 flex items-center gap-1"
      >
        ← Back to orders
      </button>

      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Order Details</h1>
          <p className="text-xs text-gray-500 font-mono">#{order.id}</p>
          <p className="text-sm text-gray-500">{formatDate(order.createdAt)}</p>
        </div>
        <span className={`text-sm font-semibold px-4 py-2 rounded-full capitalize ${STATUS_STYLES[order.status]}`}>
          {order.status}
        </span>
      </div>

      {/* Items */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Items</h2>
        <div className="border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-200">
          {order.items?.map((item) => (
            <div key={item.productId} className="flex gap-4 p-4">
              <img
                src={item.imageUrl || 'https://via.placeholder.com/80x100?text=Item'}
                alt={item.name}
                className="w-16 h-20 object-cover rounded-lg bg-gray-100 flex-shrink-0"
              />
              <div className="flex flex-1 justify-between items-center">
                <div>
                  <p className="font-medium text-gray-900">{item.name}</p>
                  <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                  <p className="text-sm text-gray-500">
                    {formatPrice(item.priceAtPurchase)} each
                  </p>
                </div>
                <p className="font-bold text-gray-900">
                  {formatPrice(item.priceAtPurchase * item.quantity)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Shipping */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Shipping Address</h2>
        <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed">
          <p>{addr.line1}</p>
          {addr.line2 && <p>{addr.line2}</p>}
          <p>{addr.city}, {addr.state} {addr.postalCode}</p>
          <p>{addr.country}</p>
        </div>
      </section>

      {/* Total */}
      <div className="bg-gray-50 rounded-xl p-4 flex justify-between items-center">
        <span className="text-lg font-semibold text-gray-900">Order Total</span>
        <span className="text-xl font-bold text-gray-900">{formatPrice(order.totalAmount)}</span>
      </div>
    </div>
  );
}
