import React, { useState, useEffect } from 'react';
import { Camera, Eye, X, ExternalLink, RefreshCw, LayoutGrid, Maximize2, Radio, Activity, Sun, Compass } from 'lucide-react';
import { WORLD_CAMERAS, type WorldCamera, type CameraCategory } from '../services/cctvCatalog';
import { soundEffects } from '../services/audioEffects';
import { travelerState } from '../services/travelerState';
import type { BackpackItem } from '../types';

interface WorldMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCity: string;
  activeCountry: string;
  activeStationName: string;
}

export const WorldMonitorModal: React.FC<WorldMonitorModalProps> = ({
  isOpen,
  onClose,
  activeCity,
  activeStationName
}) => {
  const [selectedCategory, setSelectedCategory] = useState<CameraCategory | 'all'>('all');
  const [activeCam, setActiveCam] = useState<WorldCamera>(WORLD_CAMERAS[0]);
  const [pinnedCamIds] = useState<string[]>(['cam-tokyo-shibuya', 'cam-paris-eiffel', 'cam-nyc-times-square', 'cam-venice-grand-canal']);
  const [viewMode, setViewMode] = useState<'single' | 'wall'>('single');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [postcardSavedMsg, setPostcardSavedMsg] = useState<string>('');

  // Auto-select nearby camera if available
  useEffect(() => {
    if (activeCity) {
      const match = WORLD_CAMERAS.find(c =>
        c.city.toLowerCase().includes(activeCity.toLowerCase()) ||
        activeCity.toLowerCase().includes(c.city.toLowerCase())
      );
      if (match) {
        setActiveCam(match);
      }
    }
  }, [activeCity]);

  if (!isOpen) return null;

  const filteredCams = selectedCategory === 'all'
    ? WORLD_CAMERAS
    : WORLD_CAMERAS.filter(c => c.category === selectedCategory);

  const handleRefresh = () => {
    setIsRefreshing(true);
    soundEffects.playUiClick(0.15);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleTakePostcard = (cam: WorldCamera) => {
    soundEffects.playCameraShutter();
    const item: BackpackItem = {
      id: `postcard-${cam.id}-${Date.now()}`,
      name: `${cam.city} World Monitor Postcard`,
      category: 'photo',
      icon: '📸',
      city: cam.city,
      country: cam.country,
      description: `Public camera observation from ${cam.name} (${cam.provider}). Timestamp: ${new Date().toLocaleTimeString()} UTC.`,
      acquiredAt: new Date().toISOString(),
      photoUrl: cam.streamUrl,
      priceCoins: 35
    };

    travelerState.settleReward(`tx_pc_${Date.now()}`, {
      backpackItem: item,
      coins: 15,
      xp: 25
    });

    setPostcardSavedMsg(`Saved postcard from ${cam.city} to Backpack (+15¢)!`);
    setTimeout(() => setPostcardSavedMsg(''), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none">
      <div className="relative w-full max-w-6xl bg-slate-950 border border-emerald-400/40 rounded-3xl overflow-hidden shadow-2xl flex flex-col text-slate-100 max-h-[92vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900/90 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-400/20 text-emerald-400 border border-emerald-400/30 rounded-2xl shadow-lg shadow-emerald-500/10">
              <Eye className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-wide text-slate-100 uppercase font-sans">
                  World Monitor & Camera Wall
                </h2>
                <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                  LIVE SENSORS & OBSERVATORIES
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Public live camera streams • Synchronized with worldwide radio broadcast soundtrack
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800">
              <button
                onClick={() => setViewMode('single')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  viewMode === 'single'
                    ? 'bg-emerald-400 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Maximize2 className="w-3.5 h-3.5" /> Single Focus
              </button>
              <button
                onClick={() => setViewMode('wall')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  viewMode === 'wall'
                    ? 'bg-emerald-400 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" /> 4-Feed Wall
              </button>
            </div>

            <button
              onClick={handleRefresh}
              className={`p-2 text-slate-400 hover:text-emerald-400 rounded-xl hover:bg-slate-800 transition ${
                isRefreshing ? 'animate-spin text-emerald-400' : ''
              }`}
              title="Refresh Feeds"
            >
              <RefreshCw className="w-5 h-5" />
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {postcardSavedMsg && (
          <div className="bg-emerald-500 text-slate-950 text-xs font-bold px-6 py-2 text-center animate-fade-in">
            {postcardSavedMsg}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Camera Directory Sidebar */}
          <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-800 overflow-y-auto p-4 space-y-3 bg-slate-950/60">
            {/* Category Filters */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
              {(['all', 'street', 'harbor', 'beach', 'skyline'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-xl capitalize font-bold transition whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-emerald-400 text-slate-950'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="space-y-2">
              {filteredCams.map(cam => {
                const isSelected = activeCam.id === cam.id;
                return (
                  <button
                    key={cam.id}
                    onClick={() => {
                      setActiveCam(cam);
                      soundEffects.playUiClick(0.1);
                    }}
                    className={`w-full text-left p-3 rounded-2xl transition border flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-emerald-400/15 border-emerald-400/60 shadow-md'
                        : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800/80 text-slate-300'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                          {cam.category}
                        </span>
                        <h4 className="text-xs font-bold text-slate-100 truncate">
                          {cam.city}
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-1">
                        {cam.name}
                      </p>
                    </div>

                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Video / Wall View Pane */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-gradient-to-b from-slate-900/30 to-slate-950">
            {viewMode === 'single' ? (
              <div className="space-y-4">
                {/* Main Large Feed View */}
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-black">
                  <img
                    src={activeCam.streamUrl}
                    alt={activeCam.name}
                    className="w-full h-full object-cover"
                  />

                  {/* Top Feed Overlay */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                    <div className="flex items-center gap-2 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 pointer-events-auto">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span className="text-xs font-bold text-slate-100">{activeCam.city}</span>
                      <span className="text-[10px] font-mono text-emerald-400">• {activeCam.status.toUpperCase()}</span>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 pointer-events-auto text-[11px] font-mono text-slate-300">
                      <Radio className="w-3.5 h-3.5 text-lime-400" />
                      <span>{activeStationName || 'World Radio Soundtrack'}</span>
                    </div>
                  </div>

                  {/* Bottom Controls Overlay */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between bg-slate-950/85 backdrop-blur-md p-3 rounded-2xl border border-slate-800 text-xs">
                    <div>
                      <h4 className="font-bold text-slate-100">{activeCam.name}</h4>
                      <p className="text-[11px] text-slate-400">{activeCam.provider} • {activeCam.lastUpdated}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTakePostcard(activeCam)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition flex items-center gap-1.5"
                      >
                        <Camera className="w-3.5 h-3.5" /> Save Postcard
                      </button>

                      <a
                        href={activeCam.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 border border-slate-700"
                        title="Official Source Feed"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Environmental Overview Telemetry (USGS / Space / Air) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-2xl flex items-center gap-3">
                    <Activity className="w-5 h-5 text-amber-400" />
                    <div>
                      <div className="text-[10px] font-mono uppercase text-slate-400">Earthquake Seismic Feed</div>
                      <div className="text-xs font-bold text-slate-200">USGS M2.5+ Global Active</div>
                      <div className="text-[10px] text-emerald-400">All regional stations nominal</div>
                    </div>
                  </div>

                  <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-2xl flex items-center gap-3">
                    <Sun className="w-5 h-5 text-sky-400" />
                    <div>
                      <div className="text-[10px] font-mono uppercase text-slate-400">Space Weather Solar Flux</div>
                      <div className="text-xs font-bold text-slate-200">Solar Index: S1 Minor</div>
                      <div className="text-[10px] text-sky-300">HF Radio Propagation Good</div>
                    </div>
                  </div>

                  <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-2xl flex items-center gap-3">
                    <Compass className="w-5 h-5 text-lime-400" />
                    <div>
                      <div className="text-[10px] font-mono uppercase text-slate-400">Maritime & Aviation</div>
                      <div className="text-xs font-bold text-slate-200">OpenSky & AIS Channels</div>
                      <div className="text-[10px] text-slate-400">Ref O03 / O04 feeds active</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* 4-Feed Camera Wall */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {pinnedCamIds.map(id => {
                  const cam = WORLD_CAMERAS.find(c => c.id === id) || WORLD_CAMERAS[0];
                  return (
                    <div
                      key={id}
                      className="relative aspect-video rounded-2xl overflow-hidden border border-slate-800 bg-black group"
                    >
                      <img
                        src={cam.streamUrl}
                        alt={cam.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-between p-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-mono font-bold bg-slate-950/80 text-emerald-400 px-2 py-0.5 rounded border border-slate-800">
                            {cam.city.toUpperCase()}
                          </span>
                          <button
                            onClick={() => {
                              setActiveCam(cam);
                              setViewMode('single');
                            }}
                            className="p-1 rounded bg-slate-950/80 text-slate-300 hover:text-white"
                            title="Expand"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-100">{cam.name}</div>
                          <div className="text-[10px] text-slate-400">{cam.provider}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
