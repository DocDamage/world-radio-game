import React, { useEffect, useRef, useState } from 'react';
import Globe from 'globe.gl';
import type { RadioStation } from '../types';
import { escapeHtml } from '../services/radioApi';
import {
  createGlobeTilesLayer,
  isGlobeTilesKeyUsable,
  type GlobeTilesLayer,
  type GlobeTilesStatus
} from '../services/globeTiles';

function detectWebGlSupport(): boolean {
  try {
    const testCanvas = document.createElement('canvas');
    const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
    return Boolean(gl);
  } catch {
    return false;
  }
}

interface WorldGlobeProps {
  stations: RadioStation[];
  activeStation: RadioStation | null;
  onSelectStation: (station: RadioStation) => void;
  onGlobeClick?: (coords: { lat: number; lng: number }) => void;
  isMysteryMode?: boolean;
  /** Google Maps Platform key (Map Tiles API) — required for the 3D Tiles layer. */
  tilesApiKey?: string;
  /** Toggles the Photorealistic 3D Tiles layer on top of the globe. */
  tilesEnabled?: boolean;
  onTilesStatusChange?: (status: GlobeTilesStatus) => void;
}

export const WorldGlobe: React.FC<WorldGlobeProps> = ({
  stations,
  activeStation,
  onSelectStation,
  onGlobeClick,
  isMysteryMode = false,
  tilesApiKey = '',
  tilesEnabled = false,
  onTilesStatusChange
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeInstanceRef = useRef<any>(null);
  const [webGlSupported] = useState<boolean>(detectWebGlSupport);

  // Keep latest callbacks in refs to avoid recreating the Globe instance on
  // every prop change. Refs are synced in an effect (never during render).
  const onSelectStationRef = useRef(onSelectStation);
  const onGlobeClickRef = useRef(onGlobeClick);
  const activeStationRef = useRef(activeStation);
  const isMysteryModeRef = useRef(isMysteryMode);
  const onTilesStatusChangeRef = useRef(onTilesStatusChange);
  useEffect(() => {
    onSelectStationRef.current = onSelectStation;
    onGlobeClickRef.current = onGlobeClick;
    activeStationRef.current = activeStation;
    isMysteryModeRef.current = isMysteryMode;
    onTilesStatusChangeRef.current = onTilesStatusChange;
  });

  // Photorealistic 3D Tiles layer handle
  const tilesLayerRef = useRef<GlobeTilesLayer | null>(null);

  useEffect(() => {
    if (!containerRef.current || !webGlSupported) return;

    // Initialize Globe.gl
    const globe = new Globe(containerRef.current)
      .globeImageUrl('//unpkg.com/three-globe/example/img/earth-night.jpg')
      .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
      .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
      .showAtmosphere(true)
      .atmosphereColor('#4aa3ff')
      .atmosphereAltitude(0.2)
      .pointLat('geo_lat')
      .pointLng('geo_long')
      .pointAltitude(0.015)
      .pointRadius(0.6)
      .pointColor((d: any) => {
        if (activeStationRef.current && d.id === activeStationRef.current.id) {
          return '#c8f65a'; // OpenRadio Electric Lime for selected
        }
        return '#38ef7d'; // Glowing green dots
      })
      .pointLabel((d: any) => {
        if (isMysteryModeRef.current) {
          return `
            <div style="background: rgba(7, 9, 8, 0.9); backdrop-filter: blur(12px); border: 1px solid rgba(244, 63, 94, 0.4); padding: 8px 12px; border-radius: 10px; color: #f3f7ee; font-family: system-ui, sans-serif; font-size: 13px; box-shadow: 0 8px 24px rgba(0,0,0,0.6);">
              <div style="font-weight: 700; color: #fb7185;">🕵️ Classified Frequency</div>
              <div style="color: #a3ada4; font-size: 11px;">Mystery Broadcast Signal</div>
            </div>
          `;
        }

        const safeName = escapeHtml(d.name || 'Station');
        const safePlace = escapeHtml(d.place || '');
        const safeCountry = escapeHtml(d.country || '');
        return `
          <div style="background: rgba(7, 9, 8, 0.9); backdrop-filter: blur(12px); border: 1px solid rgba(200, 246, 90, 0.4); padding: 8px 12px; border-radius: 10px; color: #f3f7ee; font-family: system-ui, sans-serif; font-size: 13px; box-shadow: 0 8px 24px rgba(0,0,0,0.6);">
            <div style="font-weight: 700; color: #c8f65a;">📻 ${safeName}</div>
            <div style="color: #a3ada4; font-size: 11px;">📍 ${safePlace}${safePlace && safeCountry ? ', ' : ''}${safeCountry}</div>
            <div style="color: #ff9d3c; font-size: 10px; font-family: monospace; margin-top: 3px;">ON AIR • LIVE BROADCAST</div>
          </div>
        `;
      })
      .onPointClick((point: any) => {
        onSelectStationRef.current(point as RadioStation);
      })
      .onGlobeClick((coords: any) => {
        if (onGlobeClickRef.current) {
          onGlobeClickRef.current({ lat: coords.lat, lng: coords.lng });
        }
      });

    // Ring animation for active station
    globe.ringLat('geo_lat')
      .ringLng('geo_long')
      .ringAltitude(0.01)
      .ringColor(() => (t: number) => `rgba(200, 246, 90, ${1 - t})`)
      .ringMaxRadius(4)
      .ringPropagationSpeed(2)
      .ringRepeatPeriod(900);

    // Initial camera position
    globe.pointOfView({ lat: 20, lng: 0, altitude: 2.2 }, 0);

    // Auto-rotation controls
    const controls = globe.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.35;
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;

    globeInstanceRef.current = globe;

    const handleResize = () => {
      if (containerRef.current && globeInstanceRef.current) {
        globeInstanceRef.current.width(containerRef.current.clientWidth);
        globeInstanceRef.current.height(containerRef.current.clientHeight);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (globeInstanceRef.current) {
        globeInstanceRef.current._destructor?.();
      }
    };
  }, [webGlSupported]);

  // Update points data
  useEffect(() => {
    if (!globeInstanceRef.current) return;
    globeInstanceRef.current.pointsData(stations);
    globeInstanceRef.current.ringsData(activeStation ? [activeStation] : []);
  }, [stations, activeStation]);

  // Smooth fly-to when active station changes
  useEffect(() => {
    if (!globeInstanceRef.current || !activeStation) return;
    const controls = globeInstanceRef.current.controls();
    controls.autoRotate = false; // Pause rotation when focusing on a station

    globeInstanceRef.current.pointOfView(
      {
        lat: activeStation.geo_lat,
        lng: activeStation.geo_long,
        altitude: 1.15
      },
      1400 // Animation duration in ms
    );
  }, [activeStation]);

  // Google Photorealistic 3D Tiles layer (opt-in; needs a Map Tiles API key).
  // The globe instance is created by the effect above, which runs first, so
  // globeInstanceRef is populated by the time this effect executes.
  useEffect(() => {
    const globe = globeInstanceRef.current;
    if (!globe || !tilesEnabled || !isGlobeTilesKeyUsable(tilesApiKey)) {
      onTilesStatusChangeRef.current?.({ phase: 'disabled' });
      return;
    }

    let disposed = false;
    (async () => {
      try {
        const layer = await createGlobeTilesLayer({
          apiKey: tilesApiKey,
          globe,
          onStatus: (status) => {
            if (!disposed) onTilesStatusChangeRef.current?.(status);
          }
        });
        if (disposed) {
          // Unmounted while the heavy stack was still downloading.
          layer.dispose();
          return;
        }
        tilesLayerRef.current = layer;
      } catch (err) {
        if (!disposed) {
          onTilesStatusChangeRef.current?.({
            phase: 'error',
            message: err instanceof Error ? err.message : String(err)
          });
        }
      }
    })();

    return () => {
      disposed = true;
      tilesLayerRef.current?.dispose();
      tilesLayerRef.current = null;
    };
  }, [tilesEnabled, tilesApiKey]);

  if (!webGlSupported) {
    return (
      <div className="absolute inset-0 w-full h-full bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-200 z-10 overflow-y-auto">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-center space-y-4">
          <div className="text-3xl">🌍</div>
          <h2 className="text-lg font-bold text-slate-100">Station Directory (WebGL Fallback)</h2>
          <p className="text-xs text-slate-400">
            WebGL is unavailable or disabled on this device. You can still browse and tune into stations below:
          </p>
          <div className="max-h-60 overflow-y-auto space-y-2 text-left pr-1">
            {stations.slice(0, 30).map(s => (
              <button
                key={s.id}
                onClick={() => onSelectStation(s)}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs transition border flex items-center justify-between ${
                  activeStation?.id === s.id
                    ? 'bg-lime-400/20 text-lime-300 border-lime-400/50'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700/60'
                }`}
              >
                <div>
                  <div className="font-bold">{s.name}</div>
                  <div className="text-[10px] text-slate-400">{s.place}, {s.country}</div>
                </div>
                {activeStation?.id === s.id && <span className="text-[10px] text-lime-400 font-mono">ON AIR</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 w-full h-full overflow-hidden select-none"
      style={{ cursor: 'grab' }}
    />
  );
};
