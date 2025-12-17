import { useState, useEffect } from 'react';
import MapComponent from './components/MapComponent';
import { LatLng } from 'leaflet';
import { Pencil, Trash2, Check, Loader2, Download, Bike, Footprints } from 'lucide-react';
import { scaleShape, calculateDistance, resampleShape } from './utils/geometry';
import { getSmartRoute, type RouteProfile } from './utils/api';
import { downloadGPX } from './utils/gpx';

type Mode = 'view' | 'draw' | 'generated';

function App() {
  const [mode, setMode] = useState<Mode>('view');
  const [points, setPoints] = useState<LatLng[]>([]);
  const [routePath, setRoutePath] = useState<LatLng[]>([]);
  const [distance, setDistance] = useState<number>(5); // Target km
  const [currentPerimeter, setCurrentPerimeter] = useState<number>(0);
  const [profile, setProfile] = useState<RouteProfile>('foot');
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
    const route = await getSmartRoute(resampled, profile);
    setRoutePath(route);

    setMode('generated');
    setIsLoading(false);
  };

  const handleDownload = () => {
    if (routePath.length === 0) return;
    downloadGPX(routePath, `drawgpx - ${distance} km.gpx`);
  };

  return (
    <div className="h-screen w-screen flex flex-col font-sans text-gray-900">
      <header className="absolute top-6 left-6 z-[1000] w-full max-w-sm pointer-events-none">
        <div className="bg-white/90 backdrop-blur-xl shadow-2xl rounded-3xl p-6 pointer-events-auto ring-1 ring-black/5">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-br from-gray-900 to-gray-600 bg-clip-text text-transparent">
              DrawGPX
            </h1>
            <div className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase">
              BETA
            </div>
          </div>

          <div className="space-y-5">
            {/* Primary Actions */}
            <div className="flex gap-3">
              {mode === 'view' && (points.length === 0) && (
                <button
                  onClick={handleStartDrawing}
                  disabled={isLoading}
                  className="flex-1 bg-gray-900 hover:bg-black text-white py-3 px-6 rounded-2xl flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-gray-200 active:scale-[0.98] disabled:opacity-50 font-medium"
                >
                  <Pencil size={18} strokeWidth={2.5} />
                  <span>Start Drawing</span>
                </button>
              )}

              {mode === 'draw' && (
                <button
                  onClick={handleFinishDrawing}
                  className="flex-1 bg-black hover:bg-gray-900 text-white py-3 px-6 rounded-2xl flex items-center justify-center gap-2.5 transition-all shadow-lg active:scale-[0.98] font-medium"
                >
                  <Check size={18} strokeWidth={2.5} />
                  <span>Done</span>
                </button>
              )}

              {(points.length > 0 || mode === 'draw') && (
                <button
                  onClick={handleClear}
                  disabled={isLoading}
                  className="group bg-gray-50 hover:bg-red-50 text-gray-600 hover:text-red-600 p-3 rounded-2xl transition-all border border-transparent hover:border-red-100 active:scale-95 disabled:opacity-50"
                  title="Clear"
                >
                  <Trash2 size={20} strokeWidth={2} className="group-hover:scale-110 transition-transform" />
                </button>
              )}
            </div>

            {/* Stats Display */}
            <div className={`transition-all duration-300 overflow-hidden ${points.length > 2 ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500">
                  {mode === 'generated' ? 'Route Length' : 'Shape Perimeter'}
                </span>
                <span className="text-xl font-bold tracking-tight text-gray-900">
                  {(mode === 'generated' && routePath.length > 0 ? calculateDistance(routePath) : currentPerimeter).toFixed(2)}
                  <span className="text-sm font-medium text-gray-400 ml-1">km</span>
                </span>
              </div>
            </div>

            {/* Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider pl-1">Target Distance</label>
                <div className="relative group">
                  <input
                    type="number"
                    value={distance}
                    onChange={(e) => setDistance(Number(e.target.value))}
                    className="w-full bg-gray-50 hover:bg-gray-100 focus:bg-white border-0 rounded-xl px-4 py-3 font-semibold text-gray-900 focus:ring-2 focus:ring-black/5 transition-all outline-none"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400 pointer-events-none group-focus-within:text-gray-600 transition-colors">km</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider pl-1">Activity</label>
                <div className="flex bg-gray-50 p-1 rounded-xl">
                  <button
                    onClick={() => setProfile('foot')}
                    className={`flex-1 flex items-center justify-center py-2 rounded-lg transition-all ${profile === 'foot' ? 'bg-white shadow-sm ring-1 ring-black/5 text-black' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <Footprints size={18} strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={() => setProfile('bike')}
                    className={`flex-1 flex items-center justify-center py-2 rounded-lg transition-all ${profile === 'bike' ? 'bg-white shadow-sm ring-1 ring-black/5 text-black' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <Bike size={18} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </div>

            {/* Action Button */}
            {points.length > 2 && (mode === 'view' || mode === 'generated') && (
              <div className="pt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <button
                  onClick={handleGenerate}
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold shadow-xl shadow-blue-200/50 active:scale-[0.98] transition-all disabled:opacity-80 flex items-center justify-center gap-3 relative overflow-hidden group"
                >
                  {isLoading ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    mode === 'generated' ? 'Regenerate Route' : 'Match to Roads'
                  )}
                </button>

                {mode === 'generated' && routePath.length > 0 && !isLoading && (
                  <button
                    onClick={handleDownload}
                    className="mt-3 w-full bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-700 py-3 rounded-2xl font-semibold transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
                  >
                    <Download size={18} strokeWidth={2.5} />
                    <span>Download GPX</span>
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
