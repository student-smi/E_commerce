import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
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
function formatUSD(cents: number) { return `$${(cents / 100).toFixed(2)}`; }

export function AdminProductsPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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
    setDeleting(true);
    try {
      await api.delete(`/admin/products/${id}`);
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setDeleteId(null);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete product');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Product Catalog</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Manage items, stock counts, view details, and edit inventory</p>
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
            <div className="col-span-4">Product</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-2">Price</div>
            <div className="col-span-1">Stock</div>
            <div className="col-span-3 text-right">Actions</div>
          </div>

          {/* List Items */}
          <div className="divide-y divide-gray-100">
            {products.map((p) => (
              <div key={p.id} className="transition-colors hover:bg-gray-50/60">
                {/* Desktop View */}
                <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3.5 items-center text-sm">
                  <div className="col-span-4 flex items-center gap-3">
                    <div
                      onClick={() => setViewProduct(p)}
                      className="w-10 h-12 bg-gray-100 rounded-lg overflow-hidden shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                      title="Click to view details"
                    >
                      <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                    </div>
                    <div className="min-w-0">
                      <p
                        onClick={() => setViewProduct(p)}
                        className="font-bold text-gray-900 truncate cursor-pointer hover:text-indigo-600 hover:underline transition-colors"
                      >
                        {p.name}
                      </p>
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
                  <div className="col-span-3 flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => setViewProduct(p)}
                      className="text-xs font-semibold text-gray-700 hover:text-black bg-gray-100 hover:bg-gray-200 px-2.5 py-1.5 rounded-xl transition-colors flex items-center gap-1"
                      title="View product details"
                    >
                      <span>👁️</span>
                      <span>View</span>
                    </button>
                    <button
                      onClick={() => openEdit(p)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2.5 py-1.5 rounded-xl transition-colors flex items-center gap-1"
                    >
                      <span>✏️</span>
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => setDeleteId(p.id)}
                      className="text-xs font-semibold text-red-600 hover:text-red-800 bg-red-50 px-2 py-1.5 rounded-xl transition-colors"
                      title="Delete product"
                    >
                      🗑
                    </button>
                  </div>
                </div>

                {/* Mobile View */}
                <div className="md:hidden p-4 flex gap-3 items-center">
                  <div
                    onClick={() => setViewProduct(p)}
                    className="w-14 h-16 bg-gray-100 rounded-xl overflow-hidden shrink-0 cursor-pointer"
                  >
                    <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      onClick={() => setViewProduct(p)}
                      className="font-bold text-sm text-gray-900 truncate cursor-pointer hover:underline"
                    >
                      {p.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
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
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setViewProduct(p)}
                        className="text-xs font-semibold text-gray-700 bg-gray-100 px-2.5 py-1.5 rounded-xl"
                      >
                        View
                      </button>
                      <button
                        onClick={() => openEdit(p)}
                        className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1.5 rounded-xl"
                      >
                        Edit
                      </button>
                    </div>
                    <button
                      onClick={() => setDeleteId(p.id)}
                      className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-xl w-full text-center"
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

      {/* ── View Product Quick Inspection Modal ── */}
      {viewProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-5 sm:p-7 w-full max-w-xl shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3.5">
              <div className="flex items-center gap-2">
                <span className="text-xl">👁️</span>
                <h2 className="text-lg font-bold text-gray-900">Product Inspection</h2>
              </div>
              <button
                onClick={() => setViewProduct(null)}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Product Body */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-start">
              {/* Image Preview */}
              <div className="aspect-[4/5] bg-gray-100 rounded-2xl overflow-hidden border border-gray-100 shadow-2xs">
                <img
                  src={viewProduct.imageUrl || 'https://via.placeholder.com/400x500?text=No+Image'}
                  alt={viewProduct.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Specs & Pricing */}
              <div className="space-y-3.5">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                    {viewProduct.category}
                  </span>
                  <h3 className="text-xl font-extrabold text-gray-900 mt-2 leading-tight">
                    {viewProduct.name}
                  </h3>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-gray-900">{fmt(viewProduct.price)}</span>
                  <span className="text-xs text-gray-400">({formatUSD(viewProduct.price)})</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 font-medium">Inventory:</span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    viewProduct.stock === 0
                      ? 'bg-red-100 text-red-700'
                      : viewProduct.stock < 10
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {viewProduct.stock === 0 ? 'Out of Stock' : `${viewProduct.stock} units in stock`}
                  </span>
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Description</p>
                  <p className="text-xs sm:text-sm text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-xl">
                    {viewProduct.description || 'No description provided.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Metadata ID & Timestamps */}
            <div className="grid grid-cols-2 gap-3 pt-2 text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              <div>
                <span className="text-gray-400 block font-medium">Product ID</span>
                <span className="font-mono text-gray-800 truncate block font-bold text-[11px]">{viewProduct.id}</span>
              </div>
              <div>
                <span className="text-gray-400 block font-medium">Added Date</span>
                <span className="text-gray-800 font-semibold">{new Date(viewProduct.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <Link
                to={`/products/${viewProduct.id}`}
                target="_blank"
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-2xl text-xs sm:text-sm font-bold transition-all text-center flex items-center justify-center gap-1.5"
              >
                <span>Storefront View</span>
                <span>↗</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  const toEdit = viewProduct;
                  setViewProduct(null);
                  openEdit(toEdit);
                }}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs sm:text-sm font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
              >
                <span>✏️ Edit Item</span>
              </button>
              <button
                type="button"
                onClick={() => setViewProduct(null)}
                className="py-3 px-5 border border-gray-300 rounded-2xl text-xs sm:text-sm font-semibold hover:bg-gray-50"
              >
                Close
              </button>
            </div>
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
                disabled={deleting}
                onClick={() => handleDelete(deleteId)}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
