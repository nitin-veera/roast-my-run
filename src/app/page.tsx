'use client';

import { useState } from 'react';
import Map from '@/components/Map';

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

export default function Home() {
  const [metrics, setMetrics] = useState<RouteMetrics | null>(null);
  const [roast, setRoast] = useState<string | null>(null);
  const [isGeneratingRoast, setIsGeneratingRoast] = useState(false);

  const generateRoast = async () => {
    if (!metrics) return;

    setIsGeneratingRoast(true);
    try {
      const response = await fetch('/api/generate-roast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          distance: metrics.distance,
          elevation: metrics.elevation,
          duration: metrics.duration,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate roast');

      const data = await response.json();
      setRoast(data.roast);
    } catch (error) {
      console.error('Error generating roast:', error);
    } finally {
      setIsGeneratingRoast(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Map Container - Left 2/3 */}
      <div className="w-2/3 h-screen">
        <Map onMetricsChange={setMetrics} />
      </div>

      {/* Content Container - Right 1/3 */}
      <div className="w-1/3 h-screen overflow-y-auto flex flex-col">
        <header className="bg-gradient-to-r from-orange-500 to-pink-500 text-white py-6 px-6">
          <h1 className="text-3xl font-bold mb-2">Roast My Run</h1>
        </header>

        <main className="flex-1 p-6 space-y-6">
          {/* Run Details */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Run Details</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="runDuration" className="block text-sm font-medium mb-1">
                  Run Duration (optional)
                </label>
                <input
                  type="text"
                  id="runDuration"
                  pattern="[0-9]{2}:[0-9]{2}:[0-9]{2}"
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-800"
                  placeholder="00:00:00"
                />
              </div>
              <button
                onClick={generateRoast}
                disabled={!metrics || isGeneratingRoast}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-4 rounded-md transition-colors disabled:bg-orange-300"
              >
                {isGeneratingRoast ? 'Generating Roast...' : 'Roast My Run'}
              </button>
            </div>
          </div>

          {/* Roast Display */}
          {roast && (
            <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Your Roast</h2>
              <p className="text-gray-700 dark:text-gray-300 italic">{roast}</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}