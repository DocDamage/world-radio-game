export type CameraCategory = 'street' | 'harbor' | 'beach' | 'skyline' | 'transport';
export type CameraStreamType = 'video' | 'refresh_image' | 'simulated';

export interface WorldCamera {
  id: string;
  name: string;
  city: string;
  country: string;
  category: CameraCategory;
  lat: number;
  lng: number;
  streamType: CameraStreamType;
  streamUrl: string;
  previewUrl: string;
  provider: string;
  sourceUrl: string;
  status: 'live' | 'refreshed' | 'archive' | 'simulated';
  lastUpdated: string;
  allowCapture: boolean;
  supportedMissions: string[]; // e.g. ['photo-correspondent', 'detective-missing-broadcast', 'boat-harbor-run']
}

export const WORLD_CAMERAS: WorldCamera[] = [
  {
    id: 'cam-tokyo-shibuya',
    name: 'Shibuya Scramble Crossing',
    city: 'Tokyo',
    country: 'Japan',
    category: 'street',
    lat: 35.6595,
    lng: 139.7005,
    streamType: 'refresh_image',
    streamUrl: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=1200&q=80',
    previewUrl: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=400&q=70',
    provider: 'Tokyo Metropolitan Public Cam',
    sourceUrl: 'https://shibuya-crossing.tokyo',
    status: 'refreshed',
    lastUpdated: 'Updated 2m ago',
    allowCapture: true,
    supportedMissions: ['photo-correspondent', 'detective-missing-broadcast']
  },
  {
    id: 'cam-paris-eiffel',
    name: 'Eiffel Tower & Pont d\'Iéna',
    city: 'Paris',
    country: 'France',
    category: 'skyline',
    lat: 48.8584,
    lng: 2.2945,
    streamType: 'refresh_image',
    streamUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80',
    previewUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=400&q=70',
    provider: 'Paris City Web Observatory',
    sourceUrl: 'https://paris.fr/webcams',
    status: 'refreshed',
    lastUpdated: 'Updated 1m ago',
    allowCapture: true,
    supportedMissions: ['photo-correspondent', 'detective-missing-broadcast', 'bike-last-mile']
  },
  {
    id: 'cam-nyc-times-square',
    name: 'Times Square Broadway Vista',
    city: 'New York',
    country: 'United States',
    category: 'street',
    lat: 40.7580,
    lng: -73.9855,
    streamType: 'refresh_image',
    streamUrl: 'https://images.unsplash.com/photo-1508873696983-2df57046475a?auto=format&fit=crop&w=1200&q=80',
    previewUrl: 'https://images.unsplash.com/photo-1508873696983-2df57046475a?auto=format&fit=crop&w=400&q=70',
    provider: 'EarthCam Public Network',
    sourceUrl: 'https://earthcam.com',
    status: 'refreshed',
    lastUpdated: 'Updated 4m ago',
    allowCapture: true,
    supportedMissions: ['photo-correspondent', 'detective-missing-broadcast', 'dj-orbit-rooftop']
  },
  {
    id: 'cam-london-tower-bridge',
    name: 'River Thames & Tower Bridge',
    city: 'London',
    country: 'United Kingdom',
    category: 'harbor',
    lat: 51.5055,
    lng: -0.0754,
    streamType: 'refresh_image',
    streamUrl: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1200&q=80',
    previewUrl: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=400&q=70',
    provider: 'Port of London Authority',
    sourceUrl: 'https://pla.co.uk',
    status: 'refreshed',
    lastUpdated: 'Updated 3m ago',
    allowCapture: true,
    supportedMissions: ['boat-harbor-run', 'fishing-field-journal', 'photo-correspondent']
  },
  {
    id: 'cam-venice-grand-canal',
    name: 'Grand Canal & Rialto Basin',
    city: 'Venice',
    country: 'Italy',
    category: 'harbor',
    lat: 45.4380,
    lng: 12.3358,
    streamType: 'refresh_image',
    streamUrl: 'https://images.unsplash.com/photo-1514890547357-a9ee288728e0?auto=format&fit=crop&w=1200&q=80',
    previewUrl: 'https://images.unsplash.com/photo-1514890547357-a9ee288728e0?auto=format&fit=crop&w=400&q=70',
    provider: 'Venice Lagoon Water Authority',
    sourceUrl: 'https://comune.venezia.it',
    status: 'refreshed',
    lastUpdated: 'Updated 5m ago',
    allowCapture: true,
    supportedMissions: ['boat-harbor-run', 'fishing-field-journal', 'photo-correspondent']
  },
  {
    id: 'cam-sydney-harbour',
    name: 'Sydney Opera House & Circular Quay',
    city: 'Sydney',
    country: 'Australia',
    category: 'harbor',
    lat: -33.8568,
    lng: 151.2153,
    streamType: 'refresh_image',
    streamUrl: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=1200&q=80',
    previewUrl: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=400&q=70',
    provider: 'Sydney Harbour Foreshore Authority',
    sourceUrl: 'https://harbourcams.sydney',
    status: 'refreshed',
    lastUpdated: 'Updated 2m ago',
    allowCapture: true,
    supportedMissions: ['boat-harbor-run', 'surf-swell-window', 'photo-correspondent']
  },
  {
    id: 'cam-rio-copacabana',
    name: 'Copacabana Beach Ocean Break',
    city: 'Rio de Janeiro',
    country: 'Brazil',
    category: 'beach',
    lat: -22.9711,
    lng: -43.1822,
    streamType: 'refresh_image',
    streamUrl: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&w=1200&q=80',
    previewUrl: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&w=400&q=70',
    provider: 'Rio Coast Monitoring Cam',
    sourceUrl: 'https://riobeachcams.br',
    status: 'refreshed',
    lastUpdated: 'Updated 1m ago',
    allowCapture: true,
    supportedMissions: ['surf-swell-window', 'photo-correspondent']
  },
  {
    id: 'cam-cairo-nile',
    name: 'Nile Corniche & Gezira Island',
    city: 'Cairo',
    country: 'Egypt',
    category: 'harbor',
    lat: 30.0444,
    lng: 31.2280,
    streamType: 'refresh_image',
    streamUrl: 'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?auto=format&fit=crop&w=1200&q=80',
    previewUrl: 'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?auto=format&fit=crop&w=400&q=70',
    provider: 'Cairo River Authority',
    sourceUrl: 'https://cairo.gov.eg',
    status: 'refreshed',
    lastUpdated: 'Updated 6m ago',
    allowCapture: true,
    supportedMissions: ['boat-harbor-run', 'fishing-field-journal']
  },
  {
    id: 'cam-amsterdam-canals',
    name: 'Prinsengracht Heritage Waterway',
    city: 'Amsterdam',
    country: 'Netherlands',
    category: 'harbor',
    lat: 52.3676,
    lng: 4.8845,
    streamType: 'refresh_image',
    streamUrl: 'https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?auto=format&fit=crop&w=1200&q=80',
    previewUrl: 'https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?auto=format&fit=crop&w=400&q=70',
    provider: 'Amsterdam Waternet Public Feed',
    sourceUrl: 'https://waternet.nl',
    status: 'refreshed',
    lastUpdated: 'Updated 3m ago',
    allowCapture: true,
    supportedMissions: ['boat-harbor-run', 'bike-last-mile', 'photo-correspondent']
  },
  {
    id: 'cam-san-francisco-bay',
    name: 'San Francisco Bay & Golden Gate',
    city: 'San Francisco',
    country: 'United States',
    category: 'skyline',
    lat: 37.8199,
    lng: -122.4783,
    streamType: 'refresh_image',
    streamUrl: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=1200&q=80',
    previewUrl: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=400&q=70',
    provider: 'Bay Area Air & Maritime District',
    sourceUrl: 'https://goldengate.org',
    status: 'refreshed',
    lastUpdated: 'Updated 1m ago',
    allowCapture: true,
    supportedMissions: ['surf-swell-window', 'photo-correspondent', 'hunt-lost-relay']
  }
];

export function getCamerasForCity(cityName: string, countryName?: string): WorldCamera[] {
  const c = (cityName || '').toLowerCase();
  const cn = (countryName || '').toLowerCase();
  return WORLD_CAMERAS.filter(cam => {
    const camCity = cam.city.toLowerCase();
    const camCountry = cam.country.toLowerCase();
    return c.includes(camCity) || camCity.includes(c) || (cn && camCountry.includes(cn));
  });
}

export function getAllCameras(): WorldCamera[] {
  return WORLD_CAMERAS;
}
