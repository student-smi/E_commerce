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
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
      <Link to={`/products/${product.id}`}>
        <div className="aspect-[4/5] bg-gray-100 overflow-hidden">
          <img
            src={product.imageUrl || 'https://via.placeholder.com/400x500?text=No+Image'}
            alt={product.name}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          />
        </div>
      </Link>

      <div className="p-4 flex flex-col flex-1">
        <span className="text-xs text-gray-500 uppercase tracking-wide mb-1">{product.category}</span>
        <Link to={`/products/${product.id}`}>
          <h3 className="font-semibold text-gray-900 hover:underline line-clamp-2 mb-2">{product.name}</h3>
        </Link>
        <div className="mt-auto flex items-center justify-between">
          <span className="text-lg font-bold text-gray-900">{formatPrice(product.price)}</span>
          {outOfStock ? (
            <span className="text-sm text-red-500 font-medium">Out of stock</span>
          ) : (
            <button
              onClick={() => onAddToCart?.(product.id)}
              className="bg-black text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Add to Cart
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
