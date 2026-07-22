import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import api from '../services/api';

function StarRating({ value, onChange, readonly = false, size = 'h-6 w-6' }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(s)}
          onMouseEnter={() => !readonly && setHover(s)}
          onMouseLeave={() => !readonly && setHover(0)}
          className="p-0"
        >
          <svg
            className={`${size} ${readonly ? 'cursor-default' : 'cursor-pointer'} transition-colors ${
              s <= (hover || value) ? 'text-yellow-400' : 'text-gray-300'
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

function RatingSection({ locationId }) {
  const [data, setData] = useState({ avg_rating: null, rating_count: 0, ratings: [] });
  const [myStars, setMyStars] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadRatings = () => {
    api.get(`/locations/${locationId}/ratings`)
      .then((r) => {
        setData(r.data);
        setLoading(false);
      })
      .catch(() => { setLoading(false); });
  };

  useEffect(() => {
    loadRatings();
  }, [locationId]);

  const handleSubmit = async () => {
    if (myStars === 0) { setError('Please select a star rating'); return; }
    setSubmitting(true);
    setError('');
    try {
      await api.post(`/locations/${locationId}/ratings`, {
        stars: myStars,
        comment: comment.trim() || null,
      });
      setDone(true);
      loadRatings();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit rating');
      setDone(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-3"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="pt-3">
      {/* Average + reviews count */}
      <div className="flex items-center gap-2 mb-3">
        <StarRating value={Math.round(data.avg_rating || 0)} readonly size="h-4 w-4" />
        {data.avg_rating ? (
          <>
            <span className="text-sm font-bold text-gray-800">{Number(data.avg_rating).toFixed(1)}</span>
            <span className="text-xs text-gray-400">({data.rating_count} review{data.rating_count !== 1 ? 's' : ''})</span>
          </>
        ) : (
          <span className="text-xs text-gray-400">No ratings yet — be the first!</span>
        )}
      </div>

      {/* Rating form */}
      {!done ? (
        <div className="bg-blue-50 rounded-xl p-4 mb-3">
          <p className="text-sm font-semibold text-gray-700 mb-2">Rate & comment on this location</p>
          <StarRating value={myStars} onChange={setMyStars} />
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience — light quality, best time, tips..."
            rows={3}
            className="w-full mt-3 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none bg-white"
          />
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="mt-2 w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Rating & Comment'}
          </button>
        </div>
      ) : (
        <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-xl mb-3 font-medium">
          Thanks for your rating! Refresh to rate again.
        </div>
      )}

      {/* Existing comments */}
      {data.ratings && data.ratings.length > 0 && (
        <div className="space-y-2">
          {data.ratings.map((rat) => (
            <div key={rat.id} className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                    {(rat.user_name || 'U')[0]}
                  </div>
                  <span className="text-xs font-medium text-gray-700">{rat.user_name}</span>
                </div>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <svg key={s} className={`h-3 w-3 ${s <= rat.stars ? 'text-yellow-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>
              {rat.comment && (
                <p className="text-sm text-gray-600 mt-1">{rat.comment}</p>
              )}
              <p className="text-[10px] text-gray-400 mt-1">{new Date(rat.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


export default function SavedLocations() {
  const [revealed, setRevealed] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/locations/mine/revealed')
      .then((r) => { setRevealed(r.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (revealed.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 px-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🔍</span>
          </div>
          <h2 className="text-lg font-bold text-gray-800 mb-1">No saved locations yet</h2>
          <p className="text-sm text-gray-400">Swipe right to reveal and save locations here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-6 pb-8">
        <h1 className="text-2xl font-bold mb-1">Saved Locations</h1>
        <p className="text-sm text-gray-400 mb-5">{revealed.length} location{revealed.length !== 1 ? 's' : ''} revealed</p>

        <div className="space-y-4">
          {revealed.map((loc) => (
            <div key={loc.id} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
              {/* Header */}
              <div className="flex items-center gap-3 p-3">
                {loc.thumbnail && (
                  <img
                    src={loc.thumbnail}
                    alt={loc.title}
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{loc.title}</h3>
                  {(loc.province || loc.city || loc.neighborhood) && (
                    <p className="text-xs text-gray-500 truncate">
                      {[loc.neighborhood, loc.city, loc.province].filter(Boolean).join(', ')}
                    </p>
                  )}
                  {loc.address && (
                    <p className="text-xs text-gray-400 truncate">{loc.address}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">by {loc.posted_by}</p>
                </div>
              </div>

              {/* Map section */}
              <div className="px-3 pb-2">
                <div className="h-48 rounded-lg overflow-hidden">
                  <MapContainer
                    center={[loc.latitude, loc.longitude]}
                    zoom={14}
                    className="w-full h-full"
                    zoomControl={false}
                    scrollWheelZoom={false}
                    dragging={false}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker position={[loc.latitude, loc.longitude]} />
                  </MapContainer>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400 mt-2">
                  <span>📍 {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}</span>
                  <span>Revealed {new Date(loc.revealed_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Rating & Comments — ALWAYS VISIBLE */}
              <div className="border-t px-3 pb-3 pt-2">
                <RatingSection locationId={loc.id} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
