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

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const mapInstance = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-118.439789907, 34.06999972], // UCLA coordinates
      zoom: 12,
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
            ...MapboxDraw.modes.simple_select
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
          mapInstance.flyTo({
            center: [position.coords.longitude, position.coords.latitude],
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
    <div className="relative w-full h-full overflow-hidden rounded-r-3xl">
      <div ref={mapContainer} className="w-full h-full" />
      
      {metrics && (
        <div className="absolute top-4 left-4 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-md min-w-[200px]">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-sm text-gray-500 font-semibold">Route Metrics</h3>
            <button
              onClick={() => {
                draw.current?.deleteAll();
                calculateRouteMetrics();
              }}
              className="text-sm text-gray-400 hover:text-gray-200 transition-colors"
            >
              Clear Route
            </button>
          </div>
          <div className="space-y-2">
            <p className="text-lg text-gray-500">
              {(metrics.distance * 0.621371).toFixed(2)} miles
              <span className="text-sm text-gray-400 ml-2">
                ({metrics.distance.toFixed(2)} km)
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
} 