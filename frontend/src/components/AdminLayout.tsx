import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const NAV_LINKS = [
  { to: '/admin',          label: 'Dashboard', icon: '📊', end: true },
  { to: '/admin/orders',   label: 'Orders',    icon: '📦' },
  { to: '/admin/products', label: 'Products',  icon: '👕' },
  { to: '/admin/users',    label: 'Users',     icon: '👥' },
];

export function AdminLayout() {
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  // Get current active title
  const currentTitle = NAV_LINKS.find((item) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
  )?.label || 'Admin Panel';

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col lg:flex-row bg-slate-100">
      {/* Mobile Admin Top Navigation Bar */}
      <div className="lg:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between shadow-md sticky top-16 z-20">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 text-white"
            aria-label="Open sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-lg">⚡</span>
            <span className="font-bold text-sm tracking-wide">{currentTitle}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <NavLink
            to="/products"
            className="text-xs bg-white/10 hover:bg-white/20 px-2.5 py-1.5 rounded-lg text-white/80 transition-colors"
          >
            Store View →
          </NavLink>
        </div>
      </div>

      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-72 lg:w-64 shrink-0 flex flex-col transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{
          background: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)',
        }}
      >
        {/* Brand */}
        <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">⚡</span>
            <div>
              <p className="text-white font-bold text-sm tracking-wide">Admin Panel</p>
             
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white/60 hover:text-white p-1"
          >
            ✕
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 p-3.5 space-y-1.5 overflow-y-auto">
          <p className="text-xs text-white/30 uppercase tracking-widest px-3 mb-3 font-medium">Menu</p>
          {NAV_LINKS.map(({ to, label, icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-white/20 text-white shadow-sm border border-white/20 font-semibold'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <span className="text-lg">{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}

          <div className="pt-4 mt-4 border-t border-white/10">
            <NavLink
              to="/products"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-white/60 hover:bg-white/10 hover:text-white transition-colors"
            >
              <span className="text-base">🛍️</span>
              <span>Back to Store</span>
            </NavLink>
          </div>
        </nav>

        {/* Bottom — Logout */}
        <div className="p-3.5 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium text-white/60 hover:bg-red-500/20 hover:text-red-300 transition-all duration-200"
          >
            <span>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden p-3.5 sm:p-6 lg:p-8" style={{ background: '#f8fafc' }}>
        <Outlet />
      </main>
    </div>
  );
}
