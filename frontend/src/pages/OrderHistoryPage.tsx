import { useNavigate } from 'react-router-dom';
import { useOrders, OrderStatus } from '../hooks/useOrders';

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
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export function OrderHistoryPage() {
  const navigate = useNavigate();
  const { data: orders, isLoading, isError } = useOrders();

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center text-red-500">
        Failed to load orders.
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Orders</h1>

      {!orders || orders.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4">📦</p>
          <p className="text-lg font-medium mb-4">No orders yet</p>
          <button
            onClick={() => navigate('/products')}
            className="bg-black text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition-colors"
          >
            Start Shopping
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              onClick={() => navigate(`/orders/${order.id}`)}
              className="bg-white border border-gray-200 rounded-2xl p-5 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-gray-500 font-mono mb-1">#{order.id.slice(0, 8)}…</p>
                  <p className="text-sm text-gray-500">{formatDate(order.createdAt)}</p>
                </div>
                <span
                  className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${STATUS_STYLES[order.status]}`}
                >
                  {order.status}
                </span>
              </div>
              <div className="mt-3 flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  {order.shippingAddress.city}, {order.shippingAddress.country}
                </p>
                <p className="text-lg font-bold text-gray-900">{formatPrice(order.totalAmount)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
