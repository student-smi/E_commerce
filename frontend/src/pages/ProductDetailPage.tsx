import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProduct } from '../hooks/useProducts';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// Map color names to modern hex styling
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
  const clean = colorName.toLowerCase().trim();
  return COLOR_MAP[clean] || '#4b5563';
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

  // Set initial default size and color when product loads
  useEffect(() => {
    if (product) {
      if (product.sizes && product.sizes.length > 0) {
        setSelectedSize(product.sizes[0]);
      }
      if (product.colors && product.colors.length > 0) {
        setSelectedColor(product.colors[0]);
      }
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
      await api.post('/cart/add', {
        productId: id,
        quantity,
        size: selectedSize,
        color: selectedColor,
      });
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      setIsSuccess(true);
      setMessage(`Added to cart (${selectedSize} / ${selectedColor}) ✓`);
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
  const availableSizes = product.sizes && product.sizes.length > 0
    ? product.sizes
    : ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  const availableColors = product.colors && product.colors.length > 0
    ? product.colors
    : ['Black', 'Navy', 'White', 'Charcoal'];

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

          <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 mb-2 tracking-tight">
            {product.name}
          </h1>

          <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-5">
            {formatPrice(product.price)}
          </p>

          {/* ── Color Swatches Selector ── */}
          <div className="mb-5 pb-5 border-b border-gray-100">
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs sm:text-sm font-bold uppercase tracking-wider text-gray-800">
                Color: <span className="font-extrabold text-black ml-1">{selectedColor}</span>
              </label>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {availableColors.map((colorName) => {
                const hex = getColorHex(colorName);
                const isSelected = selectedColor === colorName;
                const isWhite = colorName.toLowerCase() === 'white';
                return (
                  <button
                    key={colorName}
                    type="button"
                    onClick={() => setSelectedColor(colorName)}
                    className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-2xl border transition-all ${
                      isSelected
                        ? 'border-black bg-gray-50 shadow-xs font-bold'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full inline-block shrink-0 shadow-2xs ${isWhite ? 'border border-gray-300' : ''}`}
                      style={{ backgroundColor: hex }}
                    />
                    <span className="text-xs font-medium text-gray-900">{colorName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Size Selector & Size Guide Link ── */}
          <div className="mb-5 pb-5 border-b border-gray-100">
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs sm:text-sm font-bold uppercase tracking-wider text-gray-800">
                Select Size: <span className="font-extrabold text-black ml-1">{selectedSize}</span>
              </label>
              <button
                type="button"
                onClick={() => setSizeGuideOpen(true)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
              >
                <span>📏</span>
                <span>Size Guide</span>
              </button>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {availableSizes.map((sz) => {
                const isSelected = selectedSize === sz;
                return (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setSelectedSize(sz)}
                    className={`py-2.5 rounded-xl text-xs sm:text-sm font-bold border transition-all active:scale-95 flex items-center justify-center ${
                      isSelected
                        ? 'bg-black text-white border-black shadow-xs scale-[1.02]'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-black/50 hover:bg-gray-50'
                    }`}
                  >
                    {sz}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Product Description */}
          <div className="mb-6">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Description</h3>
            <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
              {product.description || 'No description provided for this product.'}
            </p>
          </div>

          {/* Quantity & Add to Cart */}
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
                <span>🛍️ Add to Cart ({selectedSize} · {selectedColor})</span>
                <span>•</span>
                <span>{formatPrice(product.price * quantity)}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Interactive Size Guide Modal ── */}
      {sizeGuideOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">📏</span>
                <h3 className="text-lg font-bold text-gray-900">Clothing Size Guide</h3>
              </div>
              <button
                onClick={() => setSizeGuideOpen(false)}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            {/* Unit Switcher */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">Standard body measurement benchmarks</p>
              <div className="flex bg-gray-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setUnit('in')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    unit === 'in' ? 'bg-white text-black shadow-xs' : 'text-gray-500'
                  }`}
                >
                  Inches (in)
                </button>
                <button
                  type="button"
                  onClick={() => setUnit('cm')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    unit === 'cm' ? 'bg-white text-black shadow-xs' : 'text-gray-500'
                  }`}
                >
                  Centimeters (cm)
                </button>
              </div>
            </div>

            {/* Measurement Table */}
            <div className="overflow-x-auto border border-gray-200 rounded-2xl">
              <table className="w-full text-xs sm:text-sm text-left">
                <thead className="bg-gray-50 text-gray-600 font-bold uppercase text-[11px] border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3">Size</th>
                    <th className="px-4 py-3">Chest / Bust</th>
                    <th className="px-4 py-3">Waist</th>
                    <th className="px-4 py-3">Length</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    { size: 'XS', chestIn: '34 - 36', waistIn: '28 - 30', lenIn: '26', chestCm: '86 - 91', waistCm: '71 - 76', lenCm: '66' },
                    { size: 'S',  chestIn: '36 - 38', waistIn: '30 - 32', lenIn: '27', chestCm: '91 - 96', waistCm: '76 - 81', lenCm: '68' },
                    { size: 'M',  chestIn: '38 - 40', waistIn: '32 - 34', lenIn: '28', chestCm: '96 - 101', waistCm: '81 - 86', lenCm: '71' },
                    { size: 'L',  chestIn: '40 - 42', waistIn: '34 - 36', lenIn: '29', chestCm: '101 - 106', waistCm: '86 - 91', lenCm: '73' },
                    { size: 'XL', chestIn: '42 - 44', waistIn: '36 - 38', lenIn: '30', chestCm: '106 - 111', waistCm: '91 - 96', lenCm: '76' },
                    { size: 'XXL', chestIn: '44 - 46', waistIn: '38 - 40', lenIn: '31', chestCm: '111 - 116', waistCm: '96 - 101', lenCm: '78' },
                  ].map((row) => (
                    <tr key={row.size} className={selectedSize === row.size ? 'bg-indigo-50/70 font-bold text-indigo-900' : ''}>
                      <td className="px-4 py-2.5 font-bold">{row.size} {selectedSize === row.size && '✓'}</td>
                      <td className="px-4 py-2.5">{unit === 'in' ? `${row.chestIn}″` : `${row.chestCm} cm`}</td>
                      <td className="px-4 py-2.5">{unit === 'in' ? `${row.waistIn}″` : `${row.waistCm} cm`}</td>
                      <td className="px-4 py-2.5">{unit === 'in' ? `${row.lenIn}″` : `${row.lenCm} cm`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-gray-50 p-4 rounded-2xl text-xs text-gray-500 space-y-1">
              <p>💡 <strong>Fit Tip:</strong> If your measurements fall between two sizes, order the smaller size for a tighter fit or the larger size for a relaxed, looser fit.</p>
            </div>

            <button
              onClick={() => setSizeGuideOpen(false)}
              className="w-full bg-black text-white py-3 rounded-xl font-bold text-xs sm:text-sm hover:bg-gray-800"
            >
              Got it, continue shopping
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
