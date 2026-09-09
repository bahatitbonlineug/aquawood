import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, LayersControl } from 'react-leaflet';
import { Button } from "@/components/ui/button";
import { Layers, Maximize2 } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons
const createCustomIcon = (color) => L.divIcon({
  className: 'custom-marker',
  html: `<div style="
    background-color: ${color};
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const markerColors = {
  deforestation: '#22c55e',
  water_pollution: '#3b82f6',
  illegal_activity: '#ef4444',
  wildlife: '#f59e0b',
  other: '#6b7280',
  zone_healthy: '#22c55e',
  zone_at_risk: '#f59e0b',
  zone_critical: '#ef4444',
};

function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && 
        Array.isArray(center) && 
        center.length === 2 &&
        typeof center[0] === 'number' && 
        typeof center[1] === 'number' &&
        isFinite(center[0]) && 
        isFinite(center[1])) {
      map.flyTo(center, zoom || map.getZoom(), { duration: 1 });
    }
  }, [center, zoom, map]);
  return null;
}

const UGANDA_CENTER = [0.3476, 32.5825];

const isValidLatLng = (lat, lng) =>
  lat != null && lng != null && isFinite(lat) && isFinite(lng) && !isNaN(lat) && !isNaN(lng);

export default function MapComponent({ 
  center = UGANDA_CENTER,
  zoom = 7,
  reports = [],
  zones = [],
  onMarkerClick,
  onZoneClick,
  className,
  showControls = true
}) {
  const [mapRef, setMapRef] = useState(null);

  // Ensure center is always valid before passing to Leaflet
  const safeCenter = (
    Array.isArray(center) &&
    center.length === 2 &&
    isValidLatLng(center[0], center[1])
  ) ? center : UGANDA_CENTER;

  const handleFullscreen = () => {
    if (mapRef) {
      const container = mapRef.getContainer();
      if (container.requestFullscreen) {
        container.requestFullscreen();
      }
    }
  };

  return (
    <div className={`relative rounded-xl overflow-hidden ${className}`}>
      <MapContainer
        center={safeCenter}
        zoom={zoom}
        style={{ height: '100%', width: '100%', minHeight: '400px' }}
        ref={setMapRef}
      >
        <MapController center={safeCenter} zoom={zoom} />
        
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Street Map">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
          
          <LayersControl.BaseLayer name="Satellite">
            <TileLayer
              attribution='&copy; Esri'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          </LayersControl.BaseLayer>
          
          <LayersControl.BaseLayer name="Terrain">
            <TileLayer
              attribution='&copy; OpenTopoMap'
              url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
          
          <LayersControl.Overlay checked name="Reports">
            {reports.filter(r => isValidLatLng(r.location?.lat, r.location?.lng)).map((report) => (
              <Marker
                key={report.id}
                position={[report.location.lat, report.location.lng]}
                icon={createCustomIcon(markerColors[report.type] || markerColors.other)}
                eventHandlers={{
                  click: () => onMarkerClick?.(report)
                }}
              >
                <Popup>
                  <div className="p-2 min-w-[200px]">
                    <h4 className="font-semibold text-sm">{report.title}</h4>
                    <p className="text-xs text-gray-600 mt-1 capitalize">{report.type?.replace('_', ' ')}</p>
                    <p className="text-xs text-gray-500 mt-2 line-clamp-2">{report.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs text-white ${
                        report.severity === 'critical' ? 'bg-red-500' :
                        report.severity === 'high' ? 'bg-orange-500' :
                        report.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                      }`}>
                        {report.severity}
                      </span>
                      <span className="text-xs text-gray-500 capitalize">{report.status}</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </LayersControl.Overlay>
          
          <LayersControl.Overlay checked name="Monitoring Zones">
            {zones.filter(z => isValidLatLng(z.center?.lat, z.center?.lng)).map((zone) => (
              <Circle
                key={zone.id}
                center={[zone.center.lat, zone.center.lng]}
                radius={15000}
                pathOptions={{
                  color: markerColors[`zone_${zone.status}`] || markerColors.zone_healthy,
                  fillColor: markerColors[`zone_${zone.status}`] || markerColors.zone_healthy,
                  fillOpacity: 0.2,
                  weight: 2
                }}
                eventHandlers={{
                  click: () => onZoneClick?.(zone)
                }}
              >
                <Popup>
                  <div className="p-2 min-w-[200px]">
                    <h4 className="font-semibold text-sm">{zone.name}</h4>
                    <p className="text-xs text-gray-600 mt-1 capitalize">{zone.type?.replace('_', ' ')}</p>
                    <div className="mt-2 space-y-1">
                      {zone.metrics?.forest_cover !== undefined && (
                        <div className="flex justify-between text-xs">
                          <span>Forest Cover:</span>
                          <span className="font-medium">{zone.metrics.forest_cover}%</span>
                        </div>
                      )}
                      {zone.metrics?.water_quality_index !== undefined && (
                        <div className="flex justify-between text-xs">
                          <span>Water Quality:</span>
                          <span className="font-medium">{zone.metrics.water_quality_index}/100</span>
                        </div>
                      )}
                    </div>
                    <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs text-white capitalize ${
                      zone.status === 'critical' ? 'bg-red-500' :
                      zone.status === 'at_risk' ? 'bg-amber-500' : 'bg-green-500'
                    }`}>
                      {zone.status?.replace('_', ' ')}
                    </span>
                  </div>
                </Popup>
              </Circle>
            ))}
          </LayersControl.Overlay>
        </LayersControl>
      </MapContainer>
      
      {showControls && (
        <div className="absolute bottom-4 right-4 z-[1000] flex gap-2">
          <Button
            size="icon"
            variant="secondary"
            className="bg-card/90 backdrop-blur-sm"
            onClick={handleFullscreen}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}