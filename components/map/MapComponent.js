'use client';
import { useCallback, useMemo, useRef, useState } from 'react';
import { GoogleMap, Marker, MarkerClusterer, HeatmapLayer, useJsApiLoader } from '@react-google-maps/api';

const mapContainerStyle = {
  width: '100%',
  height: '500px',
};

const defaultCenter = { lat: 20.5937, lng: 78.9629 };
const options = {
  zoomControl: true,
  mapTypeControl: true,
  streetViewControl: false,
  fullscreenControl: true,
};

export default function MapComponent({ markers, heatmapData, onLayerChange, onViewportChange }) {
  const [map, setMap] = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [selectedLayer, setSelectedLayer] = useState('incidents');
  const [mapTypeId, setMapTypeId] = useState('roadmap');
  const lastViewportRef = useRef('');
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: ['visualization'],
  });

  const emitViewport = useCallback(
    (instance) => {
      const bounds = instance?.getBounds?.();

      if (!bounds) {
        return;
      }

      const viewport = {
        north: bounds.getNorthEast().lat(),
        east: bounds.getNorthEast().lng(),
        south: bounds.getSouthWest().lat(),
        west: bounds.getSouthWest().lng(),
      };

      const signature = JSON.stringify(viewport);
      if (signature === lastViewportRef.current) {
        return;
      }

      lastViewportRef.current = signature;
      onViewportChange?.(viewport);
    },
    [onViewportChange]
  );

  const onLoad = useCallback(
    (instance) => {
      setMap(instance);
      window.setTimeout(() => emitViewport(instance), 0);
    },
    [emitViewport]
  );

  const toggleHeatmap = () => {
    setShowHeatmap((current) => !current);
  };

  const handleLayerChange = (layer) => {
    setSelectedLayer(layer);
    onLayerChange?.(layer);
  };

  const heatmapLayerData = useMemo(() => {
    if (!isLoaded || typeof window === 'undefined' || !window.google || !heatmapData) {
      return [];
    }

    return heatmapData.map((point) => ({
      location: new window.google.maps.LatLng(point.lat, point.lng),
      weight: point.weight,
    }));
  }, [heatmapData, isLoaded]);

  if (!isLoaded) {
    return (
      <div className="flex h-[500px] items-center justify-center bg-slate-100 text-sm text-slate-500">
        Loading map...
      </div>
    );
  }

  return (
    <div className="relative">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={defaultCenter}
        zoom={5}
        onLoad={onLoad}
        onDragEnd={() => map && emitViewport(map)}
        onZoomChanged={() => map && emitViewport(map)}
        options={options}
        mapTypeId={mapTypeId}
      >
        {!showHeatmap && markers && (
          <MarkerClusterer>
            {(clusterer) =>
              markers.map((marker) => (
                <Marker
                  key={marker.id}
                  position={marker.position}
                  clusterer={clusterer}
                />
              ))
            }
          </MarkerClusterer>
        )}

        {showHeatmap && heatmapLayerData.length > 0 && <HeatmapLayer data={heatmapLayerData} />}
      </GoogleMap>

      <div className="absolute top-2 left-2 rounded bg-white p-2 text-sm shadow">
        <div className="mb-1 font-semibold">Legend</div>
        <div><span className="mr-1 inline-block h-3 w-3 rounded-full bg-blue-500"></span> Incidents</div>
        <div><span className="mr-1 inline-block h-3 w-3 rounded-full bg-red-500"></span> High Severity</div>
      </div>

      <div className="absolute top-2 right-2 rounded bg-white p-2 shadow">
        <div className="flex flex-col gap-2">
          <select
            value={selectedLayer}
            onChange={(event) => handleLayerChange(event.target.value)}
            className="border-none text-sm"
          >
            <option value="incidents">Incidents</option>
            <option value="population">Population Density</option>
            <option value="development">Development Index</option>
          </select>
          <select
            value={mapTypeId}
            onChange={(event) => setMapTypeId(event.target.value)}
            className="border-none text-sm"
          >
            <option value="roadmap">Roadmap</option>
            <option value="satellite">Satellite</option>
            <option value="terrain">Terrain</option>
          </select>
        </div>
      </div>

      <button
        onClick={toggleHeatmap}
        className="absolute bottom-2 left-2 rounded bg-white px-3 py-1 text-sm shadow"
      >
        {showHeatmap ? 'Hide Heatmap' : 'Show Heatmap'}
      </button>
    </div>
  );
}
