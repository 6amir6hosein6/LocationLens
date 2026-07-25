import { useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

const pinIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function ClickHandler({ onPosition }) {
  useMapEvents({
    click(e) {
      onPosition(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MapPicker({ latitude, longitude, onPick }) {
  const [ready, setReady] = useState(false);

  const center = latitude && longitude
    ? [parseFloat(latitude), parseFloat(longitude)]
    : [35.6892, 51.3890];

  const handlePosition = useCallback((lat, lng) => {
    onPick(lat.toFixed(6), lng.toFixed(6));
  }, [onPick]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-gray-300" style={{ height: 280 }}>
      <MapContainer
        center={center}
        zoom={latitude && longitude ? 14 : 11}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          eventHandlers={{ add: () => setReady(true) }}
        />
        <ClickHandler onPosition={handlePosition} />
        {latitude && longitude && (
          <Marker position={[parseFloat(latitude), parseFloat(longitude)]} icon={pinIcon} />
        )}
      </MapContainer>

      {!latitude && !longitude && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/5">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow text-sm text-gray-600 flex items-center gap-2">
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
            برای گذاشتن پین روی نقشه ضربه بزنید
          </div>
        </div>
      )}

      {latitude && longitude && (
        <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-lg flex items-center justify-between">
          <span className="flex items-center gap-1">
            <span>📍</span>
            {latitude}, {longitude}
          </span>
          <button
            type="button"
            onClick={() => onPick('', '')}
            className="text-red-300 hover:text-red-100 underline"
          >
            پاک کردن
          </button>
        </div>
      )}
    </div>
  );
}
