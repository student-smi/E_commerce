import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProduct } from '../hooks/useProducts';
import api from '../lib/api';

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: product, isLoading, isError } = useProduct(id!);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState('');

  async function handleAddToCart() {
    setAdding(true);
    setMessage('');
    try {
      await api.post('/cart/add', { productId: id, quantity });
      setMessage('Added to cart!');
    } catch (err: any) {
      setMessage(err.response?.data?.error || 'Could not add to cart');
    } finally {
      setAdding(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <p className="text-xl text-gray-600 mb-4">Product not found.</p>
        <button onClick={() => navigate('/products')} className="text-black underline">
          Back to products
        </button>
      </div>
    );
  }

  const outOfStock = product.stock === 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate('/products')}
        className="text-sm text-gray-500 hover:text-black mb-6 flex items-center gap-1"
      >
        ← Back to products
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Image */}
        <div className="aspect-[4/5] bg-gray-100 rounded-2xl overflow-hidden">
          <img
            src={product.imageUrl || 'https://via.placeholder.com/600x750?text=No+Image'}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Details */}
        <div className="flex flex-col">
          <span className="text-sm text-gray-500 uppercase tracking-wide mb-2">{product.category}</span>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
          <p className="text-2xl font-semibold text-gray-800 mb-4">{formatPrice(product.price)}</p>
          <p className="text-gray-600 mb-6 leading-relaxed">{product.description}</p>

          {outOfStock ? (
            <p className="text-red-500 font-semibold mb-4">Out of Stock</p>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-4">{product.stock} in stock</p>
              <div className="flex items-center gap-4 mb-6">
                <label className="text-sm font-medium text-gray-700">Quantity</label>
                <div className="flex items-center border border-gray-300 rounded-lg">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="px-3 py-2 text-lg hover:bg-gray-100"
                  >
                    −
                  </button>
                  <span className="px-4 py-2 text-sm font-medium">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                    className="px-3 py-2 text-lg hover:bg-gray-100"
                  >
                    +
                  </button>
                </div>
              </div>
            </>
          )}

          {message && (
            <p className={`text-sm mb-4 ${message.includes('Added') ? 'text-green-600' : 'text-red-600'}`}>
              {message}
            </p>
          )}

          <button
            onClick={handleAddToCart}
            disabled={outOfStock || adding}
            className="w-full bg-black text-white py-4 rounded-xl font-medium text-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {adding ? 'Adding…' : outOfStock ? 'Out of Stock' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  );
}
