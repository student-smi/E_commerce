import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { CartDrawer } from './CartDrawer';
import { useCart } from '../hooks/useCart';

export function Header() {
  const navigate = useNavigate();
  const { isAuthenticated, role, logout } = useAuthStore();
  const { items } = useCartStore();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Keep cart in sync when authenticated
  useCart();

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <>
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/products" className="text-xl font-bold text-gray-900 tracking-tight">
            Clothing Store
          </Link>

          {/* Nav */}
          <nav className="flex items-center gap-4">
            {isAuthenticated && (
              <>
                <Link
                  to="/products"
                  className="text-sm text-gray-600 hover:text-black transition-colors"
                >
                  Shop
                </Link>
                <Link
                  to="/orders"
                  className="text-sm text-gray-600 hover:text-black transition-colors"
                >
                  My Orders
                </Link>
                {role === 'admin' && (
                  <Link
                    to="/admin"
                    className="text-sm text-gray-600 hover:text-black transition-colors"
                  >
                    Admin
                  </Link>
                )}
              </>
            )}

            {isAuthenticated ? (
              <>
                {/* Cart icon */}
                <button
                  onClick={() => setDrawerOpen(true)}
                  className="relative p-2 text-gray-700 hover:text-black transition-colors"
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
                    <span className="absolute -top-1 -right-1 bg-black text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium">
                      {itemCount > 9 ? '9+' : itemCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-600 hover:text-black transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm text-gray-600 hover:text-black transition-colors">
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="text-sm bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Register
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <CartDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
