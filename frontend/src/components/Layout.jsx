import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', module: 'dashboard', end: true },
  { to: '/customers', label: 'Customers', module: 'customers' },
  { to: '/items', label: 'Items', module: 'items' },
  { to: '/purchases', label: 'Purchases', module: 'purchases' },
  { to: '/sales', label: 'Sales', module: 'sales' },
  { to: '/returns', label: 'Returns', module: 'returns' },
  { to: '/recovery', label: 'Recovery', module: 'recovery' },
  { to: '/reminders', label: 'Reminders', module: 'reminders' },
  { to: '/search', label: 'Search', module: 'sales' },
  { to: '/reports', label: 'Reports', module: 'sales' },
  { to: '/ledger', label: 'Ledger', module: 'sales' },
  { to: '/invoices', label: 'Invoices', module: 'sales' },
  { to: '/users', label: 'Users', module: 'users' },
  { to: '/roles', label: 'Roles', module: 'roles' },
  { to: '/revenue', label: 'Revenue', superAdminOnly: true },
];

export default function Layout() {
  const { user, logout, can } = useAuth();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="w-56 shrink-0 border-r border-slate-200 bg-white print:hidden">
        <div className="border-b border-slate-200 px-4 py-4">
          <p className="text-lg font-semibold text-slate-800">Dukan</p>
          <p className="text-xs text-slate-400">Admin Dashboard</p>
        </div>
        <nav className="px-2 py-3">
          {NAV_ITEMS.filter((item) =>
            item.superAdminOnly ? user?.role_name === 'SUPER_ADMIN' : can(item.module, 'read')
          ).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `mb-1 block rounded-md px-3 py-2 text-sm font-medium ${
                  isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 print:hidden">
          <div />
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-600">
              {user?.name} <span className="text-slate-400">({user?.role_name})</span>
            </span>
            <Link to="/account" className="text-slate-500 hover:text-indigo-600 hover:underline">
              Change password
            </Link>
            <button onClick={logout} className="rounded-md border border-slate-300 px-3 py-1 text-slate-600 hover:bg-slate-50">
              Logout
            </button>
          </div>
        </header>

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
