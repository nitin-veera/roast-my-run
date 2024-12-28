'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import * as turf from '@turf/turf';

// Set your Mapbox token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!;

// Custom drawing styles to fix the line-dasharray error
const drawStyles = [
  // Default styles
  {
    'id': 'gl-draw-line',
    'type': 'line',
    'filter': ['all', ['==', '$type', 'LineString'], ['!=', 'mode', 'static']],
    'layout': {
      'line-cap': 'round',
      'line-join': 'round'
    },
    'paint': {
      'line-color': '#438EE4',
      'line-dasharray': [0.2, 2],
      'line-width': 4,
      'line-opacity': 0.7
    }
  },
  {
    'id': 'gl-draw-line-static',
    'type': 'line',
    'filter': ['all', ['==', '$type', 'LineString'], ['==', 'mode', 'static']],
    'layout': {
      'line-cap': 'round',
      'line-join': 'round'
    },
    'paint': {
      'line-color': '#438EE4',
      'line-width': 4
    }
  }
];

interface MapProps {
  onMetricsChange: (metrics: RouteMetrics | null) => void;
}

interface RouteMetrics {
  distance: number;
}

export default function Map({ onMetricsChange }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const draw = useRef<MapboxDraw | null>(null);
  const [lng] = useState(-74.006);
  const [lat] = useState(40.7128);
  const [zoom] = useState(12);
  const [metrics, setMetrics] = useState<RouteMetrics | null>(null);

  const calculateRouteMetrics = useCallback(() => {
    console.log('Calculating metrics...');
    const data = draw.current?.getAll();
    console.log('Draw data:', data);
    
    if (data?.features.length && data.features[0].geometry.coordinates.length > 0) {
      try {
        // For single points or incomplete lines, handle specially
        if (data.features[0].geometry.coordinates.length === 1) {
          const newMetrics = {
            distance: 0
          };
          setMetrics(newMetrics);
          onMetricsChange(newMetrics);
          return;
        }

        // Calculate metrics for lines with 2 or more points
        const line = turf.lineString(data.features[0].geometry.coordinates);
        const length = turf.length(line, { units: 'kilometers' });
        
        const newMetrics = {
          distance: Math.round(length * 100) / 100
        };

        console.log('Setting new metrics:', newMetrics);
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

  const clearRoute = useCallback(() => {
    if (draw.current) {
      draw.current.deleteAll();
      draw.current.changeMode('draw_line_string');
      setMetrics(null);
      onMetricsChange(null);
    }
  }, [onMetricsChange]);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const mapInstance = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [lng, lat],
      zoom: zoom
    });

    map.current = mapInstance;

    const drawInstance = new MapboxDraw({
      displayControlsDefault: false,
      controls: {},
      defaultMode: 'draw_line_string',
      styles: drawStyles,
      userProperties: true,
      clickBuffer: 0,
      touchBuffer: 0,
      boxSelect: false,
      modes: {
        ...MapboxDraw.modes,
        simple_select: {
          ...MapboxDraw.modes.simple_select,
          onDrag: () => {},
          onMidpoint: () => {},
          onVertex: () => {}
        }
      }
    });

    draw.current = drawInstance;
    mapInstance.addControl(drawInstance);

    mapInstance.on('load', () => {
      console.log('Map loaded, adding event listeners');
      mapInstance.on('draw.create', calculateRouteMetrics);
      mapInstance.on('draw.delete', calculateRouteMetrics);
      mapInstance.on('draw.update', calculateRouteMetrics);
      mapInstance.on('draw.render', calculateRouteMetrics);
      mapInstance.on('draw.convert', calculateRouteMetrics);
      mapInstance.on('draw.actionable', calculateRouteMetrics);
    });

    return () => {
      mapInstance.remove();
    };
  }, [lng, lat, zoom, calculateRouteMetrics]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Metrics Display */}
      {metrics && (
        <div className="absolute top-4 left-4 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-md min-w-[200px]">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-sm font-semibold">Route Metrics</h3>
            <button
              onClick={clearRoute}
              className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Clear Route
            </button>
          </div>
          <div className="space-y-2">
            <p className="text-lg">
              {(metrics.distance * 0.621371).toFixed(2)} miles
              <span className="text-sm text-gray-500 ml-2">
                ({metrics.distance} km)
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
} 