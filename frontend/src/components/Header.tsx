import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { CartDrawer } from './CartDrawer';
import { useCart } from '../hooks/useCart';

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, role, logout } = useAuthStore();
  const { items } = useCartStore();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Keep cart in sync when authenticated
  useCart();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  function handleLogout() {
    logout();
    setMobileMenuOpen(false);
    navigate('/login');
  }

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <Link
              to="/products"
              className="flex items-center gap-2 text-xl font-bold text-gray-900 tracking-tight group"
            >
              <span className="w-8 h-8 bg-black text-white rounded-lg flex items-center justify-center text-sm font-black group-hover:scale-105 transition-transform">
                👕
              </span>
              <span>Clothing Store</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              to="/products"
              className={`text-sm font-medium transition-colors ${
                location.pathname === '/products' ? 'text-black font-semibold' : 'text-gray-600 hover:text-black'
              }`}
            >
              Shop
            </Link>
            {isAuthenticated && (
              <>
                <Link
                  to="/orders"
                  className={`text-sm font-medium transition-colors ${
                    location.pathname.startsWith('/orders') && location.pathname !== '/orders/confirmation'
                      ? 'text-black font-semibold'
                      : 'text-gray-600 hover:text-black'
                  }`}
                >
                  My Orders
                </Link>
                {role === 'admin' && (
                  <Link
                    to="/admin"
                    className={`text-sm font-semibold px-2.5 py-1 rounded-md transition-colors ${
                      location.pathname.startsWith('/admin')
                        ? 'bg-purple-100 text-purple-800'
                        : 'text-purple-700 hover:bg-purple-50'
                    }`}
                  >
                    ⚡ Admin Panel
                  </Link>
                )}
              </>
            )}

            <div className="h-4 w-px bg-gray-200" />

            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                {/* Cart icon */}
                <button
                  onClick={() => setDrawerOpen(true)}
                  className="relative p-2 text-gray-700 hover:text-black transition-colors rounded-full hover:bg-gray-100"
                  aria-label="Open cart"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  {itemCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-black text-white text-[11px] min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center font-bold animate-pulse">
                      {itemCount > 9 ? '9+' : itemCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={handleLogout}
                  className="text-sm font-medium text-gray-600 hover:text-red-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-50"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="text-sm font-medium text-gray-700 hover:text-black transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-50"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="text-sm font-medium bg-black text-white px-4 py-2 rounded-xl hover:bg-gray-800 transition-colors shadow-sm"
                >
                  Register
                </Link>
              </div>
            )}
          </nav>

          {/* Mobile Right Controls (Cart + Hamburger) */}
          <div className="flex md:hidden items-center gap-2">
            {isAuthenticated && (
              <button
                onClick={() => setDrawerOpen(true)}
                className="relative p-2 text-gray-700 hover:text-black rounded-lg active:bg-gray-100"
                aria-label="Open cart"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                {itemCount > 0 && (
                  <span className="absolute 0 top-0.5 right-0.5 bg-black text-white text-[10px] min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center font-bold">
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
              </button>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-gray-700 hover:text-black rounded-lg active:bg-gray-100"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown / Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-5 shadow-lg animate-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col space-y-3">
              <Link
                to="/products"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-base font-medium ${
                  location.pathname === '/products' ? 'bg-gray-100 text-black font-semibold' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>🛍️</span>
                <span>Shop Catalog</span>
              </Link>

              {isAuthenticated ? (
                <>
                  <Link
                    to="/orders"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-base font-medium ${
                      location.pathname.startsWith('/orders') && location.pathname !== '/orders/confirmation'
                        ? 'bg-gray-100 text-black font-semibold'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span>📦</span>
                    <span>My Orders</span>
                  </Link>

                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setDrawerOpen(true);
                    }}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl text-base font-medium text-gray-700 hover:bg-gray-50 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span>🛒</span>
                      <span>Cart</span>
                    </div>
                    {itemCount > 0 && (
                      <span className="bg-black text-white text-xs px-2 py-0.5 rounded-full font-bold">
                        {itemCount} items
                      </span>
                    )}
                  </button>

                  {role === 'admin' && (
                    <Link
                      to="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-base font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-100"
                    >
                      <span>⚡</span>
                      <span>Admin Dashboard</span>
                    </Link>
                  )}

                  <div className="pt-3 border-t border-gray-100">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-base font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                    >
                      <span>🚪</span>
                      <span>Logout</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="pt-2 flex flex-col gap-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 border border-gray-300 rounded-xl font-medium text-gray-800 hover:bg-gray-50 text-base"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 bg-black text-white rounded-xl font-medium hover:bg-gray-800 text-base shadow-sm"
                  >
                    Create Free Account
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      <CartDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
