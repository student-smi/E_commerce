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
      search: search.trim() || undefined,
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
      showToast('🔒 Please login to add items to cart');
      setTimeout(() => navigate('/login'), 1500);
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
    <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-6 sm:py-10">
      {/* Toast notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-4 left-4 sm:left-auto sm:right-6 z-50 bg-gray-900 text-white px-5 py-3.5 rounded-2xl shadow-xl text-sm font-medium text-center animate-fade-in border border-gray-800">
          {toastMsg}
        </div>
      )}

      {/* Page Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
          Trending Collection
        </h1>
        <p className="text-sm sm:text-base text-gray-500 mt-1">
          Explore our latest styles and everyday essentials
        </p>
      </div>

      {/* Search & Filters Section */}
      <div className="space-y-4 mb-6 sm:mb-8">
        {/* Search Bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 pointer-events-none">
              🔍
            </span>
            <input
              type="text"
              placeholder="Search by name, description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applySearch()}
              className="w-full bg-white border border-gray-300 rounded-xl pl-10 pr-4 py-2.5 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all shadow-xs"
            />
            {search && (
              <button
                onClick={() => {
                  setSearch('');
                  setFilters((f) => ({ ...f, page: 1, search: undefined }));
                }}
                className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            )}
          </div>
          <button
            onClick={applySearch}
            className="bg-black text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 active:scale-95 transition-all shadow-xs shrink-0"
          >
            Search
          </button>
        </div>

        {/* Categories horizontally scrollable on mobile */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-3.5 px-3.5 sm:mx-0 sm:px-0 no-scrollbar sm:flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-medium border transition-all shrink-0 whitespace-nowrap active:scale-95 ${
                category === cat
                  ? 'bg-black text-white border-black shadow-xs font-semibold'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400 hover:bg-gray-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product Content / States */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Loading collection...</p>
        </div>
      )}

      {isError && (
        <div className="text-center py-20 bg-red-50 rounded-2xl p-6 border border-red-100">
          <p className="text-red-600 font-semibold mb-2">Failed to load products</p>
          <p className="text-sm text-red-500 mb-4">Please check your connection and try again.</p>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['products'] })}
            className="bg-black text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-800"
          >
            Retry
          </button>
        </div>
      )}

      {data && (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs sm:text-sm text-gray-500 font-medium">
              Showing <span className="font-bold text-gray-900">{data.products.length}</span> of{' '}
              <span className="font-bold text-gray-900">{data.total}</span> products
            </p>
          </div>

          {data.products.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 rounded-2xl p-8 border border-gray-100">
              <span className="text-4xl mb-3 block">🔍</span>
              <h3 className="text-lg font-bold text-gray-900 mb-1">No products found</h3>
              <p className="text-sm text-gray-500 mb-4">Try searching for something else or reset filters.</p>
              <button
                onClick={() => {
                  setSearch('');
                  setCategory('All');
                  setFilters({ page: 1, limit: 20 });
                }}
                className="bg-black text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
              {data.products.map((p) => (
                <ProductCard key={p.id} product={p} onAddToCart={handleAddToCart} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 sm:gap-3 mt-10 sm:mt-12">
              <button
                disabled={(filters.page || 1) <= 1}
                onClick={() => setFilters((f) => ({ ...f, page: (f.page || 1) - 1 }))}
                className="px-3.5 sm:px-5 py-2 sm:py-2.5 bg-white border border-gray-300 rounded-xl text-xs sm:text-sm font-medium disabled:opacity-40 hover:border-black active:scale-95 transition-all shadow-xs"
              >
                ← Prev
              </button>
              <span className="px-3 py-2 text-xs sm:text-sm text-gray-700 font-semibold bg-gray-100 rounded-xl">
                {filters.page || 1} / {totalPages}
              </span>
              <button
                disabled={(filters.page || 1) >= totalPages}
                onClick={() => setFilters((f) => ({ ...f, page: (f.page || 1) + 1 }))}
                className="px-3.5 sm:px-5 py-2 sm:py-2.5 bg-white border border-gray-300 rounded-xl text-xs sm:text-sm font-medium disabled:opacity-40 hover:border-black active:scale-95 transition-all shadow-xs"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
