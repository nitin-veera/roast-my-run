'use client';

import { useState, useEffect, useRef } from 'react';
import Map from '@/components/Map';

interface RouteMetrics {
  distance: number; // in kilometers
}

export default function Home() {
  const [metrics, setMetrics] = useState<RouteMetrics | null>(null);
  const [roast, setRoast] = useState<string | null>(null);
  const [isGeneratingRoast, setIsGeneratingRoast] = useState(false);
  const [duration, setDuration] = useState<string>('');
  const [hours, setHours] = useState<string>('');
  const [minutes, setMinutes] = useState<string>('');
  const [seconds, setSeconds] = useState<string>('');

  const roastRef = useRef<HTMLDivElement>(null);

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
      
      setTimeout(() => {
        roastRef.current?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }, 100);

    } catch (error) {
      console.error('Error generating roast:', error);
    } finally {
      setIsGeneratingRoast(false);
    }
  };

  const handleTimeChange = (value: string, setter: (value: string) => void, max: number) => {
    const numericValue = value.replace(/\D/g, '').slice(0, 2);
    if (numericValue === '' || (parseInt(numericValue) <= max)) {
      setter(numericValue);
    }
  };

  useEffect(() => {
    const formattedDuration = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}`;
    setDuration(formattedDuration);
  }, [hours, minutes, seconds]);

  const handleClearRoute = () => {
    setRoast(null);
  };

  return (
    <div className="relative h-[100dvh] bg-zinc-800">
      <div className="absolute top-0 w-full md:w-2/3 h-[50dvh] md:h-screen z-10">
        <Map 
          onMetricsChange={setMetrics} 
          onClearRoute={handleClearRoute}
        />
      </div>

      <div className="fixed md:absolute w-full md:w-1/3 h-[50dvh] md:h-screen top-[50dvh] md:top-0 md:right-0 
                      overflow-y-auto overscroll-contain z-0 bg-zinc-800">
        <div className="w-full flex flex-col">
          <header className="pt-4 md:pt-8 px-4 md:px-8 relative overflow-hidden">
            <div className="relative">
              <h1 className="text-3xl md:text-4xl font-bold mb-1 text-white tracking-tight">
                Roast My Run
              </h1>
              <p className="text-gray-400 text-sm md:text-base mb-3">
                for runners that need humbling
              </p>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-8 space-y-6">
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
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="HH"
                        value={hours}
                        onChange={(e) => handleTimeChange(e.target.value, setHours, 23)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl
                                 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2
                                 focus:ring-[#FF5733] focus:border-transparent transition-all
                                 duration-200 hover:bg-gray-100 text-center"
                      />
                    </div>
                    <span className="text-white text-2xl self-center">:</span>
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="MM"
                        value={minutes}
                        onChange={(e) => handleTimeChange(e.target.value, setMinutes, 59)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl
                                 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2
                                 focus:ring-[#FF5733] focus:border-transparent transition-all
                                 duration-200 hover:bg-gray-100 text-center"
                      />
                    </div>
                    <span className="text-white text-2xl self-center">:</span>
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="SS"
                        value={seconds}
                        onChange={(e) => handleTimeChange(e.target.value, setSeconds, 59)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl
                                 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2
                                 focus:ring-[#FF5733] focus:border-transparent transition-all
                                 duration-200 hover:bg-gray-100 text-center"
                      />
                    </div>
                  </div>
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
              <div 
                ref={roastRef}
                className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100
                          transform transition-all duration-500 hover:shadow-xl
                          animate-fade-in-up"
              >
                <h2 className="text-2xl font-semibold mb-4 text-gray-800">Your Roast</h2>
                <p className="text-gray-600 italic text-lg leading-relaxed">{roast}</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}