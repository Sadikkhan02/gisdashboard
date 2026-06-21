'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer, useMapEvents, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const defaultCenter = [28.4089, 77.3178]; // Faridabad Center

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

function ViewportReporter({ onViewportChange, onZoomChange }) {
  const lastViewportRef = useRef('');

  const emitViewport = useCallback(
    (map) => {
      const bounds = map.getBounds();
      const zoom = map.getZoom();
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
        onZoomChange?.(zoom);
      }
    },
    [onViewportChange, onZoomChange]
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
  if (value >= 5) return '#dc2626'; // High
  if (value >= 3) return '#f59e0b'; // Medium
  return '#0f766e'; // Low
}

// Leaflet DivIcon factory for clusters
const createClusterIcon = (count) => {
  if (typeof window === 'undefined') return null;
  return L.divIcon({
    html: `<div style="background-color: #0f766e; color: white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); font-size: 11px;">${count}</div>`,
    className: 'custom-cluster-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

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
  const [zoom, setZoom] = useState(12);
  const activeTile = tileLayers[tileLayer] || tileLayers.street;

  const markerPoints = useMemo(
    () =>
      markers.map((marker, index) => {
        let weight = 1;
        if (selectedLayer === 'incidents') {
          weight = marker.crime || 1;
        } else if (selectedLayer === 'population') {
          const pop = marker.population || 0;
          weight = pop >= 400 ? 5 : pop >= 200 ? 3 : 1;
        } else if (selectedLayer === 'development') {
          if (marker.category === 'infrastructure') weight = 5;
          else if (marker.category === 'transit') weight = 3;
          else weight = 1;
        }

        return {
          id: marker.id || index,
          name: marker.name || 'POI location',
          lat: marker.position?.lat ?? marker.lat,
          lng: marker.position?.lng ?? marker.lng,
          weight: weight,
          crime: marker.crime,
          population: marker.population,
          developmentIndex: marker.developmentIndex,
          category: marker.category,
          amenity: marker.amenity,
        };
      }),
    [markers, selectedLayer]
  );

  // Client-side lightweight grid clustering for POI nodes
  const clusteredMarkers = useMemo(() => {
    if (zoom >= 14 || markerPoints.length === 0) {
      return markerPoints.map(m => ({ ...m, isCluster: false }));
    }

    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    markerPoints.forEach(m => {
      if (m.lat < minLat) minLat = m.lat;
      if (m.lat > maxLat) maxLat = m.lat;
      if (m.lng < minLng) minLng = m.lng;
      if (m.lng > maxLng) maxLng = m.lng;
    });

    const gridSize = 8; // 8x8 grid cells across viewport
    const latStep = (maxLat - minLat) / gridSize || 0.005;
    const lngStep = (maxLng - minLng) / gridSize || 0.005;

    const grid = {};

    markerPoints.forEach(m => {
      const row = Math.floor((m.lat - minLat) / latStep);
      const col = Math.floor((m.lng - minLng) / lngStep);
      const key = `${row}-${col}`;
      if (!grid[key]) {
        grid[key] = [];
      }
      grid[key].push(m);
    });

    const result = [];
    Object.entries(grid).forEach(([key, items]) => {
      if (items.length === 1) {
        result.push({ ...items[0], isCluster: false });
      } else {
        let sumLat = 0, sumLng = 0, sumWeight = 0, sumCrime = 0;
        items.forEach(item => {
          sumLat += item.lat;
          sumLng += item.lng;
          sumWeight += item.weight;
          sumCrime += (item.crime || 0);
        });
        result.push({
          id: `cluster-${key}`,
          lat: sumLat / items.length,
          lng: sumLng / items.length,
          count: items.length,
          weight: Math.round(sumWeight / items.length),
          crime: sumCrime,
          isCluster: true,
          name: `${items.length} POI Nodes Cluster`,
        });
      }
    });

    return result;
  }, [markerPoints, zoom]);

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
      <MapContainer 
        key={`${tileLayer}-${defaultCenter.join(',')}`}
        center={defaultCenter} 
        zoom={12} 
        scrollWheelZoom 
        className="h-[560px] w-full"
      >
        {activeTile && <TileLayer attribution={activeTile.attribution} url={activeTile.url} />}
        <ViewportReporter onViewportChange={onViewportChange} onZoomChange={setZoom} />

        {!showHeatmap &&
          clusteredMarkers.map((marker) => {
            if (marker.isCluster) {
              const icon = createClusterIcon(marker.count);
              if (!icon) return null;
              return (
                <Marker
                  key={marker.id}
                  position={[marker.lat, marker.lng]}
                  icon={icon}
                >
                  <Popup>
                    <div className="text-sm">
                      <div className="font-semibold text-[#0f766e]">
                        {selectedLayer === 'incidents' ? 'Incident Cluster' : selectedLayer === 'population' ? 'Population Cluster' : 'Development Cluster'}
                      </div>
                      <div className="mt-1 font-medium">{marker.count} nodes grouped here</div>
                      <div className="text-slate-500">
                        {selectedLayer === 'incidents' ? `Avg Crime Index: ${marker.weight}/5` : selectedLayer === 'population' ? 'High Density Zone' : `Avg Development Weight: ${marker.weight}/5`}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            }

            return (
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
                    <div className="font-semibold">{(marker.category || 'POI').toUpperCase()} ({marker.amenity || 'other'})</div>
                    <div className="font-medium mt-1">{marker.name}</div>
                    <div className="mt-2 space-y-1 text-xs border-t border-slate-100 pt-1">
                      <div>Activity Index: <span className="font-semibold">{marker.crime || 0}/5</span></div>
                      <div>Population Anchor: <span className="font-semibold">{marker.population || 0}</span></div>
                      <div>Development Index: <span className="font-semibold">{Math.round((marker.developmentIndex || 0) * 100)}%</span></div>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-2">Lat {Number(marker.lat).toFixed(4)}, Lng {Number(marker.lng).toFixed(4)}</div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

        {showHeatmap &&
          heatPoints.map((point) => (
            <CircleMarker
              key={point.id}
              center={[point.lat, point.lng]}
              pathOptions={{
                color: '#dc2626',
                fillColor: '#dc2626',
                fillOpacity: 0.22,
                opacity: 0.46,
                weight: 1,
              }}
              radius={Math.min(52, Math.max(18, point.weight * 30))}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">Crime Volatility Point</div>
                  <div>Intensity: {Number(point.weight).toFixed(2)}</div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
      </MapContainer>

      <div className="absolute left-3 top-3 z-[500] rounded-lg border border-slate-200 bg-white/95 p-3 text-sm text-slate-800 shadow-sm backdrop-blur">
        <div className="mb-2 font-semibold text-slate-950">
          {selectedLayer === 'incidents' ? 'Incident Activity' : selectedLayer === 'population' ? 'Population Density' : 'Development Index'}
        </div>
        <div className="space-y-1.5">
          {selectedLayer === 'incidents' && (
            <>
              <div><span className="mr-2 inline-block h-3 w-3 rounded-full bg-[#0f766e]" /> Low Activity (Infrastructure)</div>
              <div><span className="mr-2 inline-block h-3 w-3 rounded-full bg-[#f59e0b]" /> Medium Activity (Transit)</div>
              <div><span className="mr-2 inline-block h-3 w-3 rounded-full bg-[#dc2626]" /> High Activity (Competition)</div>
            </>
          )}
          {selectedLayer === 'population' && (
            <>
              <div><span className="mr-2 inline-block h-3 w-3 rounded-full bg-[#0f766e]" /> Low Density (Standard POI)</div>
              <div><span className="mr-2 inline-block h-3 w-3 rounded-full bg-[#f59e0b]" /> Medium Density (Transit Hubs)</div>
              <div><span className="mr-2 inline-block h-3 w-3 rounded-full bg-[#dc2626]" /> High Density (Schools/Anchors)</div>
            </>
          )}
          {selectedLayer === 'development' && (
            <>
              <div><span className="mr-2 inline-block h-3 w-3 rounded-full bg-[#0f766e]" /> Low Development (Commercial)</div>
              <div><span className="mr-2 inline-block h-3 w-3 rounded-full bg-[#f59e0b]" /> Medium Development (Transit)</div>
              <div><span className="mr-2 inline-block h-3 w-3 rounded-full bg-[#dc2626]" /> High Development (Infrastructure)</div>
            </>
          )}
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
        {showHeatmap ? 'Show markers' : 'Show heat density'}
      </button>
    </div>
  );
}
