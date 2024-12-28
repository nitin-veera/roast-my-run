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

interface RouteMetrics {
  distance: number;
  elevation: {
    gain: number;
    loss: number;
    max: number;
    min: number;
  };
  duration?: number;
}

interface MapProps {
  onMetricsChange: (metrics: RouteMetrics | null) => void;
}

export default function Map({ onMetricsChange }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const draw = useRef<MapboxDraw | null>(null);
  const [lng] = useState(-74.006);
  const [lat] = useState(40.7128);
  const [zoom] = useState(12);
  const [metrics, setMetrics] = useState<RouteMetrics | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const getElevation = async (point: [number, number]): Promise<number> => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/v4/mapbox.terrain-rgb/${zoom}/${Math.floor((point[0] + 180) / 360 * Math.pow(2, zoom))}/${Math.floor((1 - Math.log(Math.tan(point[1] * Math.PI / 180) + 1 / Math.cos(point[1] * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom))}.pngraw?access_token=${mapboxgl.accessToken}`
      );
      const data = await response.arrayBuffer();
      const pixels = new Uint8Array(data);
      
      // Convert Mapbox's terrain-rgb to elevation in meters
      return -10000 + ((pixels[0] * 256 * 256 + pixels[1] * 256 + pixels[2]) * 0.1);
    } catch (error) {
      console.error('Error fetching elevation:', error);
      return 0;
    }
  };

  const calculateRouteMetrics = useCallback(async () => {
    console.log('Calculating metrics...');
    const data = draw.current?.getAll();
    console.log('Draw data:', data);
    
    if (data?.features.length && data.features[0].geometry.type === 'LineString') {
      setIsCalculating(true);
      
      try {
        const line = turf.lineString(data.features[0].geometry.coordinates);
        const length = turf.length(line, { units: 'kilometers' });
        console.log('Length calculated:', length);
        
        const points = turf.along(line, length, { units: 'kilometers' });
        const elevations = await Promise.all(
          points.geometry.coordinates.map(coord => getElevation([coord[0], coord[1]]))
        );

        let gain = 0;
        let loss = 0;
        const max = Math.max(...elevations);
        const min = Math.min(...elevations);

        for (let i = 1; i < elevations.length; i++) {
          const diff = elevations[i] - elevations[i - 1];
          if (diff > 0) gain += diff;
          if (diff < 0) loss += Math.abs(diff);
        }

        const newMetrics = {
          distance: Math.round(length * 100) / 100,
          elevation: {
            gain: Math.round(gain),
            loss: Math.round(Math.abs(loss)),
            max: Math.round(max),
            min: Math.round(min)
          }
        };

        console.log('Setting new metrics:', newMetrics);
        setMetrics(newMetrics);
        onMetricsChange(newMetrics);
      } catch (error) {
        console.error('Error calculating metrics:', error);
        setMetrics(null);
        onMetricsChange(null);
      } finally {
        setIsCalculating(false);
      }
    } else {
      console.log('No valid line string found');
      setMetrics(null);
      onMetricsChange(null);
    }
  }, [onMetricsChange, zoom]);

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

    // Initialize map
    const mapInstance = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [lng, lat],
      zoom: zoom
    });

    map.current = mapInstance;

    // Initialize draw control with disabled vertex and line dragging
    const drawInstance = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        line_string: true,
        trash: true
      },
      defaultMode: 'draw_line_string',
      styles: drawStyles,
      userProperties: true,
      // Add these options to disable editing
      clickBuffer: 0,
      touchBuffer: 0,
      boxSelect: false,
      displayControlsDefault: false,
      modes: {
        ...MapboxDraw.modes,
        simple_select: {
          ...MapboxDraw.modes.simple_select,
          onDrag: () => {}, // Disable dragging
          onMidpoint: () => {}, // Disable midpoint creation
          onVertex: () => {} // Disable vertex movement
        }
      }
    });

    draw.current = drawInstance;

    // Add draw control to map
    mapInstance.addControl(drawInstance);

    // Add event listeners after map loads
    mapInstance.on('load', () => {
      console.log('Map loaded, adding event listeners');
      
      // Create a single event handler for all draw events
      const handleDrawEvent = (e: { type: string }) => {
        console.log('Draw event:', e.type);
        if (['draw.create', 'draw.update', 'draw.delete'].includes(e.type)) {
          calculateRouteMetrics();
        }
      };

      // Add listeners for all draw events
      mapInstance.on('draw.create', handleDrawEvent);
      mapInstance.on('draw.update', handleDrawEvent);
      mapInstance.on('draw.delete', handleDrawEvent);
    });

    return () => {
      mapInstance.remove();
    };
  }, [lng, lat, zoom, calculateRouteMetrics]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Metrics Display */}
      {(metrics || isCalculating) && (
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
          {isCalculating ? (
            <p className="text-sm text-gray-500">Calculating...</p>
          ) : (
            <div className="space-y-2">
              <p className="text-lg">
                {(metrics?.distance! * 0.621371).toFixed(2)} miles
                <span className="text-sm text-gray-500 ml-2">
                  ({metrics?.distance} km)
                </span>
              </p>
              <div className="text-sm">
                <p>Elevation Gain: {Math.round(metrics?.elevation.gain! * 3.28084)}ft ({metrics?.elevation.gain}m)</p>
                <p>Elevation Loss: {Math.round(metrics?.elevation.loss! * 3.28084)}ft ({metrics?.elevation.loss}m)</p>
                <p>Max Elevation: {Math.round(metrics?.elevation.max! * 3.28084)}ft ({metrics?.elevation.max}m)</p>
                <p>Min Elevation: {Math.round(metrics?.elevation.min! * 3.28084)}ft ({metrics?.elevation.min}m)</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 