import { Link } from 'react-router-dom';
import { Product } from '../hooks/useProducts';

interface Props {
  product: Product;
  onAddToCart?: (productId: string) => void;
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function ProductCard({ product, onAddToCart }: Props) {
  const outOfStock = product.stock === 0;

  return (
    <div className="group bg-white rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col">
      {/* Product Image Container */}
      <Link to={`/products/${product.id}`} className="block relative aspect-[4/5] bg-gray-100 overflow-hidden">
        <img
          src={product.imageUrl || 'https://via.placeholder.com/400x500?text=No+Image'}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {outOfStock && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] flex items-center justify-center">
            <span className="bg-red-600 text-white text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-sm">
              Out of Stock
            </span>
          </div>
        )}
        <span className="absolute top-2 left-2 bg-white/90 backdrop-blur-xs text-gray-700 text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-md shadow-xs">
          {product.category}
        </span>
      </Link>

      {/* Product Details */}
      <div className="p-3 sm:p-4 flex flex-col flex-1">
        <Link to={`/products/${product.id}`} className="block">
          <h3 className="font-semibold text-xs sm:text-base text-gray-900 group-hover:text-black line-clamp-2 leading-snug sm:leading-normal mb-1 sm:mb-2">
            {product.name}
          </h3>
        </Link>

        <div className="mt-auto pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-sm sm:text-lg font-bold text-gray-900">
              {formatPrice(product.price)}
            </span>
          </div>

          {outOfStock ? (
            <button
              disabled
              className="w-full sm:w-auto text-[11px] sm:text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-xl font-medium cursor-not-allowed"
            >
              Sold Out
            </button>
          ) : (
            <button
              onClick={() => onAddToCart?.(product.id)}
              className="w-full sm:w-auto bg-black text-white text-xs sm:text-sm px-3.5 py-2 sm:px-4 sm:py-2 rounded-xl font-medium hover:bg-gray-800 active:scale-95 transition-all shadow-xs flex items-center justify-center gap-1.5"
            >
              <span>+</span>
              <span>Add</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
