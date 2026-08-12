import { NavLink, Outlet } from 'react-router-dom';

const NAV_LINKS = [
  { to: '/admin',          label: '📊 Dashboard', end: true },
  { to: '/admin/orders',   label: '📦 Orders' },
  { to: '/admin/users',    label: '👥 Users' },
  { to: '/admin/products', label: '👕 Products' },
];

export function AdminLayout() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 text-white flex flex-col p-4 shrink-0">
        <p className="text-xs text-gray-400 uppercase tracking-widest mb-4 px-2">Admin Panel</p>
        <nav className="space-y-1">
          {NAV_LINKS.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-white text-gray-900' : 'text-gray-300 hover:bg-gray-700'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 bg-gray-50 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}
