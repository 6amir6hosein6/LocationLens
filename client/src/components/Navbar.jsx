import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fa, faNum } from '../utils/persianNum';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user || user.is_admin) return null;

  const links = [
    { to: '/', label: 'کاوش', icon: '🔥' },
    { to: '/add', label: 'افزودن', icon: '➕' },
    { to: '/dashboard', label: 'داشبورد', icon: '📊' },
    { to: '/wallet', label: 'کیف پول', icon: '🪙' },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between z-50 relative">
      <Link to="/" className="flex items-center gap-1.5 text-lg font-bold text-blue-600">
        <img src="/icons/logo.svg" alt="" className="w-6 h-6" />
        لوکیشن‌لنز
      </Link>

      <div className="flex items-center gap-1">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              location.pathname === link.to
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span className="ml-1">{link.icon}</span>
            <span className="hidden sm:inline">{link.label}</span>
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500 hidden sm:inline">
          {user.name || user.phone}
        </span>
        <button
          onClick={logout}
          className="text-xs text-gray-400 hover:text-red-500 transition-colors"
        >
          خروج
        </button>
      </div>
    </nav>
  );
}
