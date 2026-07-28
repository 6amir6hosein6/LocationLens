import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import api from '../services/api';
import { fa, faDate, faDateTime } from '../utils/persianNum';

const STATUS_STYLES = {
  pending: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', label: 'در انتظار بررسی' },
  approved: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', label: 'تایید شده' },
  rejected: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', label: 'رد شده' },
};

export default function Admin() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState([]);
  const [allLocations, setAllLocations] = useState([]);
  const [tab, setTab] = useState('pending');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/admin-login', { username, password });
      localStorage.setItem('token', res.data.access_token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setIsLogin(false);
      loadAdminData();
    } catch (err) {
      setError(err.response?.data?.detail || 'ورود ناموفق بود');
    } finally {
      setLoading(false);
    }
  };

  const loadAdminData = async () => {
    try {
      const [pendingRes, allRes, statsRes] = await Promise.all([
        api.get('/locations/admin/pending'),
        api.get('/locations/admin/all'),
        api.get('/locations/admin/stats'),
      ]);
      setPending(pendingRes.data);
      setAllLocations(allRes.data);
      setStats(statsRes.data);
    } catch (err) {
      if (err.response?.status === 403) {
        setError('حساب مدیر نیست');
      }
    }
  };

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.is_admin) {
      setIsLogin(false);
      loadAdminData();
    }
  }, []);

  const handleReview = async (locationId, status, reason = '') => {
    try {
      await api.put(`/locations/admin/${locationId}/review`, {
        status,
        rejection_reason: reason || null,
      });
      setPending((prev) => prev.filter((loc) => loc.id !== locationId));
      setAllLocations((prev) =>
        prev.map((loc) =>
          loc.id === locationId ? { ...loc, status } : loc
        )
      );
      setStats((prev) => ({
        ...prev,
        pending: prev.pending - 1,
        [status]: prev[status] + 1,
      }));
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to review');
    }
  };

  const handleDelete = async (locationId) => {
    if (!confirm('آیا مطمئنی می‌خوای این مکان رو حذف کنی؟')) return;
    try {
      await api.delete(`/locations/admin/${locationId}`);
      setPending((prev) => prev.filter((loc) => loc.id !== locationId));
      setAllLocations((prev) => prev.filter((loc) => loc.id !== locationId));
      setStats((prev) => ({
        ...prev,
        pending: prev.pending,
      }));
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete');
    }
  };

  if (isLogin) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-sm w-full">
          <div className="text-center mb-6">
            <img src="/icons/logo.svg" alt="لوکیشن‌لنز" className="w-12 h-12 mx-auto mb-2" />
          <h1 className="text-2xl font-bold text-gray-800">پنل مدیریت</h1>
          <p className="text-gray-500 text-sm mt-1">مدیریت لوکیشن‌لنز</p>
          </div>
          <form onSubmit={handleLogin} className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">نام کاربری</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">رمز عبور</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-800 text-white py-2 rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-50"
            >
              {loading ? 'در حال ورود...' : 'ورود مدیر'}
            </button>
            <p className="text-xs text-gray-400 text-center">پیش‌فرض: admin / admin123</p>
          </form>
        </div>
      </div>
    );
  }

  const displayed = tab === 'pending' ? pending : allLocations;

  return (
    <div className="flex-1 bg-gray-50 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">داشبورد مدیریت</h1>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-3 mb-6">
            <div className="bg-yellow-50 rounded-xl p-4 text-center border border-yellow-200">
              <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
              <p className="text-sm text-yellow-700 mt-1">در انتظار</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center border border-green-200">
              <p className="text-3xl font-bold text-green-600">{stats.approved}</p>
              <p className="text-sm text-green-700 mt-1">تایید شده</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4 text-center border border-red-200">
              <p className="text-3xl font-bold text-red-600">{stats.rejected}</p>
              <p className="text-sm text-red-700 mt-1">رد شده</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-200">
              <p className="text-3xl font-bold text-blue-600">{stats.total_users}</p>
              <p className="text-sm text-blue-700 mt-1">کاربران</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-2 rounded-xl mb-4">{error}</div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5">
          {[
            { id: 'pending', label: 'در انتظار', count: pending.length },
            { id: 'all', label: 'همه مکان‌ها', count: allLocations.length },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
              <span className="mr-1 text-xs text-gray-400">({fa(t.count)})</span>
            </button>
          ))}
        </div>

        {/* Locations list */}
        {displayed.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-2">✅</p>
            <p>مکانی در این بخش وجود ندارد</p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayed.map((loc) => {
              const style = STATUS_STYLES[loc.status] || STATUS_STYLES.pending;
              return (
                <div key={loc.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="md:flex">
                    {loc.images && loc.images.length > 0 && (
                      <div className="md:w-64 h-48 md:h-auto">
                        <img
                          src={`https://lens.amirhossein-service.ir/uploads/${loc.images[0].filename}`}
                          alt={loc.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{loc.title}</h3>
                          <p className="text-sm text-gray-500">
                            توسط {loc.user.name || `عکاس #${loc.user.id}`}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {faDateTime(loc.created_at)}
                          </p>
                        </div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                          {style.label}
                        </span>
                      </div>
                      {(loc.province || loc.city || loc.neighborhood) && (
                        <p className="text-sm text-gray-600 mt-2">
                          📍 {[loc.neighborhood, loc.city, loc.province].filter(Boolean).join(', ')}
                        </p>
                      )}
                      {loc.address && (
                        <p className="text-xs text-gray-500 mt-1">🏠 {loc.address}</p>
                      )}
                      {loc.description && (
                        <p className="text-sm text-gray-500 mt-1">{loc.description}</p>
                      )}

                      {/* EXIF info */}
                      {loc.images?.[0]?.camera_model && (
                        <p className="text-xs text-gray-400 mt-2">
                          📷 {loc.images[0].camera_make} {loc.images[0].camera_model}
                        </p>
                      )}

                      {/* Mini map */}
                      <div className="h-32 mt-3 rounded-lg overflow-hidden border">
                        <MapContainer
                          center={[loc.latitude, loc.longitude]}
                          zoom={13}
                          className="w-full h-full"
                          zoomControl={false}
                          scrollWheelZoom={false}
                          dragging={false}
                        >
                          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                          <Marker position={[loc.latitude, loc.longitude]} />
                        </MapContainer>
                      </div>

                      {/* Action buttons */}
                      {loc.status === 'pending' && (
                        <div className="flex gap-2 mt-4">
                          <button
                            onClick={() => handleReview(loc.id, 'approved')}
                            className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                          >
                            تایید (+۲ سکه)
                          </button>
                          <button
                            onClick={() => handleReview(loc.id, 'rejected', 'Does not meet guidelines')}
                            className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                          >
                            رد کردن
                          </button>
                        </div>
                      )}
                      <button
                        onClick={() => handleDelete(loc.id)}
                        className="w-full mt-2 py-1.5 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition-colors text-xs font-medium"
                      >
                        🗑️ حذف مکان
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
