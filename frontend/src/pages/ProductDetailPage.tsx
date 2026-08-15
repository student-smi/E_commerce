import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProduct } from '../hooks/useProducts';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const { data: product, isLoading, isError } = useProduct(id!);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  async function handleAddToCart() {
    if (!isAuthenticated) {
      setIsSuccess(false);
      setMessage('🔒 Please login to add items to cart');
      setTimeout(() => navigate('/login'), 1500);
      return;
    }
    setAdding(true);
    setMessage('');
    try {
      await api.post('/cart/add', { productId: id, quantity });
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      setIsSuccess(true);
      setMessage('Added to cart!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setIsSuccess(false);
      setMessage(err.response?.data?.error || 'Could not add to cart');
    } finally {
      setAdding(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 gap-3">
        <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Loading product details...</p>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center">
        <span className="text-5xl mb-4 block">🔍</span>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Product Not Found</h2>
        <p className="text-gray-500 mb-6">This item may have been removed or does not exist.</p>
        <button
          onClick={() => navigate('/products')}
          className="bg-black text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors"
        >
          ← Back to Catalog
        </button>
      </div>
    );
  }

  const outOfStock = product.stock === 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Breadcrumb Back link */}
      <button
        onClick={() => navigate('/products')}
        className="text-xs sm:text-sm text-gray-500 hover:text-black mb-4 sm:mb-6 inline-flex items-center gap-1.5 font-medium transition-colors"
      >
        <span>←</span>
        <span>Back to Products</span>
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10 items-start">
        {/* Product Image */}
        <div className="aspect-[4/5] bg-gray-100 rounded-3xl overflow-hidden shadow-xs border border-gray-100 sticky top-20">
          <img
            src={product.imageUrl || 'https://via.placeholder.com/600x750?text=No+Image'}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Product Details & Actions */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-black uppercase tracking-wider bg-gray-100 px-3 py-1 rounded-full">
              {product.category}
            </span>
            {outOfStock ? (
              <span className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1 rounded-full">
                Out of Stock
              </span>
            ) : (
              <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                ✓ In Stock ({product.stock} left)
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 mb-3 tracking-tight">
            {product.name}
          </h1>

          <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-4">
            {formatPrice(product.price)}
          </p>

          <div className="border-t border-b border-gray-100 py-4 mb-6">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Description</h3>
            <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
              {product.description || 'No description provided for this product.'}
            </p>
          </div>

          {!outOfStock && (
            <div className="mb-6 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-900">Quantity</label>
                <div className="flex items-center border border-gray-300 rounded-2xl bg-white shadow-2xs">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="w-10 h-10 flex items-center justify-center text-lg font-bold text-gray-600 hover:bg-gray-100 rounded-l-2xl disabled:opacity-30 active:scale-95"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span className="w-12 text-center text-sm sm:text-base font-bold text-gray-900">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                    disabled={quantity >= product.stock}
                    className="w-10 h-10 flex items-center justify-center text-lg font-bold text-gray-600 hover:bg-gray-100 rounded-r-2xl disabled:opacity-30 active:scale-95"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          )}

          {message && (
            <div
              className={`p-3.5 rounded-xl text-sm font-medium mb-4 flex items-center gap-2 ${
                isSuccess ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              <span>{isSuccess ? '✓' : '⚠️'}</span>
              <span>{message}</span>
            </div>
          )}

          <button
            onClick={handleAddToCart}
            disabled={outOfStock || adding}
            className="w-full bg-black text-white py-4 rounded-2xl font-bold text-base sm:text-lg hover:bg-gray-800 active:scale-[0.99] disabled:opacity-40 transition-all shadow-md flex items-center justify-center gap-2"
          >
            {adding ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Adding to Cart...</span>
              </>
            ) : outOfStock ? (
              <span>Out of Stock</span>
            ) : (
              <>
                <span>🛍️ Add to Cart</span>
                <span>•</span>
                <span>{formatPrice(product.price * quantity)}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
