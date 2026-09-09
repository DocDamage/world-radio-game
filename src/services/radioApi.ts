import type { RadioStation, Place } from '../types';

export const CURATED_STATIONS: RadioStation[] = [
  {
    id: 'tokyo-shibuya-fm',
    name: 'J-Pop Powerplay Tokyo',
    place: 'Tokyo',
    country: 'Japan',
    countryCode: 'JP',
    streamUrl: 'https://kathy.torontocast.com:3560/stream',
    geo_lat: 35.658034,
    geo_long: 139.701636,
    tags: 'jpop,tokyo,japan,anime',
  },
  {
    id: 'paris-rmc-fr',
    name: 'RMC Info & Talk Paris',
    place: 'Paris',
    country: 'France',
    countryCode: 'FR',
    streamUrl: 'https://audio.bfmtv.com/rmcradio_128.mp3',
    geo_lat: 48.858844,
    geo_long: 2.294351,
    tags: 'news,talk,french,paris',
  },
  {
    id: 'nyc-classic-vinyl',
    name: 'Classic Vinyl Manhattan',
    place: 'New York',
    country: 'United States',
    countryCode: 'US',
    streamUrl: 'https://icecast.walmradio.com:8443/classic',
    geo_lat: 40.758896,
    geo_long: -73.985130,
    tags: 'classic rock,vinyl,nyc,usa',
  },
  {
    id: 'london-soho-radio',
    name: 'Soho Radio London',
    place: 'London',
    country: 'United Kingdom',
    countryCode: 'GB',
    streamUrl: 'https://stream.ecable.tv/sohoradio-mp3',
    geo_lat: 51.5133,
    geo_long: -0.1332,
    tags: 'indie,eclectic,soho,london',
  },
  {
    id: 'rio-bossa-nova',
    name: 'Bossa Nova Ipanema',
    place: 'Rio de Janeiro',
    country: 'Brazil',
    countryCode: 'BR',
    streamUrl: 'https://stream.zeno.fm/f3wvbbqmdg8uv',
    geo_lat: -22.9847,
    geo_long: -43.2045,
    tags: 'bossa nova,samba,brazil,rio',
  },
  {
    id: 'cairo-oriental-tarab',
    name: 'Tarab Cairo Classics',
    place: 'Cairo',
    country: 'Egypt',
    countryCode: 'EG',
    streamUrl: 'https://stream.zeno.fm/4vrtz37u8g0uv',
    geo_lat: 30.0444,
    geo_long: 31.2357,
    tags: 'tarab,oriental,classic,cairo',
  },
  {
    id: 'sydney-deep-house',
    name: 'Bondi Beach Electronic',
    place: 'Sydney',
    country: 'Australia',
    countryCode: 'AU',
    streamUrl: 'https://stream.zeno.fm/s493zwhndg8uv',
    geo_lat: -33.8908,
    geo_long: 151.2743,
    tags: 'electronic,deep house,sydney',
  },
  {
    id: 'reykjavik-ambient',
    name: 'Nordic Chill Reykjavik',
    place: 'Reykjavik',
    country: 'Iceland',
    countryCode: 'IS',
    streamUrl: 'https://stream.zeno.fm/fvrxwbqmdg8uv',
    geo_lat: 64.1466,
    geo_long: -21.9426,
    tags: 'ambient,chillout,nordic,iceland',
  }
];

let cachedPlaces: Place[] | null = null;
let cachedStations: RadioStation[] | null = null;
let cachedPlaceStationsMap: Map<string, RadioStation[]> | null = null;

export async function fetchPlaces(): Promise<Place[]> {
  if (cachedPlaces) return cachedPlaces;
  try {
    const res = await fetch('/data/places.json');
    if (res.ok) {
      cachedPlaces = await res.json();
      return cachedPlaces || [];
    }
  } catch (err) {
    console.warn('Could not load local places.json, using fallback:', err);
  }
  return [];
}

export async function loadStationsSnapshot(): Promise<{ stations: RadioStation[]; byPlace: Map<string, RadioStation[]> }> {
  if (cachedStations && cachedPlaceStationsMap) {
    return { stations: cachedStations, byPlace: cachedPlaceStationsMap };
  }

  try {
    const [places, stationsRes] = await Promise.all([
      fetchPlaces(),
      fetch('/data/stations.json')
    ]);

    if (stationsRes.ok) {
      const rawStations: any[] = await stationsRes.json();
      const placeMap = new Map<string, Place>();
      places.forEach(p => placeMap.set(p.id, p));

      const byPlace = new Map<string, RadioStation[]>();
      const validStations: RadioStation[] = [];

      for (const s of rawStations) {
        const place = placeMap.get(s.placeId);
        const geo_lat = place ? place.geo[1] : 0;
        const geo_long = place ? place.geo[0] : 0;
        const resolvedStream = s.streamUrl || `https://radio.garden/api/ara/content/listen/${s.id}/channel.mp3`;

        const station: RadioStation = {
          id: s.id,
          name: s.name,
          place: s.place || (place ? place.title : ''),
          placeId: s.placeId,
          country: s.country || (place ? place.country : ''),
          website: s.website || '',
          secure: s.secure,
          streamUrl: resolvedStream,
          geo_lat,
          geo_long,
          tags: s.place || s.country
        };

        validStations.push(station);
        if (s.placeId) {
          if (!byPlace.has(s.placeId)) byPlace.set(s.placeId, []);
          byPlace.get(s.placeId)!.push(station);
        }
      }

      cachedStations = validStations;
      cachedPlaceStationsMap = byPlace;
      return { stations: validStations, byPlace };
    }
  } catch (err) {
    console.warn('Failed to load stations.json:', err);
  }

  const byPlace = new Map<string, RadioStation[]>();
  CURATED_STATIONS.forEach(s => {
    byPlace.set(s.id, [s]);
  });
  return { stations: CURATED_STATIONS, byPlace };
}

export async function fetchTopStations(limit = 200): Promise<RadioStation[]> {
  try {
    const { stations } = await loadStationsSnapshot();
    if (stations && stations.length > 0) {
      // Return a spread of active stations with valid coordinates
      const withGeo = stations.filter(s => s.geo_lat !== 0 && s.geo_long !== 0);
      return withGeo.slice(0, limit);
    }
  } catch (err) {
    console.warn('Failed getting top stations:', err);
  }
  return CURATED_STATIONS;
}

export async function searchStations(query: string): Promise<RadioStation[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const { stations } = await loadStationsSnapshot();
  return stations
    .filter(s => 
      s.name.toLowerCase().includes(q) || 
      (s.place && s.place.toLowerCase().includes(q)) || 
      (s.country && s.country.toLowerCase().includes(q))
    )
    .slice(0, 30);
}

