import { Link, useLocation } from 'react-router-dom';

const tabs = [
  {
    to: '/',
    label: 'داشبورد',
    icon: (active) => (
      <svg className={`h-6 w-6 ${active ? 'text-blue-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    to: '/swipe',
    label: 'کاوش',
    icon: (active) => (
      <svg className={`h-6 w-6 ${active ? 'text-blue-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
  },
  {
    to: '/add',
    label: 'افزودن',
    icon: (active) => (
      <svg className={`h-6 w-6 ${active ? 'text-blue-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
    ),
  },
  {
    to: '/saved',
    label: 'ذخیره‌شده',
    icon: (active) => (
      <svg className={`h-6 w-6 ${active ? 'text-blue-600' : 'text-gray-400'}`} fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>
    ),
  },
  {
    to: '/wallet',
    label: 'کیف پول',
    icon: (active) => (
      <svg className={`h-6 w-6 ${active ? 'text-blue-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

export default function BottomNav({ coins }) {
  const location = useLocation();

  return (
    <nav className="bg-white border-t border-gray-200 px-2 pb-[env(safe-area-inset-bottom)] flex-shrink-0">
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const isActive = tab.to === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(tab.to);

          return (
            <Link
              key={tab.to}
              to={tab.to}
              className="flex flex-col items-center justify-center gap-0.5 px-3 py-1 min-w-[64px]"
            >
              {tab.icon(isActive)}
              <span className={`text-[10px] font-medium ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
