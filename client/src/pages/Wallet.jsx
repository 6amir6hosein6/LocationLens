import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const PACKAGES = [
  { id: 'starter', coins: 10, price: '$0.99', label: 'Starter', color: 'blue' },
  { id: 'popular', coins: 50, price: '$3.99', label: 'Popular', color: 'purple', badge: 'Best Value' },
  { id: 'premium', coins: 100, price: '$6.99', label: 'Premium', color: 'green' },
];

export default function Wallet() {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const fetchWallet = async () => {
    try {
      const res = await api.get('/locations/wallet/me');
      setWallet(res.data);
    } catch (err) {
      console.error('Failed to fetch wallet:', err);
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Home
        </Link>

        {/* Coin Balance */}
        <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl p-6 text-white mb-6 shadow-lg">
          <p className="text-white/80 text-sm mb-1">Your Balance</p>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-bold">{wallet?.coins || 0}</span>
            <span className="text-xl">🪙</span>
          </div>
          <p className="text-white/70 text-sm mt-2">
            Each location reveal costs 1 coin
          </p>
        </div>

        {/* Success Toast */}
        {showSuccess && (
          <div className="bg-green-500 text-white px-4 py-3 rounded-xl mb-4 text-center font-medium shadow-lg">
            Coins added successfully! 🎉
          </div>
        )}

        {/* Buy Coins */}
        <h3 className="text-lg font-semibold mb-3">Buy Coins</h3>
        <div className="space-y-3 mb-8">
          {PACKAGES.map((pkg) => (
            <div
              key={pkg.id}
              className={`bg-white rounded-xl p-4 flex items-center justify-between shadow-sm border-2 ${
                pkg.badge ? 'border-purple-400' : 'border-transparent'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{pkg.label}</span>
                  {pkg.badge && (
                    <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full font-medium">
                      {pkg.badge}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">{pkg.coins} coins</p>
              </div>
              <button
                onClick={() => handleBuy(pkg.id)}
                disabled={buying !== null}
                className={`px-5 py-2 rounded-lg font-medium text-white transition-colors ${
                  pkg.color === 'blue'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : pkg.color === 'purple'
                    ? 'bg-purple-600 hover:bg-purple-700'
                    : 'bg-green-600 hover:bg-green-700'
                } disabled:opacity-50`}
              >
                {buying === pkg.id ? 'Buying...' : pkg.price}
              </button>
            </div>
          ))}
        </div>

        {/* Transaction History */}
        <h3 className="text-lg font-semibold mb-3">Transaction History</h3>
        {wallet?.transactions && wallet.transactions.length > 0 ? (
          <div className="space-y-2">
            {wallet.transactions.map((tx) => (
              <div key={tx.id} className="bg-white rounded-xl p-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{txTypeIcons[tx.type] || '📄'}</span>
                  <div>
                    <p className="text-sm text-gray-800">{tx.description}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(tx.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <span
                  className={`font-bold text-sm ${
                    tx.amount > 0 ? 'text-green-600' : 'text-red-500'
                  }`}
                >
                  {tx.amount > 0 ? '+' : ''}{tx.amount} 🪙
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm text-center py-4">No transactions yet</p>
        )}
      </div>
    </div>
  );
}
