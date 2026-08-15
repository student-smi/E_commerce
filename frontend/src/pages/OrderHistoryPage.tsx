import { useNavigate } from 'react-router-dom';
import { useOrders, OrderStatus } from '../hooks/useOrders';

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
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export function OrderHistoryPage() {
  const navigate = useNavigate();
  const { data: orders, isLoading, isError } = useOrders();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 gap-3">
        <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Loading your orders...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center text-red-500">
        Failed to load orders. Please try again.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">Order History</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">Check past purchases and tracking status</p>
      </div>

      {!orders || orders.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-3xl p-8 border border-gray-100">
          <span className="text-6xl mb-4 block">📦</span>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No orders placed yet</h2>
          <p className="text-gray-500 text-sm sm:text-base mb-6 max-w-sm mx-auto">
            Once you place an order, you will be able to track shipment and view receipt history here.
          </p>
          <button
            onClick={() => navigate('/products')}
            className="bg-black text-white px-8 py-3.5 rounded-2xl font-semibold hover:bg-gray-800 active:scale-95 transition-all shadow-md"
          >
            Start Shopping
          </button>
        </div>
      ) : (
        <div className="space-y-3.5 sm:space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              onClick={() => navigate(`/orders/${order.id}`)}
              className="bg-white border border-gray-200/80 rounded-3xl p-4 sm:p-6 cursor-pointer hover:border-black/30 hover:shadow-md transition-all active:scale-[0.99] group"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900 font-mono">
                      #{order.id.slice(0, 8)}
                    </span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs sm:text-sm text-gray-500 font-medium">{formatDate(order.createdAt)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Ship to: {order.shippingAddress.city}, {order.shippingAddress.country}
                  </p>
                </div>

                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full border capitalize whitespace-nowrap ${STATUS_STYLES[order.status]}`}
                >
                  {order.status}
                </span>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                <span className="text-xs font-bold text-indigo-600 group-hover:underline flex items-center gap-1">
                  <span>View Details</span>
                  <span>→</span>
                </span>
                <p className="text-base sm:text-xl font-extrabold text-gray-900">
                  {formatPrice(order.totalAmount)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
