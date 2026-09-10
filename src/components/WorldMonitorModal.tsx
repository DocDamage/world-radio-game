import React, { useState, useEffect } from 'react';
import { Camera, Eye, X, ExternalLink, RefreshCw, LayoutGrid, Maximize2, Radio, Activity, Sun, Compass, AlertCircle } from 'lucide-react';
import { WORLD_CAMERAS, type WorldCamera, type CameraCategory } from '../services/cctvCatalog';
import { soundEffects } from '../services/audioEffects';
import { travelerState } from '../services/travelerState';
import { useModalA11y } from '../hooks/useModalA11y';
import { useLiveFeed } from '../hooks/useLiveFeed';
import {
  fetchQuakes,
  fetchEonetEvents,
  fetchSpaceWeather,
  distanceKm,
  type QuakeEvent,
  type EonetEvent,
  type SpaceWeatherReport
} from '../services/worldFeeds';
import type { BackpackItem } from '../types';

const DEFAULT_PINNED_CAM_IDS = ['cam-tokyo-shibuya', 'cam-paris-eiffel', 'cam-nyc-times-square', 'cam-venice-grand-canal'];

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
  const [pinnedCamIds, setPinnedCamIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('world_radio_pinned_cams');
      const parsed = saved ? (JSON.parse(saved) as unknown) : null;
      if (Array.isArray(parsed)) {
        const valid = parsed.filter((id): id is string => typeof id === 'string' && WORLD_CAMERAS.some(c => c.id === id));
        return valid.length > 0 ? valid.slice(0, 4) : DEFAULT_PINNED_CAM_IDS;
      }
    } catch {
      // corrupted saved pins fall back to the defaults
    }
    return DEFAULT_PINNED_CAM_IDS;
  });
  const [viewMode, setViewMode] = useState<'single' | 'wall'>('single');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [postcardSavedMsg, setPostcardSavedMsg] = useState<string>('');

  // Auto-select nearby camera if available (state adjusted during render when
  // the active city changes — no effect needed, no cascading renders)
  const [prevCity, setPrevCity] = useState(activeCity);
  if (activeCity !== prevCity) {
    setPrevCity(activeCity);
    const match = activeCity
      ? WORLD_CAMERAS.find(c =>
          c.city.toLowerCase().includes(activeCity.toLowerCase()) ||
          activeCity.toLowerCase().includes(c.city.toLowerCase())
        )
      : undefined;
    if (match) setActiveCam(match);
  }

  // Live telemetry feeds: USGS seismic, NASA EONET natural events, NOAA space
  // weather. Each loads while the monitor is open, with per-feed retry.
  const quakeFeed = useLiveFeed<QuakeEvent[]>(isOpen, fetchQuakes);
  const eventFeed = useLiveFeed<EonetEvent[]>(isOpen, fetchEonetEvents);
  const spaceFeed = useLiveFeed<SpaceWeatherReport>(isOpen, fetchSpaceWeather);
  const quakes = quakeFeed.data || [];
  const quakeStatus = quakeFeed.status;
  const quakeFetchedAt = quakeFeed.fetchedAt;

  // Clock for "X min ago" labels. Reading Date.now() during render would be
  // impure, so the timestamp lives in state and ticks once a minute while the
  // monitor is open (which also keeps the ages fresh, unlike a stale snapshot).
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  useEffect(() => {
    if (!isOpen) return;
    const clock = setInterval(() => setNowMs(Date.now()), 60000);
    return () => clearInterval(clock);
  }, [isOpen]);

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
    void quakeFeed.refresh();
    void eventFeed.refresh();
    void spaceFeed.refresh();
    setFeedReloadToken(t => t + 1);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  // Camera wall pinning: up to four feeds, persisted in localStorage.
  const togglePinCam = (cam: WorldCamera) => {
    soundEffects.playUiClick(0.15);
    setPinnedCamIds(prev => {
      const next = prev.includes(cam.id)
        ? prev.filter(id => id !== cam.id)
        : [...prev, cam.id].slice(-4);
      localStorage.setItem('world_radio_pinned_cams', JSON.stringify(next));
      return next;
    });
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
                  CAMERAS + LIVE FEEDS
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Public camera streams • Live USGS seismic, NASA EONET &amp; NOAA space weather • Synchronized with your radio soundtrack
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
                <LayoutGrid className="w-3.5 h-3.5" /> Pinned Wall
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
                        onClick={() => togglePinCam(activeCam)}
                        className={`px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                          pinnedCamIds.includes(activeCam.id)
                            ? 'bg-emerald-400 text-slate-950'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                        }`}
                        title={pinnedCamIds.includes(activeCam.id) ? 'Remove from camera wall' : 'Pin to camera wall (max 4 feeds)'}
                      >
                        {pinnedCamIds.includes(activeCam.id) ? '📌 Pinned' : '📌 Pin to Wall'}
                      </button>

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

                {/* Environmental Overview Telemetry (live USGS + NASA EONET + NOAA SWPC) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
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
                          <div className="text-[10px] text-slate-400">{quakeFeed.error}</div>
                          <button
                            onClick={() => void quakeFeed.refresh()}
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
                        const ageMin = Math.max(1, Math.round((nowMs - latest.time) / 60000));
                        const syncAgeMin = quakeFetchedAt
                          ? Math.max(1, Math.round((nowMs - quakeFetchedAt) / 60000))
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
                    <Activity className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[10px] font-mono uppercase text-slate-400">Earth Events (NASA EONET)</div>
                        <a
                          href="https://eonet.gsfc.nasa.gov/"
                          target="_blank"
                          rel="noreferrer"
                          className="text-[9px] font-mono text-emerald-400 hover:text-emerald-300 shrink-0"
                        >
                          source ↗
                        </a>
                      </div>
                      {eventFeed.status === 'loading' && (
                        <div className="text-xs text-slate-300 font-bold animate-pulse">Fetching natural events…</div>
                      )}
                      {eventFeed.status === 'error' && (
                        <div>
                          <div className="text-xs font-bold text-rose-400">Live feed unavailable</div>
                          <button
                            onClick={() => void eventFeed.refresh()}
                            className="mt-1 text-[10px] font-mono text-amber-400 hover:text-amber-300 underline"
                          >
                            Retry now
                          </button>
                        </div>
                      )}
                      {eventFeed.status === 'ok' && (eventFeed.data || []).length === 0 && (
                        <div className="text-xs font-bold text-slate-200">No open natural events tracked right now</div>
                      )}
                      {eventFeed.status === 'ok' && (eventFeed.data || []).length > 0 && (() => {
                        const events = eventFeed.data || [];
                        const byCategory = new Map<string, number>();
                        for (const ev of events) {
                          byCategory.set(ev.category, (byCategory.get(ev.category) || 0) + 1);
                        }
                        const top = [...byCategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
                        const nearest = events.reduce((best, ev) => {
                          const d = distanceKm(activeCam.lat, activeCam.lng, ev.lat, ev.lng);
                          return !best || d < best.d ? { ev, d } : best;
                        }, null as { ev: EonetEvent; d: number } | null);
                        return (
                          <>
                            <div className="text-xs font-bold text-slate-200">
                              {events.length} open events • {top.map(([c, n]) => `${n} ${c.toLowerCase()}`).join(', ')}
                            </div>
                            {nearest && (
                              <div className="text-[10px] text-orange-300 truncate" title={nearest.ev.title}>
                                Nearest to {activeCam.city}: {nearest.ev.title} • ~{nearest.d.toLocaleString()} km away
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-2xl flex items-start gap-3">
                    <Sun className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[10px] font-mono uppercase text-slate-400">Space Weather (NOAA SWPC)</div>
                        <a
                          href="https://www.swpc.noaa.gov/products/planetary-k-index"
                          target="_blank"
                          rel="noreferrer"
                          className="text-[9px] font-mono text-emerald-400 hover:text-emerald-300 shrink-0"
                        >
                          source ↗
                        </a>
                      </div>
                      {spaceFeed.status === 'loading' && (
                        <div className="text-xs text-slate-300 font-bold animate-pulse">Reading solar-terrestrial data…</div>
                      )}
                      {spaceFeed.status === 'error' && (
                        <div>
                          <div className="text-xs font-bold text-rose-400">Live feed unavailable</div>
                          <button
                            onClick={() => void spaceFeed.refresh()}
                            className="mt-1 text-[10px] font-mono text-amber-400 hover:text-amber-300 underline"
                          >
                            Retry now
                          </button>
                        </div>
                      )}
                      {spaceFeed.status === 'ok' && spaceFeed.data && (() => {
                        const sw = spaceFeed.data;
                        const barColor = (kp: number) =>
                          kp >= 7 ? 'bg-rose-400' : kp >= 5 ? 'bg-amber-400' : 'bg-sky-400';
                        return (
                          <>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-200">Kp {sw.kp !== null ? sw.kp.toFixed(2) : '—'}</span>
                              <div className="flex items-end gap-0.5 h-4" aria-hidden="true">
                                {sw.kpTrend.map((kp, i) => (
                                  <span
                                    key={i}
                                    className={`w-1.5 rounded-sm ${barColor(kp)}`}
                                    style={{ height: `${Math.max(8, (kp / 9) * 100)}%` }}
                                  />
                                ))}
                              </div>
                            </div>
                            <div className="text-[10px] text-sky-300 truncate">{sw.summary}</div>
                            <div className="text-[10px] text-slate-400">
                              Scales — R{sw.radioBlackoutScale ?? '—'} radio • S{sw.radiationScale ?? '—'} radiation • G{sw.geomagneticScale ?? '—'} geo
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-2xl flex items-start gap-3">
                    <Compass className="w-5 h-5 text-lime-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="text-[10px] font-mono uppercase text-slate-400">Maritime & Aviation</div>
                      <div className="text-xs font-bold text-slate-400">Planned feed — blocked in-browser</div>
                      <div className="text-[10px] text-slate-500">
                        Live AIS/ADS-B feeds (OpenSky, ADSB.lol) send no cross-origin headers, so they need a server-side proxy first.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Pinned Camera Wall (up to 4 user-selected feeds) */
              <div className="space-y-4">
                {pinnedCamIds.length === 0 && (
                  <div className="aspect-video rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 flex flex-col items-center justify-center gap-2 text-center p-6">
                    <LayoutGrid className="w-8 h-8 text-slate-500" />
                    <div className="text-sm font-bold text-slate-300">No feeds pinned yet</div>
                    <div className="text-xs text-slate-500 max-w-sm">
                      Switch to Single Focus, pick a camera from the directory, and press “Pin to Wall” to build your own camera wall (up to four feeds).
                    </div>
                  </div>
                )}
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
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => togglePinCam(cam)}
                                className="p-1 rounded bg-slate-950/80 text-emerald-300 hover:text-white"
                                title="Unpin this feed"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
