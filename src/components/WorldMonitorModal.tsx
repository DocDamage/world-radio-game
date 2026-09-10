import React, { useState, useEffect, useCallback } from 'react';
import { Camera, Eye, X, ExternalLink, RefreshCw, LayoutGrid, Maximize2, Radio, Activity, Sun, Compass, AlertCircle } from 'lucide-react';
import { WORLD_CAMERAS, type WorldCamera, type CameraCategory } from '../services/cctvCatalog';
import { soundEffects } from '../services/audioEffects';
import { travelerState } from '../services/travelerState';
import { useModalA11y } from '../hooks/useModalA11y';
import type { BackpackItem } from '../types';

// USGS real-time earthquake GeoJSON summary feed (M2.5+ events, past 24 hours)
const USGS_FEED_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson';

interface QuakeEvent {
  id: string;
  mag: number;
  place: string;
  time: number;   // epoch ms
  depthKm: number;
}

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

  // Live USGS seismic feed (M2.5+, past 24h) — fetched when the monitor opens
  const [quakes, setQuakes] = useState<QuakeEvent[]>([]);
  const [quakeStatus, setQuakeStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [quakeFetchedAt, setQuakeFetchedAt] = useState<number | null>(null);
  const [quakeError, setQuakeError] = useState<string>('');

  const fetchQuakes = useCallback(async () => {
    setQuakeStatus('loading');
    setQuakeError('');
    try {
      const res = await fetch(USGS_FEED_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const geo = await res.json();
      const events: QuakeEvent[] = ((geo.features as unknown[] | undefined) || [])
        .map((f): QuakeEvent => {
          const feature = f as {
            id: string;
            properties?: { mag?: number; place?: string; time?: number };
            geometry?: { coordinates?: number[] };
          };
          return {
            id: feature.id,
            mag: typeof feature.properties?.mag === 'number' ? feature.properties.mag : 0,
            place: feature.properties?.place || 'Unknown region',
            time: typeof feature.properties?.time === 'number' ? feature.properties.time : Date.now(),
            depthKm: Math.round(feature.geometry?.coordinates?.[2] ?? 0)
          };
        })
        .sort((a, b) => b.time - a.time);
      setQuakes(events);
      setQuakeFetchedAt(Date.now());
      setQuakeStatus('ok');
    } catch (err) {
      setQuakeError(err instanceof Error ? err.message : 'Network error');
      setQuakeStatus('error');
    }
  }, []);

  useEffect(() => {
    if (isOpen) fetchQuakes();
  }, [isOpen, fetchQuakes]);

  // Camera feed capability checks: public CCTV stills can be offline, rate
  // limited, or geo-blocked — track per-feed load state and offer cache-busting
  // retries instead of showing a broken image tile.
  const [feedStatus, setFeedStatus] = useState<Record<string, 'loading' | 'ok' | 'error'>>({});
  const [feedReloadToken, setFeedReloadToken] = useState<number>(0);
  const [isOffline, setIsOffline] = useState<boolean>(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  useEffect(() => {
    const updateOnline = () => setIsOffline(!navigator.onLine);
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
    };
  }, []);

  const feedUrl = (cam: WorldCamera) => {
    const sep = cam.streamUrl.includes('?') ? '&' : '?';
    return feedReloadToken > 0 ? `${cam.streamUrl}${sep}_t=${feedReloadToken}` : cam.streamUrl;
  };

  const handleFeedLoad = (camId: string) => setFeedStatus(prev => ({ ...prev, [camId]: 'ok' }));
  const handleFeedError = (camId: string) => setFeedStatus(prev => ({ ...prev, [camId]: 'error' }));
  const retryFeed = (cam: WorldCamera) => {
    soundEffects.playUiClick(0.15);
    setFeedStatus(prev => ({ ...prev, [cam.id]: 'loading' }));
    setFeedReloadToken(t => t + 1);
  };

  // Shared modal a11y: Escape to close, focus trap, focus restore
  const { containerRef: dialogRef, dialogProps } = useModalA11y({ isOpen, onClose });

  if (!isOpen) return null;

  const filteredCams = selectedCategory === 'all'
    ? WORLD_CAMERAS
    : WORLD_CAMERAS.filter(c => c.category === selectedCategory);

  const handleRefresh = () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      // the offline banner explains why nothing refreshes
      return;
    }
    setIsRefreshing(true);
    soundEffects.playUiClick(0.15);
    fetchQuakes();
    setFeedReloadToken(t => t + 1);
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
      <div ref={dialogRef} {...dialogProps} className="relative w-full max-w-6xl bg-slate-950 border border-emerald-400/40 rounded-3xl overflow-hidden shadow-2xl flex flex-col text-slate-100 max-h-[92vh] overflow-y-auto overscroll-contain">
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
                  CAMERAS + LIVE USGS FEED
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Public camera streams • Live USGS seismic data • Synchronized with your radio soundtrack
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
                    src={feedUrl(activeCam)}
                    alt={activeCam.name}
                    className="w-full h-full object-cover"
                    onLoad={() => handleFeedLoad(activeCam.id)}
                    onError={() => handleFeedError(activeCam.id)}
                  />

                  {/* Feed connecting spinner */}
                  {(feedStatus[activeCam.id] ?? 'loading') === 'loading' && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-slate-950">
                      <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                      <div className="text-[11px] font-mono text-slate-400">
                        Connecting to {activeCam.city} camera…
                      </div>
                    </div>
                  )}

                  {/* Feed offline: capability check failed, offer a retry */}
                  {feedStatus[activeCam.id] === 'error' && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-slate-950">
                      <Camera className="w-8 h-8 text-rose-400" />
                      <div className="text-xs font-bold text-rose-300">Feed unavailable</div>
                      <div className="text-[10px] text-slate-400 max-w-xs text-center">
                        The {activeCam.provider} stream is offline, rate-limited, or unreachable from your network right now.
                      </div>
                      <button
                        onClick={() => retryFeed(activeCam)}
                        className="mt-1 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1.5 transition"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Retry Feed
                      </button>
                    </div>
                  )}

                  {/* Offline banner */}
                  {isOffline && (
                    <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-center gap-2 bg-rose-950/80 border-b border-rose-500/40 py-1.5 text-[10px] font-mono text-rose-300">
                      <AlertCircle className="w-3.5 h-3.5" /> Offline — reconnect to load camera feeds
                    </div>
                  )}

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

                {/* Environmental Overview Telemetry (live USGS + planned feeds) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-2xl flex items-start gap-3">
                    <Activity className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[10px] font-mono uppercase text-slate-400">USGS Earthquakes (M2.5+, 24h)</div>
                        <a
                          href="https://earthquake.usgs.gov/earthquakes/feed/"
                          target="_blank"
                          rel="noreferrer"
                          className="text-[9px] font-mono text-emerald-400 hover:text-emerald-300 shrink-0"
                        >
                          source ↗
                        </a>
                      </div>
                      {quakeStatus === 'loading' && (
                        <div className="text-xs text-slate-300 font-bold animate-pulse">Fetching live seismic feed…</div>
                      )}
                      {quakeStatus === 'error' && (
                        <div>
                          <div className="text-xs font-bold text-rose-400">Live feed unavailable</div>
                          <div className="text-[10px] text-slate-400">{quakeError}</div>
                          <button
                            onClick={fetchQuakes}
                            className="mt-1 text-[10px] font-mono text-amber-400 hover:text-amber-300 underline"
                          >
                            Retry now
                          </button>
                        </div>
                      )}
                      {quakeStatus === 'ok' && quakes.length === 0 && (
                        <div className="text-xs font-bold text-slate-200">
                          No M2.5+ earthquakes in the past 24 hours
                        </div>
                      )}
                      {quakeStatus === 'ok' && quakes.length > 0 && (() => {
                        const strongest = quakes.reduce((a, b) => (b.mag > a.mag ? b : a), quakes[0]);
                        const latest = quakes[0];
                        const ageMin = Math.max(1, Math.round((Date.now() - latest.time) / 60000));
                        const syncAgeMin = quakeFetchedAt
                          ? Math.max(1, Math.round((Date.now() - quakeFetchedAt) / 60000))
                          : null;
                        return (
                          <>
                            <div className="text-xs font-bold text-slate-200">
                              {quakes.length} events • Strongest M{strongest.mag.toFixed(1)}
                            </div>
                            <div className="text-[10px] text-amber-300 truncate" title={strongest.place}>
                              {strongest.place} • {strongest.depthKm} km deep
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Latest {ageMin < 60 ? `${ageMin} min ago` : `${Math.round(ageMin / 60)} h ago`}
                              {syncAgeMin !== null && ` • synced ${syncAgeMin} min ago`}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-2xl flex items-start gap-3">
                    <Sun className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="text-[10px] font-mono uppercase text-slate-400">Space Weather Solar Flux</div>
                      <div className="text-xs font-bold text-slate-400">Planned feed — not yet live</div>
                      <div className="text-[10px] text-slate-500">NOAA SWPC integration in a future update</div>
                    </div>
                  </div>

                  <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-2xl flex items-start gap-3">
                    <Compass className="w-5 h-5 text-lime-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="text-[10px] font-mono uppercase text-slate-400">Maritime & Aviation</div>
                      <div className="text-xs font-bold text-slate-400">Planned feed — not yet live</div>
                      <div className="text-[10px] text-slate-500">OpenSky / AIS integration in a future update</div>
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
                        src={feedUrl(cam)}
                        alt={cam.name}
                        className="w-full h-full object-cover"
                        onLoad={() => handleFeedLoad(cam.id)}
                        onError={() => handleFeedError(cam.id)}
                      />
                      {(feedStatus[cam.id] ?? 'loading') === 'loading' && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950">
                          <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                      {feedStatus[cam.id] === 'error' && (
                        <button
                          onClick={() => retryFeed(cam)}
                          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-1.5 bg-slate-950/90 text-[11px] font-bold text-rose-300 transition hover:bg-slate-900"
                          title="Retry this camera feed"
                        >
                          <RefreshCw className="w-5 h-5" />
                          Feed offline — tap to retry
                        </button>
                      )}
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
