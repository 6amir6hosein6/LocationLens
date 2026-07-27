import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import SwipeCard from '../components/SwipeCard';
import api from '../services/api';
import { fa, faDate, faDateTime } from '../utils/persianNum';

function StarRow({ stars, size = 'h-4 w-4' }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(s => (
        <svg key={s} className={`${size} ${s <= stars ? 'text-yellow-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function SwipeView() {
  const navigate = useNavigate();
  const [locations, setLocations] = useState([]);
  const [coins, setCoins] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMap, setShowMap] = useState(false);
  const [revealed, setRevealed] = useState(null);
  const [error, setError] = useState('');
  const [revealLoading, setRevealLoading] = useState(false);

  const [showSheet, setShowSheet] = useState(false);
  const [sheetData, setSheetData] = useState(null);
  const [sheetLoading, setSheetLoading] = useState(false);

  const fetchLocations = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [locRes, meRes] = await Promise.all([
        api.get('/locations/swipe'),
        api.get('/auth/me'),
      ]);
      setLocations(locRes.data);
      setCoins(meRes.data.coins);
    } catch {
      setError('خطا در بارگذاری مکان‌ها');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLocations(); }, [fetchLocations]);

  const current = locations[currentIndex];

  const handleSwipe = async (direction) => {
    if (!current) return;
    if (direction === 'right') {
      setRevealLoading(true);
      setError('');
      try {
        const res = await api.post(`/locations/${current.id}/reveal`);
        setRevealed(res.data);
        setShowMap(true);
        setCoins((c) => c - 1);
      } catch (err) {
        setError(err.response?.data?.detail || 'Not enough coins or error');
      } finally {
        setRevealLoading(false);
      }
    } else {
      setCurrentIndex((i) => i + 1);
    }
  };

  const handleDismissMap = () => {
    setShowMap(false);
    setRevealed(null);
    setCurrentIndex((i) => i + 1);
  };

  const openComments = async (locationId) => {
    setShowSheet(true);
    setSheetLoading(true);
    try {
      const res = await api.get(`/locations/${locationId}/ratings`);
      setSheetData(res.data);
    } catch {
      setSheetData({ avg_rating: null, rating_count: 0, ratings: [] });
    } finally {
      setSheetLoading(false);
    }
  };

  const closeSheet = () => {
    setShowSheet(false);
    setSheetData(null);
  };

  if (loading) {
    return (
      <div className="flex-1 bg-gray-900 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent mb-4" />
        <p className="text-gray-400 text-sm">در حال بارگذاری مکان‌ها...</p>
      </div>
    );
  }

  if (!current && !showMap) {
    return (
      <div className="flex-1 bg-gray-900 flex flex-col items-center justify-center px-6">
        <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center mb-5">
          <svg className="h-10 w-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        </div>
        <h2 className="text-white text-xl font-bold mb-2">همه را دیدی!</h2>
        <p className="text-gray-400 text-sm text-center mb-6">فعلاً مکان جدیدی برای کشف نیست.<br />بعداً برگرد یا مکان خودت را اضافه کن.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-900 flex flex-col overflow-hidden relative">
      {/* Top bar: back left, coins right */}
      <div className="flex items-center justify-between px-4 pt-2 pb-1 flex-shrink-0">
        <button
          onClick={() => navigate('/')}
          className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center"
        >
          <svg className="h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-1.5 bg-gray-800 rounded-full px-3 py-1.5">
          <span className="text-sm">🪙</span>
          <span className="text-sm font-bold text-white">{fa(coins)}</span>
        </div>
      </div>

      {/* Card area */}
      <div className="flex-1 flex items-center justify-center px-4 overflow-hidden relative">
        {revealLoading && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-400 border-t-transparent mb-3" />
            <p className="text-white text-sm font-medium">در حال بارگذاری مکان...</p>
          </div>
        )}
        {current && (
          <div className={`w-full max-w-sm aspect-[3/4] relative ${revealLoading ? 'opacity-30' : ''}`}>
            <SwipeCard
              key={current.id}
              card={current}
              onReveal={() => handleSwipe('right')}
              onSkip={() => handleSwipe('left')}
              onShowComments={() => openComments(current.id)}
            />
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-center gap-6 px-4 py-4 flex-shrink-0">
        <button
          onClick={() => handleSwipe('left')}
          disabled={revealLoading}
          className="w-16 h-16 rounded-full bg-gray-800 border-2 border-gray-600 flex items-center justify-center active:scale-90 transition-transform disabled:opacity-40"
          title="رد کردن"
        >
          <svg className="h-7 w-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <button
          onClick={() => handleSwipe('right')}
          disabled={revealLoading || coins < 1}
          className="w-20 h-20 rounded-full bg-blue-600 border-4 border-blue-400 flex items-center justify-center active:scale-90 transition-transform disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30"
          title="کشف (۱ سکه)"
        >
          <svg className="h-9 w-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {error && (
        <p className="absolute top-16 left-0 right-0 text-center text-red-400 text-xs bg-red-900/30 py-1.5 mx-6 rounded-lg z-40">
          {error}
        </p>
      )}

      {/* Map modal */}
      {showMap && revealed && (
        <div className="absolute inset-0 bg-black/80 flex items-end justify-center z-50" onClick={handleDismissMap}>
          <div className="bg-white w-full max-w-lg rounded-t-3xl overflow-hidden animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900">{revealed.title}</h3>
                  {(revealed.province || revealed.city || revealed.neighborhood) && (
                    <p className="text-sm text-gray-500">{[revealed.neighborhood, revealed.city, revealed.province].filter(Boolean).join(', ')}</p>
                  )}
                </div>
                <button onClick={handleDismissMap} className="text-gray-400 hover:text-gray-600">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="h-64">
              <iframe
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${revealed.longitude - 0.01}%2C${revealed.latitude - 0.01}%2C${revealed.longitude + 0.01}%2C${revealed.latitude + 0.01}&layer=mapnik&marker=${revealed.latitude}%2C${revealed.longitude}`}
                className="w-full h-full border-0"
                loading="lazy"
              />
            </div>
            <div className="p-4 bg-gray-50">
              <p className="text-xs text-gray-400 text-center">
                📍 {revealed.latitude.toFixed(5)}, {revealed.longitude.toFixed(5)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Comments bottom sheet */}
      {showSheet && (
        <div className="absolute inset-0 z-50 flex items-end justify-center" onClick={closeSheet}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="bg-white w-full max-w-lg rounded-t-3xl overflow-hidden relative animate-slide-up max-h-[70%] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet header */}
            <div className="flex-shrink-0 p-4 border-b border-gray-100">
              <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-3" />
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900">نظرات</h3>
                  {sheetData && (
                    <div className="flex items-center gap-2 mt-1">
                      <StarRow stars={Math.round(sheetData.avg_rating || 0)} size="h-3.5 w-3.5" />
                      <span className="text-sm text-gray-600">
                        {sheetData.avg_rating ? fa(Number(sheetData.avg_rating).toFixed(1)) : fa('۰')} · {fa(sheetData.rating_count)} نظر
                      </span>
                    </div>
                  )}
                </div>
                <button onClick={closeSheet} className="text-gray-400 hover:text-gray-600">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Reviews list */}
            <div className="flex-1 overflow-y-auto p-4">
              {sheetLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                </div>
              ) : sheetData && sheetData.ratings.length > 0 ? (
                <div className="space-y-3">
                  {sheetData.ratings.map((rat) => (
                    <div key={rat.id} className="bg-gray-50 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                            {(rat.user_name || 'U')[0]}
                          </div>
                          <span className="text-sm font-medium text-gray-700">{rat.user_name}</span>
                        </div>
                        <StarRow stars={rat.stars} size="h-3 w-3" />
                      </div>
                      {rat.comment && (
                        <p className="text-sm text-gray-600 mt-1">{rat.comment}</p>
                      )}
                      <p className="text-[10px] text-gray-400 mt-1">{faDate(rat.created_at)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-3xl mb-2">📝</p>
                  <p className="text-sm text-gray-500">هنوز نظری نیست</p>
                  <p className="text-xs text-gray-400 mt-1">اولین نفری باش که این مکان را کشف و امتیاز می‌دهی!</p>
                </div>
              )}
            </div>

            <div className="flex-shrink-0 pb-[env(safe-area-inset-bottom)]" />
          </div>
        </div>
      )}
    </div>
  );
}
