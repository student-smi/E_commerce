import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { Product } from '../../hooks/useProducts';

interface ProductForm {
  name: string;
  description: string;
  price: string;
  stock: string;
  category: string;
  imageUrl: string;
}

const EMPTY_FORM: ProductForm = { name: '', description: '', price: '', stock: '', category: 'T-Shirts', imageUrl: '' };
const CATEGORIES = ['All', 'T-Shirts', 'Jeans', 'Dresses', 'Jackets', 'Sneakers'];
const CATEGORY_OPTIONS = ['T-Shirts', 'Jeans', 'Dresses', 'Jackets', 'Sneakers'];

function fmt(cents: number) { return `₹${(cents / 100).toFixed(0)}`; }

export function AdminProductsPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => api.get('/products', { params: { limit: 200 } }).then((r) => r.data),
  });

  const allProducts: Product[] = data?.products || [];
  const products = catFilter === 'All' ? allProducts : allProducts.filter((p) => p.category === catFilter);

  function openCreate() {
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setError('');
    setModalOpen(true);
  }

  function openEdit(product: Product) {
    setEditingProduct(product);
    setForm({
      name: product.name,
      description: product.description,
      price: String(product.price),
      stock: String(product.stock),
      category: product.category,
      imageUrl: product.imageUrl,
    });
    setError('');
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name,
        description: form.description,
        price: parseInt(form.price),
        stock: parseInt(form.stock),
        category: form.category,
        imageUrl: form.imageUrl,
      };
      if (editingProduct) {
        await api.put(`/admin/products/${editingProduct.id}`, payload);
      } else {
        await api.post('/admin/products', payload);
      }
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setModalOpen(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/admin/products/${id}`);
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setDeleteId(null);
    } catch {
      alert('Delete failed');
    }
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Product Catalog</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Manage items, stock counts, and categories</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-black text-white px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold hover:bg-gray-800 active:scale-95 transition-all shadow-sm flex items-center justify-center gap-2 shrink-0"
        >
          <span>+ Add Product</span>
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar sm:flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCatFilter(cat)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              catFilter === cat
                ? 'bg-black text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Product List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs sm:text-sm text-gray-500 font-medium">Loading products...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 p-6">
          <span className="text-4xl mb-2 block">👕</span>
          <p className="font-bold text-gray-900">No products found</p>
          <p className="text-xs text-gray-400 mt-1">Click "Add Product" above to create your first item.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden">
          {/* Desktop Table Header */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3.5 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
            <div className="col-span-5">Product</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-2">Price</div>
            <div className="col-span-1">Stock</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {/* List Items */}
          <div className="divide-y divide-gray-100">
            {products.map((p) => (
              <div key={p.id} className="transition-colors hover:bg-gray-50/60">
                {/* Desktop View */}
                <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3.5 items-center text-sm">
                  <div className="col-span-5 flex items-center gap-3">
                    <div className="w-10 h-12 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                      <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 truncate">{p.name}</p>
                      <p className="text-xs text-gray-400 truncate">{p.description}</p>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs font-medium bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">
                      {p.category}
                    </span>
                  </div>
                  <div className="col-span-2 font-bold text-gray-900">
                    {fmt(p.price)}
                  </div>
                  <div className="col-span-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                      p.stock === 0 ? 'bg-red-100 text-red-700' : p.stock < 10 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {p.stock}
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    <button
                      onClick={() => openEdit(p)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-xl transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteId(p.id)}
                      className="text-xs font-semibold text-red-600 hover:text-red-800 bg-red-50 px-2.5 py-1.5 rounded-xl transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Mobile View */}
                <div className="md:hidden p-4 flex gap-3 items-center">
                  <div className="w-14 h-16 bg-gray-100 rounded-xl overflow-hidden shrink-0">
                    <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900 truncate">{p.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-bold text-gray-900">{fmt(p.price)}</span>
                      <span className="text-[10px] text-gray-400">•</span>
                      <span className="text-[11px] text-gray-500 font-medium">{p.category}</span>
                      <span className="text-[10px] text-gray-400">•</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        p.stock === 0 ? 'text-red-700 bg-red-50' : 'text-emerald-700 bg-emerald-50'
                      }`}>
                        {p.stock} in stock
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      onClick={() => openEdit(p)}
                      className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteId(p.id)}
                      className="text-xs font-semibold text-red-600 bg-red-50 px-3 py-1.5 rounded-xl"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Product Modal (Create/Edit) */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl p-5 sm:p-6 w-full max-w-lg shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-lg font-bold text-gray-900">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs sm:text-sm">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Classic White Tee"
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Description</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Product details..."
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Price (cents/paisa)</label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="2999"
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Stock Count</label>
                  <input
                    type="number"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    placeholder="50"
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Image URL</label>
                  <input
                    type="text"
                    value={form.imageUrl}
                    onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex-1 py-3 border border-gray-300 rounded-2xl text-xs sm:text-sm font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving || !form.name || !form.price}
                onClick={handleSave}
                className="flex-1 py-3 bg-black text-white rounded-2xl text-xs sm:text-sm font-bold hover:bg-gray-800 disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingProduct ? 'Save Changes' : 'Create Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl space-y-4">
            <span className="text-4xl block">🗑️</span>
            <h3 className="text-lg font-bold text-gray-900">Delete this product?</h3>
            <p className="text-xs text-gray-500">This action cannot be undone. It will permanently remove the item.</p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 border border-gray-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
