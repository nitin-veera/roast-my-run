'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import * as turf from '@turf/turf';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!;

interface MapProps {
  onMetricsChange: (metrics: RouteMetrics | null) => void;
}

interface RouteMetrics {
  distance: number;
}

interface DrawFeature {
  type: 'Feature';
  geometry: {
    type: 'LineString';
    coordinates: number[][];
  };
  properties: Record<string, unknown>;
}

interface DrawFeatureCollection {
  type: 'FeatureCollection';
  features: DrawFeature[];
}

export default function Map({ onMetricsChange }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const draw = useRef<MapboxDraw | null>(null);
  const [metrics, setMetrics] = useState<RouteMetrics | null>(null);
  const isChangingMode = useRef(false);

  const calculateRouteMetrics = useCallback(() => {
    const data = draw.current?.getAll() as DrawFeatureCollection | undefined;
    
    if (data?.features.length && data.features[0].geometry.coordinates.length > 0) {
      try {
        if (data.features[0].geometry.coordinates.length === 1) {
          const newMetrics = { distance: 0 };
          setMetrics(newMetrics);
          onMetricsChange(newMetrics);
          return;
        }

        const line = turf.lineString(data.features[0].geometry.coordinates);
        const distance = turf.length(line, { units: 'kilometers' });
        const newMetrics = { distance };
        setMetrics(newMetrics);
        onMetricsChange(newMetrics);
      } catch (error) {
        console.error('Error calculating metrics:', error);
      }
    } else {
      setMetrics(null);
      onMetricsChange(null);
    }
  }, [onMetricsChange]);

  const createHouseElement = () => {
    const el = document.createElement('div');
    el.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="#FF5733">
      <path d="M12 3L4 9v12h16V9l-8-6zm6 16h-3v-6H9v6H6v-9l6-4.5 6 4.5v9z"/>
    </svg>`;
    return el;
  };

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const mapInstance = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-118.439789907, 34.06999972], // UCLA coordinates
      zoom: window.innerWidth < 768 ? 10 : 12,
      antialias: true,
      attributionControl: false
    });

    map.current = mapInstance;

    mapInstance.on('load', () => {
      const drawInstance = new MapboxDraw({
        displayControlsDefault: false,
        controls: {},
        defaultMode: 'draw_line_string',
        styles: [
          {
            id: 'gl-draw-line',
            type: 'line',
            filter: ['all', ['==', '$type', 'LineString'], ['!=', 'mode', 'static']],
            layout: {
              'line-cap': 'round',
              'line-join': 'round'
            },
            paint: {
              'line-color': '#FF5733',
              'line-width': 4,
              'line-opacity': 0.8
            }
          },
          {
            id: 'gl-draw-point',
            type: 'circle',
            filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'vertex']],
            paint: {
              'circle-color': '#FF5733',
              'circle-radius': 6,
              'circle-opacity': 0.8
            }
          }
        ],
        userProperties: true,
        modes: {
          ...MapboxDraw.modes,
          simple_select: {
            ...MapboxDraw.modes.simple_select,
            onStop: function() {
              if (!isChangingMode.current) {
                isChangingMode.current = true;
                drawInstance.changeMode('draw_line_string');
                setTimeout(() => {
                  isChangingMode.current = false;
                }, 100);
              }
            }
          }
        }
      });

      draw.current = drawInstance;
      mapInstance.addControl(drawInstance);

      mapInstance.on('draw.create', calculateRouteMetrics);
      mapInstance.on('draw.delete', calculateRouteMetrics);
      mapInstance.on('draw.update', calculateRouteMetrics);
      mapInstance.on('draw.render', calculateRouteMetrics);
    });

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { longitude, latitude } = position.coords;
          
          // Add house marker
          new mapboxgl.Marker({
            element: createHouseElement(),
            anchor: 'bottom'
          })
          .setLngLat([longitude, latitude])
          .addTo(mapInstance);

          mapInstance.flyTo({
            center: [longitude, latitude],
            zoom: 14
          });
        },
        (error) => {
          console.error("Error getting user location:", error);
        }
      );
    }

    return () => {
      mapInstance.remove();
    };
  }, [calculateRouteMetrics]);

  return (
    <div className="relative w-full h-full overflow-hidden md:rounded-r-3xl rounded-b-3xl">
      <div ref={mapContainer} className="w-full h-full" />
      
      {metrics && (
        <div className="absolute top-4 left-4 bg-white p-3 rounded-lg shadow-md min-w-[200px] max-w-[90vw] md:max-w-none">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-sm text-gray-500 font-semibold">Route Metrics</h3>
            <button
              onClick={() => {
                if (!isChangingMode.current) {
                  isChangingMode.current = true;
                  draw.current?.deleteAll();
                  draw.current?.changeMode('draw_line_string');
                  calculateRouteMetrics();
                  setTimeout(() => {
                    isChangingMode.current = false;
                  }, 100);
                }
              }}
              className="text-sm text-gray-400 hover:text-gray-200 transition-colors"
            >
              Clear Route
            </button>
          </div>
          <div className="space-y-2">
            <p className="text-lg text-gray-500">
              <span className="md:inline block">{(metrics.distance * 0.621371).toFixed(2)} miles</span>
              <span className="text-sm text-gray-400 md:ml-2 block md:inline">
                ({metrics.distance.toFixed(2)} km)
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
} 