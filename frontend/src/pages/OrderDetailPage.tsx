import { useNavigate, useParams } from 'react-router-dom';
import { useOrder, OrderStatus } from '../hooks/useOrders';

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending:   'bg-amber-100 text-amber-800 border-amber-200',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
  shipped:   'bg-purple-100 text-purple-800 border-purple-200',
  delivered: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
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
      <div className="flex flex-col items-center justify-center py-28 gap-3">
        <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Loading order details...</p>
      </div>
    );
  }

  // 404 handling
  if (isError || !order) {
    const is404 = (error as any)?.response?.status === 404;
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <p className="text-5xl mb-4">{is404 ? '🔍' : '⚠️'}</p>
        <h2 className="text-xl font-bold text-gray-800 mb-2">
          {is404 ? 'Order not found' : 'Failed to load order'}
        </h2>
        <p className="text-gray-500 mb-6 text-sm">
          {is404 ? "This order doesn't exist or doesn't belong to your account." : 'Please try again later.'}
        </p>
        <button
          onClick={() => navigate('/orders')}
          className="bg-black text-white px-6 py-3 rounded-2xl hover:bg-gray-800 transition-colors text-sm font-semibold"
        >
          Back to Orders
        </button>
      </div>
    );
  }

  const addr = order.shippingAddress;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <button
        onClick={() => navigate('/orders')}
        className="text-xs sm:text-sm text-gray-500 hover:text-black mb-4 sm:mb-6 inline-flex items-center gap-1.5 font-medium transition-colors"
      >
        <span>←</span>
        <span>Back to My Orders</span>
      </button>

      {/* Header */}
      <div className="bg-white border border-gray-100 rounded-3xl p-5 sm:p-6 shadow-xs mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 mb-1">Order Details</h1>
            <p className="text-xs text-gray-500 font-mono">#{order.id}</p>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">{formatDate(order.createdAt)}</p>
          </div>
          <span className={`text-xs sm:text-sm font-bold px-3.5 py-1.5 rounded-full border capitalize ${STATUS_STYLES[order.status]}`}>
            {order.status}
          </span>
        </div>
      </div>

      {/* Items */}
      <section className="mb-6">
        <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-3">Items Ordered</h2>
        <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden divide-y divide-gray-100 shadow-xs">
          {order.items?.map((item) => (
            <div key={item.productId} className="flex gap-3 sm:gap-4 p-4 sm:p-5 items-center">
              <img
                src={item.imageUrl || 'https://via.placeholder.com/80x100?text=Item'}
                alt={item.name}
                className="w-16 h-20 sm:w-20 sm:h-24 object-cover rounded-2xl bg-gray-100 shrink-0"
              />
              <div className="flex flex-1 justify-between items-center gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-sm sm:text-base text-gray-900 truncate">{item.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Quantity: {item.quantity}</p>
                  <p className="text-xs text-gray-400">
                    {formatPrice(item.priceAtPurchase)} each
                  </p>
                </div>
                <p className="font-extrabold text-sm sm:text-base text-gray-900 text-right shrink-0">
                  {formatPrice(item.priceAtPurchase * item.quantity)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Shipping Address */}
      <section className="mb-6">
        <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-3">Delivery Address</h2>
        <div className="bg-white border border-gray-100 rounded-3xl p-5 text-sm text-gray-700 leading-relaxed shadow-xs">
          <p className="font-semibold text-gray-900">{addr.line1}</p>
          {addr.line2 && <p className="text-gray-600">{addr.line2}</p>}
          <p className="text-gray-600">{addr.city}, {addr.state} {addr.postalCode}</p>
          <p className="text-gray-600 font-medium mt-1">{addr.country}</p>
        </div>
      </section>

      {/* Summary Total */}
      <div className="bg-gray-900 text-white rounded-3xl p-5 sm:p-6 flex justify-between items-center shadow-md">
        <div>
          <span className="text-xs text-gray-400 uppercase tracking-wider font-bold block">Total Amount</span>
          <span className="text-sm text-emerald-400 font-medium">✓ Paid via simulated gateway</span>
        </div>
        <span className="text-2xl sm:text-3xl font-black">{formatPrice(order.totalAmount)}</span>
      </div>
    </div>
  );
}
