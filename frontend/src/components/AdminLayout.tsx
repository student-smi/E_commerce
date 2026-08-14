import { NavLink, Outlet, useNavigate } from 'react-router-dom';
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

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <aside
        className="w-60 shrink-0 flex flex-col"
        style={{
          background: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)',
        }}
      >
        {/* Brand */}
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            <div>
              <p className="text-white font-bold text-sm tracking-wide">Admin Panel</p>
              <p className="text-purple-300 text-xs">eCommerce AI</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 mt-2">
          <p className="text-xs text-white/30 uppercase tracking-widest px-3 mb-3 font-medium">Menu</p>
          {NAV_LINKS.map(({ to, label, icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-white/15 text-white shadow-sm border border-white/20'
                    : 'text-white/60 hover:bg-white/8 hover:text-white'
                }`
              }
            >
              <span className="text-base">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom — logout */}
        <div className="p-3 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:bg-red-500/20 hover:text-red-300 transition-all duration-200"
          >
            <span>🚪</span>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 overflow-auto" style={{ background: '#f1f5f9' }}>
        <Outlet />
      </div>
    </div>
  );
}
