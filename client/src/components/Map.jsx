import { useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import SearchBar from './SearchBar';
import AddLocationModal from './AddLocationModal';

const defaultIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const selectedIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'selected-marker',
});

function LocationMarker({ position, onRemove }) {
  useMapEvents({
    click(e) {
      if (onRemove) {
        onRemove(e.latlng);
      }
    },
  });

  if (!position) return null;

  return (
    <Marker position={position} icon={selectedIcon}>
      <Popup>
        <div className="text-center p-1">
          <p className="font-medium">Selected Location</p>
          <p className="text-xs text-gray-500">
            {position[0].toFixed(6)}, {position[1].toFixed(6)}
          </p>
        </div>
      </Popup>
    </Marker>
  );
}

function MapEvents({ onClick }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng);
    },
  });
  return null;
}

function FlyToButton({ center, zoom }) {
  const map = useMap();
  return (
    <button
      onClick={() => map.flyTo(center, zoom || 13)}
      className="absolute bottom-4 right-4 z-[1000] bg-white rounded-full shadow-lg p-2 hover:bg-gray-100"
      title="Reset view"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
      </svg>
    </button>
  );
}

export default function Map({ locations, mode, onLocationAdded }) {
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [mapCenter, setMapCenter] = useState([20, 0]);
  const [mapZoom, setMapZoom] = useState(2);

  const handleMapClick = (latlng) => {
    if (mode === 'add') {
      setSelectedPosition([latlng.lat, latlng.lng]);
      setShowModal(true);
    }
  };

  const handleLocationCreated = () => {
    setShowModal(false);
    setSelectedPosition(null);
    if (onLocationAdded) onLocationAdded();
  };

  const handleSearchSelect = (lat, lon) => {
    setMapCenter([lat, lon]);
    setMapZoom(14);
  };

  return (
    <div className="relative w-full h-full">
      <SearchBar onSelect={handleSearchSelect} />

      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        className="w-full h-full"
        zoomControl={false}
        key={mapCenter.toString()}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {locations.map((loc) => (
          <Marker
            key={loc.id}
            position={[loc.latitude, loc.longitude]}
            icon={defaultIcon}
          >
            <Popup className="custom-marker-popup">
              <div className="min-w-[200px]">
                {loc.thumbnail && (
                  <img
                    src={loc.thumbnail}
                    alt={loc.title}
                    className="w-full h-32 object-cover rounded mb-2"
                  />
                )}
                <h3 className="font-semibold text-sm">{loc.title}</h3>
                {loc.address && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{loc.address}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">by {loc.user.name || loc.user.phone}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        <LocationMarker
          position={selectedPosition}
          onRemove={mode === 'add' ? undefined : undefined}
        />

        <MapEvents onClick={handleMapClick} />
        <FlyToButton center={mapCenter} zoom={mapZoom} />
      </MapContainer>

      {mode === 'add' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white rounded-full shadow-lg px-4 py-2 text-sm text-gray-700">
          Click on the map to select a location
        </div>
      )}

      {showModal && selectedPosition && (
        <AddLocationModal
          position={selectedPosition}
          onClose={() => { setShowModal(false); setSelectedPosition(null); }}
          onCreated={handleLocationCreated}
        />
      )}
    </div>
  );
}
