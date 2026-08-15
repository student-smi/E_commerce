import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProduct } from '../hooks/useProducts';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// Map color names to hex values
const COLOR_MAP: Record<string, string> = {
  black: '#111827',
  white: '#ffffff',
  navy: '#1e3a8a',
  blue: '#2563eb',
  gray: '#6b7280',
  charcoal: '#374151',
  olive: '#556b2f',
  green: '#16a34a',
  red: '#dc2626',
  maroon: '#800000',
  beige: '#d2b48c',
  brown: '#78350f',
  pink: '#ec4899',
  yellow: '#eab308',
  khaki: '#c3b091',
};

function getColorHex(colorName: string): string {
  return COLOR_MAP[colorName.toLowerCase().trim()] || '#4b5563';
}

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const { data: product, isLoading, isError } = useProduct(id!);

  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string>('M');
  const [selectedColor, setSelectedColor] = useState<string>('Black');
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [unit, setUnit] = useState<'cm' | 'in'>('in');
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (product) {
      if (product.sizes && product.sizes.length > 0) setSelectedSize(product.sizes[0]);
      if (product.colors && product.colors.length > 0) setSelectedColor(product.colors[0]);
    }
  }, [product]);

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
      await api.post('/cart/add', { productId: id, quantity, size: selectedSize, color: selectedColor });
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      setIsSuccess(true);
      setMessage(`Added! Size ${selectedSize} · ${selectedColor} ✓`);
      setTimeout(() => setMessage(''), 3500);
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
        <button onClick={() => navigate('/products')} className="bg-black text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors">
          ← Back to Catalog
        </button>
      </div>
    );
  }

  const outOfStock = product.stock === 0;
  const availableSizes = product.sizes && product.sizes.length > 0 ? product.sizes : ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  const availableColors = product.colors && product.colors.length > 0 ? product.colors : ['Black', 'Navy', 'White', 'Charcoal'];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-10">
      {/* Back link */}
      <button
        onClick={() => navigate('/products')}
        className="text-xs sm:text-sm text-gray-500 hover:text-black mb-4 sm:mb-6 inline-flex items-center gap-1.5 font-medium transition-colors"
      >
        <span>←</span>
        <span>Back to Products</span>
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 sm:gap-10 items-start">
        {/* Product Image — object-contain so image is never cut on mobile or desktop */}
        <div className="w-full aspect-square sm:aspect-[4/5] max-h-[360px] sm:max-h-[500px] bg-gray-50/90 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xs border border-gray-100 mb-5 sm:mb-0 md:sticky md:top-20 flex items-center justify-center p-3 sm:p-6">
          <img
            src={product.imageUrl || 'https://via.placeholder.com/600x750?text=No+Image'}
            alt={product.name}
            className="w-full h-full object-contain"
          />
        </div>

        {/* Product Details */}
        <div className="flex flex-col">
          {/* Category + Stock badges */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-[11px] font-bold text-black uppercase tracking-wider bg-gray-100 px-3 py-1 rounded-full">
              {product.category}
            </span>
            {outOfStock ? (
              <span className="text-[11px] font-bold text-red-600 bg-red-50 px-3 py-1 rounded-full">Out of Stock</span>
            ) : (
              <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                ✓ In Stock ({product.stock} left)
              </span>
            )}
          </div>

          <h1 className="text-xl sm:text-4xl font-extrabold text-gray-900 mb-1.5 sm:mb-2 tracking-tight leading-tight">
            {product.name}
          </h1>
          <p className="text-xl sm:text-3xl font-extrabold text-gray-900 mb-4 sm:mb-5">
            {formatPrice(product.price)}
          </p>

          {/* ── Color Selector ── */}
          <div className="mb-4 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Color:</span>
              <span className="text-xs font-extrabold text-gray-900">{selectedColor}</span>
            </div>
            {/* Mobile: horizontal scroll, Desktop: flex-wrap */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar sm:flex-wrap">
              {availableColors.map((colorName) => {
                const hex = getColorHex(colorName);
                const isSelected = selectedColor === colorName;
                const isWhite = colorName.toLowerCase() === 'white';
                return (
                  <button
                    key={colorName}
                    type="button"
                    onClick={() => setSelectedColor(colorName)}
                    className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border-2 transition-all active:scale-95 ${
                      isSelected ? 'border-black bg-gray-50' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <span
                      className={`w-3.5 h-3.5 rounded-full shrink-0 ${isWhite ? 'border border-gray-300' : ''}`}
                      style={{ backgroundColor: hex }}
                    />
                    <span className="text-[11px] font-semibold text-gray-900 whitespace-nowrap">{colorName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Size Selector ── */}
          <div className="mb-4 pb-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Size:</span>
                <span className="text-xs font-extrabold text-gray-900">{selectedSize}</span>
              </div>
              <button
                type="button"
                onClick={() => setSizeGuideOpen(true)}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors"
              >
                <span>📏</span>
                <span>Size Guide</span>
              </button>
            </div>
            {/* Responsive size grid: fits long labels, scrollable on mobile if needed */}
            <div className="flex flex-wrap gap-2">
              {availableSizes.map((sz) => {
                const isSelected = selectedSize === sz;
                return (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setSelectedSize(sz)}
                    className={`min-w-[44px] px-3 py-2.5 rounded-xl text-xs font-bold border-2 transition-all active:scale-95 ${
                      isSelected
                        ? 'bg-black text-white border-black shadow-xs'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {sz}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div className="mb-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Description</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              {product.description || 'No description provided for this product.'}
            </p>
          </div>

          {/* Quantity */}
          {!outOfStock && (
            <div className="mb-4 flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-900">Quantity</label>
              <div className="flex items-center border-2 border-gray-200 rounded-xl bg-white">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  className="w-10 h-10 flex items-center justify-center text-lg font-bold text-gray-600 hover:bg-gray-50 rounded-l-xl disabled:opacity-30 active:scale-95"
                >−</button>
                <span className="w-10 text-center text-sm font-bold text-gray-900">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                  disabled={quantity >= product.stock}
                  className="w-10 h-10 flex items-center justify-center text-lg font-bold text-gray-600 hover:bg-gray-50 rounded-r-xl disabled:opacity-30 active:scale-95"
                >+</button>
              </div>
            </div>
          )}

          {/* Feedback message */}
          {message && (
            <div className={`p-3 rounded-xl text-sm font-medium mb-3 flex items-center gap-2 ${
              isSuccess ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              <span>{isSuccess ? '✓' : '⚠️'}</span>
              <span>{message}</span>
            </div>
          )}

          {/* Add to Cart CTA */}
          <button
            onClick={handleAddToCart}
            disabled={outOfStock || adding}
            className="w-full bg-black text-white rounded-2xl font-bold text-sm sm:text-base hover:bg-gray-800 active:scale-[0.99] disabled:opacity-40 transition-all shadow-md"
          >
            {adding ? (
              <div className="flex items-center justify-center gap-2 py-4">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Adding to Cart...</span>
              </div>
            ) : outOfStock ? (
              <span className="block py-4">Out of Stock</span>
            ) : (
              <div className="flex flex-col items-center py-3.5">
                <span className="text-sm font-bold">🛍️ Add to Cart — {formatPrice(product.price * quantity)}</span>
                <span className="text-[11px] text-white/75 mt-0.5">Size: {selectedSize} · Color: {selectedColor}</span>
              </div>
            )}
          </button>
        </div>
      </div>

      {/* ── Size Guide Modal ── */}
      {sizeGuideOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setSizeGuideOpen(false)}
        >
          {/* Bottom sheet on mobile, centered modal on desktop */}
          <div
            className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle (mobile only) */}
            <div className="flex justify-center pt-3 sm:hidden">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            <div className="p-5 sm:p-7 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📏</span>
                  <h3 className="text-base font-bold text-gray-900">Size Guide</h3>
                </div>
                <button
                  onClick={() => setSizeGuideOpen(false)}
                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100"
                >✕</button>
              </div>

              {/* Unit toggle */}
              <div className="flex items-center justify-between bg-gray-50 rounded-2xl p-1">
                <button
                  onClick={() => setUnit('in')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                    unit === 'in' ? 'bg-white text-black shadow-sm' : 'text-gray-500'
                  }`}
                >Inches</button>
                <button
                  onClick={() => setUnit('cm')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                    unit === 'cm' ? 'bg-white text-black shadow-sm' : 'text-gray-500'
                  }`}
                >Centimeters</button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto -mx-1 border border-gray-200 rounded-2xl">
                <table className="w-full text-xs text-left min-w-[280px]">
                  <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-3">Size</th>
                      <th className="px-3 py-3">Chest</th>
                      <th className="px-3 py-3">Waist</th>
                      <th className="px-3 py-3">Length</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {[
                      { size: 'XS', chestIn: '34-36', waistIn: '28-30', lenIn: '26"', chestCm: '86-91cm', waistCm: '71-76cm', lenCm: '66cm' },
                      { size: 'S',  chestIn: '36-38', waistIn: '30-32', lenIn: '27"', chestCm: '91-96cm', waistCm: '76-81cm', lenCm: '68cm' },
                      { size: 'M',  chestIn: '38-40', waistIn: '32-34', lenIn: '28"', chestCm: '96-101cm', waistCm: '81-86cm', lenCm: '71cm' },
                      { size: 'L',  chestIn: '40-42', waistIn: '34-36', lenIn: '29"', chestCm: '101-106cm', waistCm: '86-91cm', lenCm: '73cm' },
                      { size: 'XL', chestIn: '42-44', waistIn: '36-38', lenIn: '30"', chestCm: '106-111cm', waistCm: '91-96cm', lenCm: '76cm' },
                      { size: 'XXL',chestIn: '44-46', waistIn: '38-40', lenIn: '31"', chestCm: '111-116cm', waistCm: '96-101cm', lenCm: '78cm' },
                    ].map((row) => (
                      <tr
                        key={row.size}
                        className={selectedSize === row.size ? 'bg-indigo-50 font-bold text-indigo-900' : ''}
                      >
                        <td className="px-3 py-2.5 font-bold whitespace-nowrap">
                          {row.size} {selectedSize === row.size && '✓'}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">{unit === 'in' ? `${row.chestIn}″` : row.chestCm}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap">{unit === 'in' ? `${row.waistIn}″` : row.waistCm}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap">{unit === 'in' ? row.lenIn : row.lenCm}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Fit tip */}
              <p className="text-xs text-gray-500 bg-amber-50 border border-amber-100 p-3 rounded-xl leading-relaxed">
                💡 <strong>Fit Tip:</strong> Between two sizes? Choose smaller for a fitted look, larger for a relaxed fit.
              </p>

              <button
                onClick={() => setSizeGuideOpen(false)}
                className="w-full bg-black text-white py-3.5 rounded-xl font-bold text-sm hover:bg-gray-800"
              >
                Got it, close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
