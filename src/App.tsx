
import { useState, useEffect } from 'react';
import MapComponent from './components/MapComponent';
import { LatLng } from 'leaflet';
import { Pencil, Trash2, Check, Loader2, Download } from 'lucide-react';
import { scaleShape, calculateDistance, resampleShape } from './utils/geometry';
import { getSmartRoute } from './utils/api';
import { downloadGPX } from './utils/gpx';

type Mode = 'view' | 'draw' | 'generated';

function App() {
  const [mode, setMode] = useState<Mode>('view');
  const [points, setPoints] = useState<LatLng[]>([]);
  const [routePath, setRoutePath] = useState<LatLng[]>([]);
  const [distance, setDistance] = useState<number>(5); // Target km
  const [currentPerimeter, setCurrentPerimeter] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (points.length > 2) {
      setCurrentPerimeter(calculateDistance(points));
    } else {
      setCurrentPerimeter(0);
    }
  }, [points]);

  const handleStartDrawing = () => {
    setPoints([]);
    setRoutePath([]);
    setMode('draw');
  };

  const handleFinishDrawing = () => {
    if (points.length < 3) {
      alert("Please draw at least 3 points to make a shape.");
      return;
    }
    setMode('view');
  };

  const handleClear = () => {
    setPoints([]);
    setRoutePath([]);
    setMode('view');
  };

  const handleGenerate = async () => {
    if (points.length < 3) return;
    setIsLoading(true);

    // 1. Scale
    const scaled = scaleShape(points, distance);
    setPoints(scaled); // Update the visual guide

    // 2. Resample for OSRM Match (create dense points to trace the lines)
    // Adaptive Sampling: 
    // Small distances (<10km) need fewer points to avoid zig-zags (min 12 to keep shape).
    // Large distances can support more points (e.g. 1 point every 2km).
    const density = 2; // km per point target
    const targetPoints = Math.round(distance / density);
    const numPoints = Math.max(12, targetPoints); // Ensure at least 12 points for shape fidelity, capped by density for large shapes

    const resampled = resampleShape(scaled, numPoints);

    // 3. Fetch Route (Match)
    const route = await getSmartRoute(resampled);
    setRoutePath(route);

    setMode('generated');
    setIsLoading(false);
  };

  const handleDownload = () => {
    if (routePath.length === 0) return;
    downloadGPX(routePath, `drawgpx - ${distance} km.gpx`);
  };

  return (
    <div className="h-screen w-screen flex flex-col font-sans">
      <header className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] w-full max-w-md px-4 pointer-events-none">
        <div className="bg-white/90 backdrop-blur-md shadow-xl rounded-2xl p-6 pointer-events-auto border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              DrawGPX
            </h1>
            <div className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-semibold">
              Core
            </div>
          </div>

          <div className="space-y-4">
            {/* Controls */}
            <div className="flex gap-2">
              {mode === 'view' && (points.length === 0) && (
                <button
                  onClick={handleStartDrawing}
                  disabled={isLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  <Pencil size={18} /> Draw Shape
                </button>
              )}

              {mode === 'draw' && (
                <button
                  onClick={handleFinishDrawing}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                >
                  <Check size={18} /> Finish Shape
                </button>
              )}

              {(points.length > 0 || mode === 'draw') && (
                <button
                  onClick={handleClear}
                  disabled={isLoading}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-2 rounded-xl transition-all disabled:opacity-50"
                  title="Clear"
                >
                  <Trash2 size={20} />
                </button>
              )}
            </div>

            {/* Stats */}
            {points.length > 2 && (
              <div className="text-center text-sm text-gray-500">
                {mode === 'generated' && routePath.length > 0 ? (
                  <>
                    Target: {distance} km | Route: <span className="font-bold text-emerald-600">{calculateDistance(routePath).toFixed(2)} km</span>
                  </>
                ) : (
                  <>Current Shape: <span className="font-semibold text-gray-800">{currentPerimeter.toFixed(2)} km</span></>
                )}
              </div>
            )}

            {/* Distance Input */}
            <div className="relative">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Target Distance</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={distance}
                  onChange={(e) => setDistance(Number(e.target.value))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium text-gray-800"
                />
                <span className="text-gray-500 font-medium">km</span>
              </div>
            </div>

            {/* Generate Button */}
            {points.length > 2 && (mode === 'view' || mode === 'generated') && (
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleGenerate}
                  disabled={isLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-semibold shadow-lg shadow-indigo-200 active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <> <Loader2 className="animate-spin" size={20} /> Generating Route... </>
                  ) : (
                    mode === 'generated' ? 'Regenerate' : 'Scale & Match Route'
                  )}
                </button>
                {mode === 'generated' && routePath.length > 0 && !isLoading && (
                  <button
                    onClick={handleDownload}
                    className="w-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 py-2 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
                  >
                    <Download size={18} /> Download GPX
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1 relative z-0">
        <MapComponent
          isDrawing={mode === 'draw'}
          points={points}
          routePath={routePath}
          onAddPoint={(p) => setPoints(prev => [...prev, p])}
        />
      </main>
    </div>
  );
}

export default App;
