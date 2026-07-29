import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import api from '../services/api';
import { fa, faDate, faDateTime } from '../utils/persianNum';
import { useAppReady } from '../contexts/AppReadyContext';

const STATUS_STYLES = {
  pending: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', label: 'در انتظار بررسی' },
  approved: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', label: 'تایید شده' },
  rejected: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', label: 'رد شده' },
};

export default function Admin() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState([]);
  const [allLocations, setAllLocations] = useState([]);
  const [tab, setTab] = useState('pending');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [notifyTitle, setNotifyTitle] = useState('');
  const [notifyMessage, setNotifyMessage] = useState('');
  const [notifySending, setNotifySending] = useState(false);
  const [notifyFeedback, setNotifyFeedback] = useState('');
  const { markReady } = useAppReady();

  useEffect(() => {
    markReady();
  }, [markReady]);

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

  const handleSendNotification = async (e) => {
    e.preventDefault();
    setNotifySending(true);
    setNotifyFeedback('');
    try {
      const res = await api.post('/push/broadcast', {
        title: notifyTitle,
        message: notifyMessage,
      });
      const { configured, tokens, sent, failed, errors } = res.data;

      if (!configured) {
        setNotifyFeedback('فایربیس روی سرور تنظیم نشده (فایل کلید سرویس یافت نشد)');
      } else if (tokens === 0) {
        setNotifyFeedback('هیچ دستگاهی برای اعلان ثبت نشده - ابتدا با اپ اندروید وارد شوید');
      } else {
        let msg = `از ${fa(tokens)} دستگاه: ${fa(sent)} موفق، ${fa(failed)} ناموفق`;
        if (errors?.length) msg += ` — خطا: ${errors[0]}`;
        setNotifyFeedback(msg);
      }

      if (configured && tokens > 0 && failed === 0) {
        setNotifyTitle('');
        setNotifyMessage('');
        setTimeout(() => {
          setShowNotifyModal(false);
          setNotifyFeedback('');
        }, 2500);
      }
    } catch (err) {
      setNotifyFeedback(err.response?.data?.detail || 'ارسال اعلان ناموفق بود');
    } finally {
      setNotifySending(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
  };

  // ---- computed display list ----
  const baseList = tab === 'pending' ? pending : allLocations;
  const displayed =
    tab === 'all' && statusFilter !== 'all'
      ? baseList.filter((loc) => loc.status === statusFilter)
      : baseList;

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

  return (
    <div className="flex-1 bg-gray-50 overflow-y-auto">
      {/* Top Admin Navigation Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gray-800 text-white flex items-center justify-center font-bold text-sm">
              A
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-800 leading-tight">پنل مدیریت</h1>
              <p className="text-[11px] text-gray-400 leading-tight">LocationLens Admin</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNotifyModal(true)}
              className="px-3 py-1.5 bg-purple-50 text-purple-600 rounded-lg text-xs font-medium hover:bg-purple-100 transition-colors flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              ارسال اعلان
            </button>
            <button
              onClick={loadAdminData}
              className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              به‌روزرسانی
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              بازگشت به اپ
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              خروج
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-3 mb-6">
            <div
              className="bg-yellow-50 rounded-xl p-4 text-center border border-yellow-200 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => { setTab('all'); setStatusFilter('pending'); }}
            >
              <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
              <p className="text-sm text-yellow-700 mt-1">در انتظار</p>
            </div>
            <div
              className="bg-green-50 rounded-xl p-4 text-center border border-green-200 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => { setTab('all'); setStatusFilter('approved'); }}
            >
              <p className="text-3xl font-bold text-green-600">{stats.approved}</p>
              <p className="text-sm text-green-700 mt-1">تایید شده</p>
            </div>
            <div
              className="bg-red-50 rounded-xl p-4 text-center border border-red-200 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => { setTab('all'); setStatusFilter('rejected'); }}
            >
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

        {/* Main Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4">
          {[
            { id: 'pending', label: 'در انتظار بررسی', count: pending.length },
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

        {/* Status quick-filter chips (shown only on "all" tab) */}
        {tab === 'all' && (
          <div className="flex flex-wrap gap-2 mb-5">
            {[
              { id: 'all', label: 'همه', color: 'bg-gray-800 text-white' },
              { id: 'pending', label: 'در انتظار', color: 'bg-yellow-100 text-yellow-700 border border-yellow-200' },
              { id: 'approved', label: 'تایید شده', color: 'bg-green-100 text-green-700 border border-green-200' },
              { id: 'rejected', label: 'رد شده', color: 'bg-red-100 text-red-700 border border-red-200' },
            ].map((chip) => (
              <button
                key={chip.id}
                onClick={() => setStatusFilter(chip.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  statusFilter === chip.id
                    ? chip.color
                    : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {chip.label}
                {chip.id !== 'all' && (
                  <span className="mr-1 opacity-70">
                    ({fa(allLocations.filter((l) => l.status === chip.id).length)})
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

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

      {showNotifyModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5">
            <h3 className="text-lg font-semibold mb-4">ارسال اعلان به همه کاربران</h3>
            <form onSubmit={handleSendNotification}>
              <label className="block text-sm font-medium text-gray-700 mb-1">عنوان</label>
              <input
                type="text"
                value={notifyTitle}
                onChange={(e) => setNotifyTitle(e.target.value)}
                required
                placeholder="مکان جدید اضافه شد"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none mb-3"
              />
              <label className="block text-sm font-medium text-gray-700 mb-1">متن پیام</label>
              <textarea
                value={notifyMessage}
                onChange={(e) => setNotifyMessage(e.target.value)}
                required
                rows={3}
                placeholder="یک مکان جدید برای عکاسی اضافه شد، حتما ببین!"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none mb-3 resize-none"
              />
              {notifyFeedback && (
                <p className="text-sm text-center mb-3 text-gray-600">{notifyFeedback}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowNotifyModal(false); setNotifyFeedback(''); }}
                  className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={notifySending}
                  className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {notifySending ? 'در حال ارسال...' : 'ارسال'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
