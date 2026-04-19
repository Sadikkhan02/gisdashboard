'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const defaultCenter = [22.9734, 78.6569];

const tileLayers = {
  street: {
    label: 'Street',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
  topo: {
    label: 'Terrain',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors, SRTM, OpenTopoMap',
  },
  light: {
    label: 'Light',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
  },
};

function ViewportReporter({ onViewportChange }) {
  const lastViewportRef = useRef('');

  const emitViewport = useCallback(
    (map) => {
      const bounds = map.getBounds();
      const viewport = {
        north: bounds.getNorth(),
        east: bounds.getEast(),
        south: bounds.getSouth(),
        west: bounds.getWest(),
      };
      const signature = JSON.stringify(viewport);

      if (signature !== lastViewportRef.current) {
        lastViewportRef.current = signature;
        onViewportChange?.(viewport);
      }
    },
    [onViewportChange]
  );

  const map = useMapEvents({
    moveend: () => emitViewport(map),
    zoomend: () => emitViewport(map),
  });

  useEffect(() => {
    emitViewport(map);
  }, [emitViewport, map]);

  return null;
}

function getSeverityColor(value = 1) {
  if (value >= 160) return '#dc2626';
  if (value >= 110) return '#f59e0b';
  return '#0f766e';
}

export default function MapComponent({ 
  markers = [], 
  heatmapData = [], 
  onLayerChange, 
  onViewportChange,
  onMarkerClick
}) {
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [selectedLayer, setSelectedLayer] = useState('incidents');
  const [tileLayer, setTileLayer] = useState('street');
  const activeTile = tileLayers[tileLayer];

  const markerPoints = useMemo(
    () =>
      markers.map((marker, index) => ({
        id: marker.id || index,
        name: marker.name || 'Incident location',
        lat: marker.position?.lat ?? marker.lat,
        lng: marker.position?.lng ?? marker.lng,
        weight: marker.weight || marker.crime || 5,
        crime: marker.crime,
        category: marker.category,
      })),
    [markers]
  );

  const heatPoints = useMemo(
    () =>
      heatmapData.map((point, index) => ({
        id: `heat-${index}`,
        lat: point.lat,
        lng: point.lng,
        weight: point.weight || 4,
      })),
    [heatmapData]
  );

  const handleLayerChange = (layer) => {
    setSelectedLayer(layer);
    onLayerChange?.(layer);
  };

  return (
    <div className="relative min-h-[560px] overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
      <MapContainer center={defaultCenter} zoom={5} scrollWheelZoom className="h-[560px] w-full">
        <TileLayer attribution={activeTile.attribution} url={activeTile.url} />
        <ViewportReporter onViewportChange={onViewportChange} />

        {!showHeatmap &&
          markerPoints.map((marker) => (
            <CircleMarker
              key={marker.id}
              center={[marker.lat, marker.lng]}
              eventHandlers={{
                click: () => onMarkerClick?.(marker),
              }}
              pathOptions={{
                color: '#ffffff',
                fillColor: getSeverityColor(marker.weight),
                fillOpacity: 0.88,
                weight: 2,
              }}
              radius={10}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">Incident location</div>
                  <div>{marker.name}</div>
                  {marker.crime && <div>Crime count {marker.crime}</div>}
                  <div>Lat {Number(marker.lat).toFixed(3)}, Lng {Number(marker.lng).toFixed(3)}</div>
                </div>
              </Popup>
            </CircleMarker>
          ))}

        {showHeatmap &&
          heatPoints.map((point) => (
            <CircleMarker
              key={point.id}
              center={[point.lat, point.lng]}
              pathOptions={{
                color: getSeverityColor(point.weight),
                fillColor: getSeverityColor(point.weight),
                fillOpacity: 0.22,
                opacity: 0.46,
                weight: 1,
              }}
              radius={Math.min(52, Math.max(18, point.weight / 4))}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">Incident density</div>
                  <div>Weight {point.weight}</div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
      </MapContainer>

      <div className="absolute left-3 top-3 z-[500] rounded-lg border border-slate-200 bg-white/95 p-3 text-sm text-slate-800 shadow-sm backdrop-blur">
        <div className="mb-2 font-semibold text-slate-950">Map legend</div>
        <div className="space-y-1.5">
          <div><span className="mr-2 inline-block h-3 w-3 rounded-full bg-[#0f766e]" /> Low activity</div>
          <div><span className="mr-2 inline-block h-3 w-3 rounded-full bg-[#f59e0b]" /> Medium activity</div>
          <div><span className="mr-2 inline-block h-3 w-3 rounded-full bg-[#dc2626]" /> High activity</div>
        </div>
      </div>

      <div className="absolute right-3 top-3 z-[500] rounded-lg border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">
        <div className="grid gap-2">
          <select
            value={selectedLayer}
            onChange={(event) => handleLayerChange(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900"
          >
            <option value="incidents">Incidents</option>
            <option value="population">Population density</option>
            <option value="development">Development index</option>
          </select>
          <select
            value={tileLayer}
            onChange={(event) => setTileLayer(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900"
          >
            {Object.entries(tileLayers).map(([key, layer]) => (
              <option key={key} value={key}>{layer.label}</option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={() => setShowHeatmap((current) => !current)}
        className="absolute bottom-3 left-3 z-[500] rounded-lg bg-[#123c35] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0d2e28]"
        type="button"
      >
        {showHeatmap ? 'Show markers' : 'Show density'}
      </button>
    </div>
  );
}
