import React, { useEffect, useRef } from 'react';
import Globe from 'globe.gl';
import type { RadioStation } from '../types';

interface WorldGlobeProps {
  stations: RadioStation[];
  activeStation: RadioStation | null;
  onSelectStation: (station: RadioStation) => void;
  onGlobeClick?: (coords: { lat: number; lng: number }) => void;
}

export const WorldGlobe: React.FC<WorldGlobeProps> = ({
  stations,
  activeStation,
  onSelectStation,
  onGlobeClick
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

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
        if (activeStation && d.id === activeStation.id) {
          return '#c8f65a'; // OpenRadio Electric Lime for selected
        }
        return '#38ef7d'; // Glowing green dots like Radio Garden / OpenRadio
      })
      .pointLabel((d: any) => `
        <div style="background: rgba(7, 9, 8, 0.9); backdrop-filter: blur(12px); border: 1px solid rgba(200, 246, 90, 0.4); padding: 8px 12px; border-radius: 10px; color: #f3f7ee; font-family: system-ui, sans-serif; font-size: 13px; box-shadow: 0 8px 24px rgba(0,0,0,0.6);">
          <div style="font-weight: 700; color: #c8f65a;">📻 ${d.name}</div>
          <div style="color: #a3ada4; font-size: 11px;">📍 ${d.place || ''}, ${d.country}</div>
          <div style="color: #ff9d3c; font-size: 10px; font-family: monospace; margin-top: 3px;">ON AIR • LIVE BROADCAST</div>
        </div>
      `)
      .onPointClick((point: any) => {
        onSelectStation(point as RadioStation);
      })
      .onGlobeClick((coords: any) => {
        if (onGlobeClick) {
          onGlobeClick({ lat: coords.lat, lng: coords.lng });
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
  }, []);

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

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 w-full h-full overflow-hidden select-none"
      style={{ cursor: 'grab' }}
    />
  );
};
