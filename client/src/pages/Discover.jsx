import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import api from '../services/api';

const STATUS_STYLES = {
  pending: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', label: 'Pending Review' },
  approved: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', label: 'Approved' },
  rejected: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', label: 'Rejected' },
};

const MEDAL_EMOJI = ['🥇', '🥈', '🥉'];

export default function DashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [revealed, setRevealed] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedLocation, setExpandedLocation] = useState(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [meRes, statsRes, subsRes, revRes, lbRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/locations/mine/stats'),
        api.get('/locations/mine/submissions'),
        api.get('/locations/mine/revealed'),
        api.get('/locations/leaderboard'),
      ]);
      setUser(meRes.data);
      setStats(statsRes.data);
      setSubmissions(subsRes.data);
      setRevealed(revRes.data);
      setLeaderboard(lbRes.data);
    } catch (err) {
      console.error('Dashboard load failed:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-6 pb-8">

        {/* Profile Card */}
        {user && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                {(user.name || 'P')[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-900">
                  {user.name || `Photographer #${user.id}`}
                </h2>
                <p className="text-xs text-gray-400">ID: #{user.id} · {user.is_admin ? 'Admin' : 'Photographer'}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-sm font-bold text-yellow-600">🪙 {user.coins}</span>
                  <span className="text-xs text-gray-400">|</span>
                  <span className="text-xs text-gray-500">{stats?.total_submitted || 0} submitted</span>
                  <span className="text-xs text-gray-400">|</span>
                  <span className="text-xs text-gray-500">{revealed.length} revealed</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <button
            onClick={() => navigate('/swipe')}
            className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-4 text-left text-white active:scale-[0.98] transition-transform shadow-lg shadow-blue-200"
          >
            <p className="text-white/70 text-xs mb-1">Ready to explore?</p>
            <p className="text-lg font-bold">Start Swiping</p>
            <p className="text-white/60 text-xs mt-0.5">Discover new spots</p>
          </button>

          <button
            onClick={() => navigate('/add')}
            className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:scale-[0.97] transition-transform text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center mb-1.5">
              <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <p className="font-semibold text-gray-800 text-sm">Add Location</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Earn 2 coins per approval</p>
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <StatCard emoji="🪙" value={stats.coins} label="Coins" color="yellow" />
            <StatCard emoji="📍" value={stats.total_submitted} label="Submitted" color="blue" />
            <StatCard emoji="✅" value={stats.approved} label="Approved" color="green" />
            <StatCard emoji="🔍" value={stats.revealed_count} label="Revealed" color="purple" />
          </div>
        )}

        {/* Approval Rate */}
        {stats && stats.total_submitted > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Approval Rate</span>
              <span className="text-sm font-bold text-gray-800">{stats.approval_rate}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${stats.approval_rate}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-400">
              <span>{stats.approved} approved</span>
              <span>{stats.rejected} rejected</span>
              <span>{stats.pending} pending</span>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5">
          {[
            { id: 'submissions', label: 'My Submissions', count: submissions.length },
            { id: 'revealed', label: 'Saved Locations', count: revealed.length },
            { id: 'leaderboard', label: 'Leaderboard' },
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
              {t.count !== undefined && (
                <span className="ml-1 text-xs text-gray-400">({t.count})</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === 'submissions' && (
          <SubmissionsList
            submissions={submissions}
            expandedId={expandedLocation}
            onToggle={(id) => setExpandedLocation(expandedLocation === id ? null : id)}
          />
        )}

        {tab === 'revealed' && (
          <RevealedList revealed={revealed} />
        )}

        {tab === 'leaderboard' && (
          <LeaderboardList leaderboard={leaderboard} />
        )}
      </div>
    </div>
  );
}


function StatCard({ emoji, value, label, color }) {
  const colors = {
    yellow: 'bg-yellow-50 border-yellow-200',
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    purple: 'bg-purple-50 border-purple-200',
  };
  return (
    <div className={`rounded-xl p-3 text-center border ${colors[color]}`}>
      <span className="text-2xl">{emoji}</span>
      <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}


function SubmissionsList({ submissions, expandedId, onToggle }) {
  if (submissions.length === 0) {
    return (
      <EmptyState
        emoji="📝"
        title="No submissions yet"
        description="Add your first portrait location and earn coins!"
        linkTo="/add"
        linkText="Add Location"
      />
    );
  }

  return (
    <div className="space-y-3">
      {submissions.map((loc) => {
        const style = STATUS_STYLES[loc.status] || STATUS_STYLES.pending;
        return (
          <div
            key={loc.id}
            className={`bg-white rounded-xl shadow-sm overflow-hidden border ${style.border}`}
          >
            <div
              className="flex items-center gap-3 p-3 cursor-pointer"
              onClick={() => onToggle(loc.id)}
            >
              {loc.thumbnail && (
                <img
                  src={loc.thumbnail}
                  alt={loc.title}
                  className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">{loc.title}</h3>
                {loc.address && (
                  <p className="text-xs text-gray-400 truncate">📍 {loc.address}</p>
                )}
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(loc.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                  {style.label}
                </span>
                <span className="text-xs text-gray-400">
                  {expandedId === loc.id ? '▲' : '▼'}
                </span>
              </div>
            </div>

            {expandedId === loc.id && (
              <div className="border-t px-3 pb-3 pt-2">
                {loc.description && (
                  <p className="text-sm text-gray-600 mb-2">{loc.description}</p>
                )}

                <div className="h-36 rounded-lg overflow-hidden mb-2">
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

                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}</span>
                  <span>{loc.image_count} photo(s)</span>
                </div>

                {loc.status === 'rejected' && loc.rejection_reason && (
                  <div className="mt-2 bg-red-50 text-red-600 text-xs p-2 rounded-lg">
                    Rejection reason: {loc.rejection_reason}
                  </div>
                )}

                {loc.status === 'approved' && (
                  <div className="mt-2 bg-green-50 text-green-600 text-xs p-2 rounded-lg">
                    Earned +2 coins on {new Date(loc.approved_at).toLocaleDateString()}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}


function RevealedList({ revealed }) {
  const [expandedId, setExpandedId] = useState(null);

  if (revealed.length === 0) {
    return (
      <EmptyState
        emoji="🔍"
        title="No saved locations yet"
        description="Swipe right on a location to reveal and save it here."
        linkTo="/swipe"
        linkText="Start Swiping"
      />
    );
  }

  return (
    <div className="space-y-3">
      {revealed.map((loc) => (
        <div
          key={loc.id}
          className="bg-white rounded-xl shadow-sm overflow-hidden border border-purple-200"
        >
          <div
            className="flex items-center gap-3 p-3 cursor-pointer"
            onClick={() => setExpandedId(expandedId === loc.id ? null : loc.id)}
          >
            {loc.thumbnail && (
              <img
                src={loc.thumbnail}
                alt={loc.title}
                className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm truncate">{loc.title}</h3>
              {loc.address && (
                <p className="text-xs text-gray-400 truncate">📍 {loc.address}</p>
              )}
              <p className="text-xs text-gray-400 mt-0.5">
                by {loc.posted_by}
              </p>
            </div>
            <span className="text-xs text-gray-400">
              {expandedId === loc.id ? '▲' : '▼'}
            </span>
          </div>

          {expandedId === loc.id && (
            <div className="border-t px-3 pb-3 pt-2">
              {loc.description && (
                <p className="text-sm text-gray-600 mb-2">{loc.description}</p>
              )}

              <div className="h-36 rounded-lg overflow-hidden mb-2">
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

              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}</span>
                <span>Revealed {new Date(loc.revealed_at).toLocaleDateString()}</span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}


function LeaderboardList({ leaderboard }) {
  if (leaderboard.length === 0) {
    return (
      <EmptyState
        emoji="🏆"
        title="No rankings yet"
        description="Be the first to get a location approved!"
        linkTo="/add"
        linkText="Add Location"
      />
    );
  }

  return (
    <div className="space-y-2">
      {leaderboard.map((entry) => (
        <div
          key={entry.user_id}
          className={`bg-white rounded-xl p-3 flex items-center gap-3 shadow-sm ${
            entry.rank <= 3 ? 'border border-yellow-200' : ''
          }`}
        >
          <div className="w-8 text-center flex-shrink-0">
            {entry.rank <= 3 ? (
              <span className="text-xl">{MEDAL_EMOJI[entry.rank - 1]}</span>
            ) : (
              <span className="text-sm font-bold text-gray-400">#{entry.rank}</span>
            )}
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {entry.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{entry.name}</p>
            <p className="text-xs text-gray-400">{entry.approved_count} approved location(s)</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-bold text-yellow-600">🪙 {entry.coins}</p>
          </div>
        </div>
      ))}
    </div>
  );
}


function EmptyState({ emoji, title, description, linkTo, linkText }) {
  return (
    <div className="text-center py-12">
      <p className="text-4xl mb-3">{emoji}</p>
      <h3 className="text-lg font-semibold text-gray-700 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 mb-4">{description}</p>
      <Link
        to={linkTo}
        className="inline-block px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        {linkText}
      </Link>
    </div>
  );
}
