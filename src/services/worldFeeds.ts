/**
 * Live world feeds for the World Monitor.
 *
 * All endpoints are public, keyless, and verified to send
 * `Access-Control-Allow-Origin: *` so the browser can call them directly:
 *  - USGS earthquake summary feed (M2.5+, past 24h)
 *  - NASA EONET v3 open natural events
 *  - NOAA SWPC planetary K-index + NOAA space weather scales
 *
 * Aviation/maritime trackers (OpenSky, ADSB.lol) do NOT send CORS headers,
 * so they cannot be consumed from the browser without a server-side proxy —
 * the World Monitor marks them as planned until a proxy exists.
 */

// ---------- USGS earthquakes ----------

const USGS_FEED_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson';

export interface QuakeEvent {
  id: string;
  mag: number;
  place: string;
  time: number; // epoch ms
  depthKm: number;
}

export async function fetchQuakes(): Promise<QuakeEvent[]> {
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
  return events;
}

// ---------- NASA EONET natural events ----------

const EONET_URL = 'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=40';

export interface EonetEvent {
  id: string;
  title: string;
  category: string; // e.g. "Wildfires", "Severe Storms", "Volcanoes"
  lat: number;
  lng: number;
  dateIso: string;
  link: string;
  source: string;
}

function parseEonetGeometry(geometry: unknown): { lat: number; lng: number; dateIso: string } | null {
  const g = geometry as { type?: string; date?: string; coordinates?: unknown } | undefined;
  if (!g || !Array.isArray(g.coordinates)) return null;
  if (g.type === 'Point') {
    const c = g.coordinates;
    if (typeof c[0] === 'number' && typeof c[1] === 'number') {
      return { lng: c[0], lat: c[1], dateIso: g.date || '' };
    }
    return null;
  }
  // Polygons: take the first position of the first ring ([lng, lat] pairs).
  const outer = g.coordinates[0];
  const pos = Array.isArray(outer) && Array.isArray(outer[0]) ? (g.type === 'MultiPolygon' ? outer[0] : outer) : null;
  if (pos && typeof pos[0] === 'number' && typeof pos[1] === 'number') {
    return { lng: pos[0], lat: pos[1], dateIso: g.date || '' };
  }
  return null;
}

export async function fetchEonetEvents(): Promise<EonetEvent[]> {
  const res = await fetch(EONET_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const payload = await res.json();
  const events: EonetEvent[] = [];
  for (const raw of (payload.events as unknown[] | undefined) || []) {
    const e = raw as {
      id?: string;
      title?: string;
      link?: string;
      categories?: { title?: string }[];
      sources?: { id?: string }[];
      geometry?: unknown[];
    };
    if (!e.id || !e.title) continue;
    // Use the most recent geometry entry that has usable coordinates.
    let point: { lat: number; lng: number; dateIso: string } | null = null;
    for (const g of e.geometry || []) {
      const parsed = parseEonetGeometry(g);
      if (parsed) point = parsed;
    }
    if (!point) continue;
    events.push({
      id: e.id,
      title: e.title,
      category: e.categories?.[0]?.title || 'Event',
      lat: point.lat,
      lng: point.lng,
      dateIso: point.dateIso,
      link: e.link || '',
      source: e.sources?.[0]?.id || 'NASA EONET'
    });
  }
  events.sort((a, b) => (a.dateIso < b.dateIso ? 1 : -1));
  return events;
}

/** Distance in km between two coordinates (haversine, rounded). */
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

// ---------- NOAA SWPC space weather ----------

const SWPC_KP_URL = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json';
const SWPC_SCALES_URL = 'https://services.swpc.noaa.gov/products/noaa-scales.json';

export interface SpaceWeatherReport {
  /** ISO timestamp of the newest Kp observation */
  observedAt: string;
  /** Latest planetary K-index (0–9, may be fractional) */
  kp: number | null;
  /** Last 8 three-hour Kp values (~24h, oldest first) */
  kpTrend: number[];
  /** Human-readable interpretation of the current Kp */
  summary: string;
  /** NOAA space weather scales: R = radio blackout, S = radiation, G = geomagnetic */
  radioBlackoutScale: string | null;
  radiationScale: string | null;
  geomagneticScale: string | null;
}

export function describeKp(kp: number): string {
  if (kp >= 8) return 'Extreme storm — aurora visible at low latitudes';
  if (kp >= 7) return 'Strong storm — vivid aurora, radio/GPS disturbance likely';
  if (kp >= 5) return 'Geomagnetic storm — aurora visible at high latitudes';
  if (kp >= 4) return 'Unsettled — faint aurora possible at high latitudes';
  return 'Quiet — no geomagnetic activity';
}

export async function fetchSpaceWeather(): Promise<SpaceWeatherReport> {
  const [kpRes, scalesRes] = await Promise.all([fetch(SWPC_KP_URL), fetch(SWPC_SCALES_URL)]);
  if (!kpRes.ok) throw new Error(`K-index HTTP ${kpRes.status}`);
  if (!scalesRes.ok) throw new Error(`Scales HTTP ${scalesRes.status}`);
  const kpRows = await kpRes.json();
  const scales = await scalesRes.json();

  const rows = (kpRows as { time_tag?: string; Kp?: number }[]) || [];
  const trend = rows
    .slice(-8)
    .map(r => (typeof r.Kp === 'number' ? r.Kp : 0));
  const latest = rows.length > 0 ? rows[rows.length - 1] : undefined;
  const kp = typeof latest?.Kp === 'number' ? latest.Kp : null;

  const current = (scales as Record<string, { R?: { Scale?: string }; S?: { Scale?: string }; G?: { Scale?: string } }>)['0'] || {};

  return {
    observedAt: latest?.time_tag || '',
    kp,
    kpTrend: trend,
    summary: kp !== null ? describeKp(kp) : 'No recent K-index observations',
    radioBlackoutScale: current.R?.Scale ?? null,
    radiationScale: current.S?.Scale ?? null,
    geomagneticScale: current.G?.Scale ?? null
  };
}
