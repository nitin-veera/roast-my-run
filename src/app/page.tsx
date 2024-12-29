'use client';

import { useState } from 'react';
import Map from '@/components/Map';

interface RouteMetrics {
  distance: number; // in kilometers
}

export default function Home() {
  const [metrics, setMetrics] = useState<RouteMetrics | null>(null);
  const [roast, setRoast] = useState<string | null>(null);
  const [isGeneratingRoast, setIsGeneratingRoast] = useState(false);
  const [duration, setDuration] = useState<string>('');

  const generateRoast = async () => {
    if (!metrics) return;

    setIsGeneratingRoast(true);
    const distanceInMiles = (metrics.distance * 0.621371).toFixed(2);
    
    console.log('Sending request with:', {
      distance: parseFloat(distanceInMiles),
      unit: 'miles',
      duration: duration || undefined
    });

    try {
      const response = await fetch('/api/generate-roast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          distance: parseFloat(distanceInMiles),
          unit: 'miles',
          ...(duration && { duration }) // Only include duration if it exists
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate roast: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setRoast(data.roast);
    } catch (error) {
      console.error('Error generating roast:', error);
    } finally {
      setIsGeneratingRoast(false);
    }
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDuration(e.target.value);
  };

  return (
    <div className="bg-zinc-800 dark:bg-zinc-800 min-h-screen flex bg-gray-50">
      {/* Map Container - Left 2/3 */}
      <div className="w-2/3 h-screen">
        <Map onMetricsChange={setMetrics} />
      </div>

      {/* Content Container - Right 1/3 */}
      <div className="w-1/3 h-screen overflow-y-auto flex flex-col">
        <header className="py-8 px-8 relative overflow-hidden">
          <div className="relative">
            <h1 className="text-4xl font-bold mb-3 text-white tracking-tight">
              Roast My Run
            </h1>
          </div>
        </header>

        <main className="flex-1 p-8 space-y-6">
          {/* Run Details */}
          <div className="p-8 rounded-2xl shadow-lg border border-gray-100 
                        transition-all duration-300 hover:shadow-xl">
            <h2 className="text-2xl font-semibold mb-6 text-white-800 flex items-center gap-2">
              <span>Run Details</span>
              {metrics && (
                <span className="text-sm font-normal text-white bg-[#FF5733] px-3 py-1 rounded-full">
                  {(metrics.distance * 0.621371).toFixed(2)} miles
                </span>
              )}
            </h2>
            <div className="space-y-6">
              <div className="relative">
                <label htmlFor="runDuration" 
                       className="block text-sm font-medium mb-2 text-white">
                  Run Duration (optional)
                </label>
                <input
                  type="text"
                  id="runDuration"
                  value={duration}
                  onChange={handleDurationChange}
                  pattern="[0-9]{2}:[0-9]{2}:[0-9]{2}"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl
                           text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2
                           focus:ring-[#FF5733] focus:border-transparent transition-all
                           duration-200 hover:bg-gray-100"
                  placeholder="HH:MM:SS"
                />
              </div>
              <button
                onClick={generateRoast}
                disabled={!metrics || isGeneratingRoast}
                className="w-full bg-[#FF5733] hover:bg-[#CC4629] text-white font-semibold
                         py-4 px-6 rounded-xl transition-all duration-200 
                         disabled:bg-gray-200 disabled:cursor-not-allowed
                         transform hover:scale-[1.02] active:scale-[0.98]
                         disabled:hover:scale-100 shadow-sm hover:shadow-md
                         flex items-center justify-center gap-2"
              >
                {isGeneratingRoast ? (
                  <>
                    <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                    <span>Generating...</span>
                  </>
                ) : (
                  'Roast My Run'
                )}
              </button>
            </div>
          </div>

          {/* Roast Display */}
          {roast && (
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100
                          transform transition-all duration-500 hover:shadow-xl
                          animate-fade-in-up">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">Your Roast</h2>
              <p className="text-gray-600 italic text-lg leading-relaxed">{roast}</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}