import { MapContainer, TileLayer, Marker, CircleMarker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { ReportLocation } from '../types';

// Fix for default leaflet marker icons
// @ts-ignore
import icon from 'leaflet/dist/images/marker-icon.png';
// @ts-ignore
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

const getColorForType = (type: string) => {
  switch (type) {
    case 'shelter': return '#16a34a'; // green-600
    case 'donation': return '#2563eb'; // blue-600
    case 'transport': return '#9333ea'; // purple-600
    case 'wifi': return '#ea580c'; // orange-600
    case 'collection_center': return '#4f46e5'; // indigo-600
    default: return '#dc2626'; // red-600 (missing_person / affected)
  }
};

interface MapProps {
  locations: ReportLocation[];
  onMapClick: (lat: number, lng: number) => void;
  selectedLocation: { lat: number, lng: number } | null;
  onClaimDonation: (donation: ReportLocation) => void;
}

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function Map({ locations, onMapClick, selectedLocation, onClaimDonation }: MapProps) {
  // Center roughly on Venezuela
  const center: [number, number] = [8.0, -66.0];

  return (
    <MapContainer 
      center={center} 
      zoom={6} 
      style={{ height: '100%', width: '100%' }}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      <MapClickHandler onMapClick={onMapClick} />

      {selectedLocation && (
        <Marker position={[selectedLocation.lat, selectedLocation.lng]} />
      )}

      {locations.map((loc) => (
        <CircleMarker 
          key={loc.id} 
          center={[loc.lat, loc.lng]}
          radius={8}
          pathOptions={{ 
            color: getColorForType(loc.type),
            fillColor: getColorForType(loc.type),
            fillOpacity: 0.8,
            weight: 2
          }}
        >
          <Popup>
            <div className="p-1 max-w-[250px]">
              {loc.photo && (
                <img src={loc.photo} alt="Evidencia" className="w-full h-24 object-cover rounded-md mb-2 border border-gray-200" />
              )}
              <h3 className="font-bold text-lg mb-1 leading-tight">{loc.title}</h3>
              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase text-white mb-2 ${loc.type === 'shelter' ? 'bg-green-600' : loc.type === 'donation' ? 'bg-blue-600' : loc.type === 'transport' ? 'bg-purple-600' : loc.type === 'collection_center' ? 'bg-indigo-600' : loc.type === 'wifi' ? 'bg-orange-600' : 'bg-red-600'}`}>
                {loc.type === 'shelter' ? 'Refugio Disponible' : loc.type === 'donation' ? 'Donación / Insumos' : loc.type === 'transport' ? 'Transporte' : loc.type === 'collection_center' ? 'Centro de Acopio' : loc.type === 'wifi' ? 'Centro WiFi' : 'Persona Desaparecida'}
              </span>
              <p className="text-sm mb-2 text-gray-700 leading-snug">{loc.description}</p>
              
              {(loc.type === 'shelter' || loc.type === 'transport') && loc.capacity && (
                <p className="text-sm"><strong>Capacidad:</strong> {loc.capacity} {loc.type === 'shelter' ? 'personas' : 'espacios'}</p>
              )}
              {loc.contact && (
                <p className="text-sm"><strong>Contacto:</strong> {loc.contact}</p>
              )}
              <p className="text-[10px] text-gray-400 mt-2 font-medium">
                Reportado: {new Date(loc.createdAt).toLocaleDateString()} {new Date(loc.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </p>

              {loc.type === 'donation' && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onClaimDonation(loc); }}
                  className="mt-3 w-full bg-blue-600 text-white font-bold text-xs py-2 rounded-lg shadow-md hover:bg-blue-700 transition-colors"
                >
                  SOLICITAR / RECLAMAR AYUDA
                </button>
              )}
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
