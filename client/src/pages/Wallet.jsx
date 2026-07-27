import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { fa, faDateTime } from '../utils/persianNum';

export default function Wallet() {
  const [wallet, setWallet] = useState(null);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const fetchWallet = async () => {
    try {
      const [walletRes, pkgRes] = await Promise.all([
        api.get('/locations/wallet/me'),
        api.get('/locations/wallet/packages'),
      ]);
      setWallet(walletRes.data);
      setPackages(pkgRes.data);
    } catch (err) {
      console.error('خطا در دریافت کیف پول:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  const handleBuy = async (packageId) => {
    setBuying(packageId);
    try {
      const res = await api.post(`/locations/wallet/buy?package=${packageId}`);
      setWallet(res.data);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to buy coins:', err);
    } finally {
      setBuying(null);
    }
  };

  const txTypeIcons = {
    signup_bonus: '🎁',
    purchase: '💳',
    reveal_location: '📍',
    reward: '🏆',
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 overflow-y-auto">
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Back */}
        <Link to="/" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4">
          <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          بازگشت به خانه
        </Link>

        {/* Coin Balance */}
        <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl p-6 text-white mb-6 shadow-lg">
          <p className="text-white/80 text-sm mb-1">موجودی شما</p>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-bold">{fa(wallet?.coins || 0)}</span>
            <span className="text-xl">🪙</span>
          </div>
          <p className="text-white/70 text-sm mt-2">
            هر کشف مکان ۱ سکه هزینه دارد
          </p>
        </div>

        {/* Success Toast */}
        {showSuccess && (
          <div className="bg-green-500 text-white px-4 py-3 rounded-xl mb-4 text-center font-medium shadow-lg">
            سکه‌ها با موفقیت اضافه شدند! 🎉
          </div>
        )}

        {/* Buy Coins */}
        <h3 className="text-lg font-semibold mb-3">خرید سکه</h3>
        <div className="space-y-3 mb-8">
          {packages.length === 0 ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl p-4 shadow-sm border-2 border-transparent animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2 w-1/2">
                      <div className="h-4 bg-gray-200 rounded w-20" />
                      <div className="h-3 bg-gray-200 rounded w-24" />
                    </div>
                    <div className="h-8 bg-gray-200 rounded w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            packages.map((pkg) => (
              <div
                key={pkg.id}
                className={`bg-white rounded-xl p-4 flex items-center justify-between shadow-sm border-2 ${
                  pkg.badge ? 'border-purple-400' : 'border-transparent'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800">{pkg.label}</span>
                    {pkg.badge && (
                      <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full font-medium">
                        {pkg.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{pkg.description || `${fa(pkg.coins)} سکه`}</p>
                </div>
                <button
                  onClick={() => handleBuy(pkg.id)}
                  disabled={buying !== null}
                  className={`px-5 py-2 rounded-lg font-medium text-white transition-colors whitespace-nowrap ${
                    pkg.color === 'blue'
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : pkg.color === 'purple'
                      ? 'bg-purple-600 hover:bg-purple-700'
                      : 'bg-green-600 hover:bg-green-700'
                  } disabled:opacity-50`}
                >
                  {buying === pkg.id ? 'در حال خرید...' : fa(pkg.price)}
                </button>
              </div>
            ))
          )}
        </div>

        {/* Transaction History */}
        <h3 className="text-lg font-semibold mb-3">تاریخچه تراکنش‌ها</h3>
        {wallet?.transactions && wallet.transactions.length > 0 ? (
          <div className="space-y-2">
            {wallet.transactions.map((tx) => (
              <div key={tx.id} className="bg-white rounded-xl p-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{txTypeIcons[tx.type] || '📄'}</span>
                  <div>
                    <p className="text-sm text-gray-800">{fa(tx.description)}</p>
                    <p className="text-xs text-gray-400">
                      {faDateTime(tx.created_at)}
                    </p>
                  </div>
                </div>
                <span
                  className={`font-bold text-sm ${
                    tx.amount > 0 ? 'text-green-600' : 'text-red-500'
                  }`}
                >
                  {tx.amount > 0 ? '+' : ''}{fa(tx.amount)} 🪙
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm text-center py-4">هنوز تراکنشی نیست</p>
        )}
      </div>
    </div>
  );
}
