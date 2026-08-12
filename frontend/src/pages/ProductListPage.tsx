import { useState } from 'react';
import { useProducts, ProductFilters } from '../hooks/useProducts';
import { ProductCard } from '../components/ProductCard';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

const CATEGORIES = ['All', 'T-Shirts', 'Jeans', 'Dresses', 'Jackets', 'Sneakers'];

export function ProductListPage() {
  const [filters, setFilters] = useState<ProductFilters>({ page: 1, limit: 20 });
  const [search, setSearch]   = useState('');
  const [category, setCategory] = useState('All');
  const [toastMsg, setToastMsg] = useState('');
  const { data, isLoading, isError } = useProducts(filters);
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  }

  function applySearch() {
    setFilters((f) => ({
      ...f,
      page: 1,
      search: search || undefined,
    }));
  }

  function handleCategory(cat: string) {
    setCategory(cat);
    setFilters((f) => ({
      ...f,
      page: 1,
      category: cat === 'All' ? undefined : cat,
    }));
  }

  async function handleAddToCart(productId: string) {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    try {
      await api.post('/cart/add', { productId, quantity: 1 });
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      showToast('Added to cart ✓');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Could not add to cart');
    }
  }

  const totalPages = data ? Math.ceil(data.total / (filters.limit || 20)) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Our Collection</h1>

      {/* Toast notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-black text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium animate-fade-in">
          {toastMsg}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                category === cat
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-black'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex gap-2 sm:ml-auto">
          <input
            type="text"
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applySearch()}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
          <button
            onClick={applySearch}
            className="bg-black text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-800 transition-colors"
          >
            Search
          </button>
        </div>
      </div>

      {/* Grid */}
      {isLoading && (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {isError && (
        <div className="text-center py-20 text-red-500">Failed to load products.</div>
      )}

      {data && (
        <>
          <p className="text-sm text-gray-500 mb-4">{data.total} products</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {data.products.map((p) => (
              <ProductCard key={p.id} product={p} onAddToCart={handleAddToCart} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-10">
              <button
                disabled={(filters.page || 1) <= 1}
                onClick={() => setFilters((f) => ({ ...f, page: (f.page || 1) - 1 }))}
                className="px-4 py-2 border rounded-lg text-sm disabled:opacity-40 hover:border-black transition-colors"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-sm text-gray-600">
                Page {filters.page || 1} of {totalPages}
              </span>
              <button
                disabled={(filters.page || 1) >= totalPages}
                onClick={() => setFilters((f) => ({ ...f, page: (f.page || 1) + 1 }))}
                className="px-4 py-2 border rounded-lg text-sm disabled:opacity-40 hover:border-black transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
