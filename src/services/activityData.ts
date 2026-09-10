import type { MarketItem, FishSpecies, LocationEnvironment, EnvironmentType, ActivityMode } from '../types';

export interface ResolvedLocation {
  placeName: string;
  countryName: string;
  lat: number;
  lng: number;
  environment: LocationEnvironment;
  market: { marketName: string; items: MarketItem[] };
  fishSpecies: FishSpecies[];
}

interface CuratedCityRule {
  cityAliases: string[];
  countryFilter?: string[];
  biome: EnvironmentType;
  waterwayName: string | null;
  badge: string;
  description: string;
  activities?: ActivityMode[];
}

// Curated city-specific geography. City matching requires matching the specific city alias,
// NEVER matching country substring alone, so other cities in the same country do not inherit unrelated canals/waterways.
const CURATED_CITY_RULES: CuratedCityRule[] = [
  // River & Canal Cities
  {
    cityAliases: ['paris'],
    countryFilter: ['france'],
    biome: 'river',
    waterwayName: 'Seine River & Canal Saint-Martin',
    badge: '🛶 Historic Seine Riverway',
    description: 'Iconic stone bridges, bookstalls, and tree-lined quays along the Seine.',
    activities: ['bike', 'boat', 'fishing', 'market', 'photo']
  },
  {
    cityAliases: ['london'],
    countryFilter: ['united kingdom', 'uk', 'great britain', 'england'],
    biome: 'river',
    waterwayName: "River Thames & Regent's Canal",
    badge: '🚢 Historic Thames Waterway',
    description: 'Tidal waterway flowing past Tower Bridge and historic docklands.',
    activities: ['bike', 'boat', 'fishing', 'market', 'photo']
  },
  {
    cityAliases: ['amsterdam'],
    countryFilter: ['netherlands', 'holland'],
    biome: 'river',
    waterwayName: 'Prinsengracht & Amstel River Canals',
    badge: '🛶 Historic Ring Canals',
    description: 'Golden Age waterways flanked by gabled merchant townhouses.',
    activities: ['bike', 'boat', 'fishing', 'market', 'photo']
  },
  {
    cityAliases: ['venice', 'venezia'],
    countryFilter: ['italy', 'italia'],
    biome: 'river',
    waterwayName: 'Grand Canal & Venetian Lagoon',
    badge: '🛶 Grand Canal Waterway',
    description: 'Gondolas and historic waterbuses gliding past Gothic palazzos.',
    activities: ['boat', 'fishing', 'market', 'photo']
  },
  {
    cityAliases: ['cairo'],
    countryFilter: ['egypt'],
    biome: 'river',
    waterwayName: 'The River Nile',
    badge: '⛵ Historic Nile Riverway',
    description: 'The legendary river flowing through the heart of Cairo under felucca sails.',
    activities: ['bike', 'boat', 'fishing', 'market', 'photo']
  },
  {
    cityAliases: ['bangkok'],
    countryFilter: ['thailand'],
    biome: 'river',
    waterwayName: 'Chao Phraya River & Khlongs',
    badge: '🚤 Chao Phraya Waterway',
    description: 'Vibrant long-tail boats and floating canal routes beside golden temples.',
    activities: ['bike', 'boat', 'fishing', 'market', 'photo']
  },
  {
    cityAliases: ['vienna', 'wien'],
    countryFilter: ['austria'],
    biome: 'river',
    waterwayName: 'Danube River & Canal',
    badge: '🚢 Danube River Promenade',
    description: 'Majestic central European river lined with classical architecture.',
    activities: ['bike', 'boat', 'fishing', 'market', 'photo']
  },
  {
    cityAliases: ['prague', 'praha'],
    countryFilter: ['czech', 'czechia'],
    biome: 'river',
    waterwayName: 'Vltava River & Charles Bridge',
    badge: '🛶 Vltava Riverway',
    description: 'Picturesque river coursing under medieval stone arch bridges.',
    activities: ['bike', 'boat', 'fishing', 'market', 'photo']
  },
  {
    cityAliases: ['seoul'],
    countryFilter: ['korea', 'south korea'],
    biome: 'river',
    waterwayName: 'Hangang (Han River)',
    badge: '🚢 Han River Promenade',
    description: 'Broad waterway flanked by riverside parks and illuminated bridges.',
    activities: ['bike', 'boat', 'fishing', 'market', 'photo']
  },
  {
    cityAliases: ['rome', 'roma'],
    countryFilter: ['italy', 'italia'],
    biome: 'river',
    waterwayName: 'Tiber River',
    badge: '🛶 Tiber Riverway',
    description: 'Ancient river meandering through classical marble and stone bridges.',
    activities: ['bike', 'boat', 'fishing', 'market', 'photo']
  },

  // Coastal / Maritime Harbor Cities
  {
    cityAliases: ['tokyo', 'yokohama'],
    countryFilter: ['japan'],
    biome: 'coastal',
    waterwayName: 'Tokyo Bay & Sumida River',
    badge: '🌊 Tokyo Bay Maritime District',
    description: 'Futuristic waterfront skyline, container ports, and ocean breezes.',
    activities: ['surf', 'bike', 'boat', 'fishing', 'market', 'photo']
  },
  {
    cityAliases: ['sydney'],
    countryFilter: ['australia'],
    biome: 'coastal',
    waterwayName: 'Sydney Harbour & Pacific Coast',
    badge: '🌊 Sydney Harbour Port',
    description: 'World-famous harbor with sparkling blue bays and ferry lanes.',
    activities: ['surf', 'bike', 'boat', 'fishing', 'market', 'photo']
  },
  {
    cityAliases: ['rio de janeiro', 'rio'],
    countryFilter: ['brazil', 'brasil'],
    biome: 'coastal',
    waterwayName: 'Guanabara Bay & Copacabana',
    badge: '🌊 Guanabara Coastal Waters',
    description: 'Dramatic tropical coast flanked by Sugarloaf Mountain and ocean surf.',
    activities: ['surf', 'bike', 'boat', 'fishing', 'market', 'photo']
  },
  {
    cityAliases: ['new york', 'nyc', 'manhattan', 'brooklyn'],
    countryFilter: ['united states', 'usa', 'us'],
    biome: 'coastal',
    waterwayName: 'Hudson River & New York Harbor',
    badge: '🌊 New York Maritime Harbor',
    description: 'Bustling harbor ferries, tugboats, and skyline reflections.',
    activities: ['bike', 'boat', 'fishing', 'market', 'photo']
  },
  {
    cityAliases: ['san francisco'],
    countryFilter: ['united states', 'usa', 'us'],
    biome: 'coastal',
    waterwayName: 'San Francisco Bay & Pacific Coast',
    badge: '🌊 Pacific Bay Channel',
    description: 'Golden Gate fog, marine piers, and deep ocean swells.',
    activities: ['surf', 'bike', 'boat', 'fishing', 'market', 'photo']
  },
  {
    cityAliases: ['lisbon', 'lisboa'],
    countryFilter: ['portugal'],
    biome: 'coastal',
    waterwayName: 'Tagus River Estuary & Atlantic',
    badge: '🌊 Tagus Estuary & Ocean',
    description: 'Sunlit maritime river mouth opening into the wide Atlantic Ocean.',
    activities: ['surf', 'bike', 'boat', 'fishing', 'market', 'photo']
  },
  {
    cityAliases: ['hong kong'],
    biome: 'coastal',
    waterwayName: 'Victoria Harbour',
    badge: '🌊 Victoria Harbour Passage',
    description: 'Star Ferries and junk boats amidst towering harbor skyscrapers.',
    activities: ['bike', 'boat', 'fishing', 'market', 'photo']
  },
  {
    cityAliases: ['cape town'],
    countryFilter: ['south africa'],
    biome: 'coastal',
    waterwayName: 'Table Bay & Atlantic Seaboard',
    badge: '🌊 Table Bay Maritime Coast',
    description: 'Rugged ocean coastline meeting the iconic Table Mountain backdrop.',
    activities: ['surf', 'bike', 'boat', 'fishing', 'market', 'photo']
  },
  {
    cityAliases: ['singapore'],
    biome: 'coastal',
    waterwayName: 'Singapore Strait & Marina Bay',
    badge: '🌊 Marina Bay Maritime Port',
    description: 'Global crossroads of shipping lanes and futuristic coastal reservoirs.',
    activities: ['bike', 'boat', 'fishing', 'market', 'photo']
  },
  {
    cityAliases: ['barcelona'],
    countryFilter: ['spain', 'catalonia'],
    biome: 'coastal',
    waterwayName: 'Mediterranean Sea Port',
    badge: '🌊 Mediterranean Port',
    description: 'Golden beaches, marina boardwalks, and deep blue Mediterranean waters.',
    activities: ['surf', 'bike', 'boat', 'fishing', 'market', 'photo']
  },
  {
    cityAliases: ['miami'],
    countryFilter: ['united states', 'usa', 'us'],
    biome: 'coastal',
    waterwayName: 'Biscayne Bay & Atlantic Ocean',
    badge: '🌊 Biscayne Bay Waters',
    description: 'Turquoise channels, speedboats, and neon tropical coastlines.',
    activities: ['surf', 'bike', 'boat', 'fishing', 'market', 'photo']
  },
  {
    cityAliases: ['honolulu'],
    biome: 'coastal',
    waterwayName: 'Pacific Ocean & Waikiki Reef',
    badge: '🌺 Pacific Reef Coast',
    description: 'Crystal ocean surf, outrigger canoes, and volcanic island shores.',
    activities: ['surf', 'bike', 'boat', 'fishing', 'market', 'photo']
  },

  // Desert / Arid Cities
  {
    cityAliases: ['dubai', 'abu dhabi'],
    countryFilter: ['united arab emirates', 'uae'],
    biome: 'desert',
    waterwayName: null,
    badge: '🏜️ Arabian Desert & Oasis',
    description: 'Gleaming hyper-modern skyline rising out of golden Arabian dunes.',
    activities: ['buggy', 'bike', 'market', 'photo']
  },
  {
    cityAliases: ['riyadh', 'jeddah'],
    countryFilter: ['saudi arabia'],
    biome: 'desert',
    waterwayName: null,
    badge: '🏜️ Najd Desert Dunes',
    description: 'Vast rolling sand seas and historic desert trading crossroads.',
    activities: ['buggy', 'bike', 'market', 'photo']
  },
  {
    cityAliases: ['marrakech'],
    countryFilter: ['morocco'],
    biome: 'desert',
    waterwayName: null,
    badge: '🏜️ Atlas Foothill Oasis',
    description: 'Ochre clay ramparts, date palms, and camel caravan gates.',
    activities: ['buggy', 'bike', 'market', 'photo']
  },
  {
    cityAliases: ['phoenix', 'las vegas'],
    countryFilter: ['united states', 'usa', 'us'],
    biome: 'desert',
    waterwayName: null,
    badge: '🏜️ Sonoran & Mojave Desert',
    description: 'Sun-baked canyon roads, giant saguaro cacti, and desert highways.',
    activities: ['buggy', 'bike', 'market', 'photo']
  },
  {
    cityAliases: ['doha', 'kuwait city', 'manama'],
    biome: 'desert',
    waterwayName: null,
    badge: '🏜️ Gulf Desert Sands',
    description: 'Wind-sculpted sand dunes and sparkling coastal oasis promenades.',
    activities: ['buggy', 'bike', 'market', 'photo']
  },

  // Alpine / Mountain Cities
  {
    cityAliases: ['denver', 'salt lake city', 'aspen', 'boulder'],
    countryFilter: ['united states', 'usa', 'us'],
    biome: 'alpine',
    waterwayName: 'Clear Creek Mountain Stream',
    badge: '🏔️ Rocky Mountain Foothills',
    description: 'Mile-high alpine air, pine-scented canyons, and snowy peaks.',
    activities: ['ski', 'bike', 'fishing', 'market', 'photo']
  },
  {
    cityAliases: ['innsbruck', 'salzburg'],
    countryFilter: ['austria'],
    biome: 'alpine',
    waterwayName: 'Inn River Glacier Stream',
    badge: '🏔️ Austrian Alps',
    description: 'Crisp mountain valleys, chalets, and roaring glacial torrents.',
    activities: ['ski', 'bike', 'fishing', 'market', 'photo']
  },
  {
    cityAliases: ['zurich', 'bern', 'geneva', 'zermatt'],
    countryFilter: ['switzerland'],
    biome: 'alpine',
    waterwayName: 'Alpine Glacier River',
    badge: '🏔️ Swiss Alps Foothills',
    description: 'Alpine chalets, pristine mountain streams, and snowy peaks.',
    activities: ['ski', 'bike', 'fishing', 'market', 'photo']
  },
  {
    cityAliases: ['kathmandu'],
    countryFilter: ['nepal'],
    biome: 'alpine',
    waterwayName: 'Bagmati Valley Stream',
    badge: '🏔️ Himalayan Valley',
    description: 'High Himalayan plateau crowned by ancient prayer-flag mountain passes.',
    activities: ['ski', 'bike', 'fishing', 'market', 'photo']
  },
  {
    cityAliases: ['santiago', 'la paz', 'quito', 'bogota'],
    biome: 'alpine',
    waterwayName: 'Andean Mountain Stream',
    badge: '🏔️ High Andean Ridge',
    description: 'Towering Andean summits guarding high-altitude historic avenues.',
    activities: ['ski', 'bike', 'fishing', 'market', 'photo']
  },

  // Inland Metropolises
  {
    cityAliases: ['madrid'],
    countryFilter: ['spain'],
    biome: 'urban',
    waterwayName: null,
    badge: '🏙️ Iberian Grand Boulevard',
    description: 'Grand stone plazas, rooftop terraces, and lively boulevard cafes.',
    activities: ['dj', 'bike', 'market', 'photo']
  },
  {
    cityAliases: ['berlin'],
    countryFilter: ['germany'],
    biome: 'urban',
    waterwayName: 'Spree River Walk',
    badge: '🏙️ Berlin Urban Metropolis',
    description: 'Vibrant underground club culture, street murals, and wide avenues.',
    activities: ['dj', 'bike', 'market', 'photo']
  },
  {
    cityAliases: ['mexico city', 'cdmx'],
    countryFilter: ['mexico'],
    biome: 'urban',
    waterwayName: null,
    badge: '🏙️ Valle de México Megacity',
    description: 'High-altitude megalopolis bursting with street music, food stalls, and colonial plazas.',
    activities: ['dj', 'bike', 'market', 'photo']
  },
  {
    cityAliases: ['chicago'],
    countryFilter: ['united states', 'usa', 'us'],
    biome: 'urban',
    waterwayName: 'Chicago River Canal & Lakefront',
    badge: '🏙️ Windy City Urban Canyon',
    description: 'Sky-scraping architectural canyons, bustling avenues, and transit lines.',
    activities: ['dj', 'bike', 'boat', 'market', 'photo']
  },
  {
    cityAliases: ['sao paulo', 'são paulo'],
    countryFilter: ['brazil', 'brasil'],
    biome: 'urban',
    waterwayName: null,
    badge: '🏙️ Paulista Concrete Metropolis',
    description: 'Endless sea of towers, neon street art, and legendary nightlife.',
    activities: ['dj', 'bike', 'market', 'photo']
  },
  {
    cityAliases: ['johannesburg', 'joburg'],
    countryFilter: ['south africa'],
    biome: 'urban',
    waterwayName: null,
    badge: '🏙️ Highveld Metropolis',
    description: 'Gold Reef highlands, jacaranda avenues, and bustling rooftop vibes.',
    activities: ['dj', 'bike', 'market', 'photo']
  }
];

function cityMatchesRule(rule: CuratedCityRule, placeName: string, countryName: string): boolean {
  const p = (placeName || '').trim().toLowerCase();
  const c = (countryName || '').trim().toLowerCase();

  // The place name must match one of the city aliases (exact match or alias as discrete word)
  const matchesCity = rule.cityAliases.some(alias => {
    if (p === alias) return true;
    const regex = new RegExp(`(^|\\b)${alias}(\\b|$)`, 'i');
    return regex.test(p);
  });

  if (!matchesCity) return false;

  // If the rule specifies country filters, country must also match
  if (rule.countryFilter && rule.countryFilter.length > 0) {
    return rule.countryFilter.some(cf => c.includes(cf) || cf.includes(c));
  }

  return true;
}

export function resolveLocationEnvironment(
  placeName: string,
  countryName: string,
  lat: number = 0,
  lng: number = 0
): LocationEnvironment {
  const p = (placeName || '').trim();
  const c = (countryName || '').trim();

  // 1. Check curated exact city rules first
  for (const rule of CURATED_CITY_RULES) {
    if (cityMatchesRule(rule, p, c)) {
      return {
        biome: rule.biome,
        badge: rule.badge,
        waterwayName: rule.waterwayName,
        description: rule.description,
        availableActivities: rule.activities || getDefaultActivities(rule.biome)
      };
    }
  }

  // 2. Geographic and elevation heuristics
  // High mountain areas (Rockies, Andes, Himalayas, European Alps)
  const isHighAltitude =
    (lat > 25 && lat < 38 && lng > 68 && lng < 95) || // Himalayas
    (lat > 35 && lat < 45 && lng > -112 && lng < -104) || // Rockies
    (lat > 45 && lat < 48 && lng > 6 && lng < 14) || // Alps
    (lat > -45 && lat < 10 && lng > -78 && lng < -65); // Andes

  if (isHighAltitude) {
    return {
      biome: 'alpine',
      badge: '🏔️ Mountain Highlands',
      waterwayName: `${p || 'Alpine'} Mountain Stream`,
      description: `High elevation mountain valley near ${p || 'the summit'}, ${c}.`,
      availableActivities: ['ski', 'bike', 'fishing', 'market', 'photo']
    };
  }

  // Desert belt
  const isDesertBelt =
    (lat > 15 && lat < 32 && lng > -15 && lng < 58) || // Sahara & Arabia
    (lat > -30 && lat < -20 && lng > 115 && lng < 140); // Australian Outback

  if (isDesertBelt) {
    return {
      biome: 'desert',
      badge: '🏜️ Arid Sands & Oasis',
      waterwayName: null,
      description: `Sun-drenched desert terrain and oasis settlements in ${c}.`,
      availableActivities: ['buggy', 'bike', 'market', 'photo']
    };
  }

  // Coastal / Island detection
  const islandCountries = ['japan', 'indonesia', 'philippines', 'new zealand', 'iceland', 'madagascar', 'cuba', 'jamaica', 'ireland', 'fiji', 'hawaii', 'caribbean', 'bahamas'];
  const cLower = c.toLowerCase();
  if (islandCountries.some(i => cLower.includes(i))) {
    return {
      biome: 'coastal',
      badge: '🌊 Island Maritime Coast',
      waterwayName: `${p || 'Coastal'} Seaboard Waters`,
      description: `Island coastline and ocean waters surrounding ${p || c}.`,
      availableActivities: ['surf', 'bike', 'boat', 'fishing', 'market', 'photo']
    };
  }

  // Default fallback for inland cities
  return {
    biome: 'urban',
    badge: '🏙️ City Street Grid',
    waterwayName: null,
    description: `Urban thoroughfares and cultural avenues of ${p || 'this city'}, ${c}.`,
    availableActivities: ['dj', 'bike', 'market', 'photo']
  };
}

function getDefaultActivities(biome: EnvironmentType): ActivityMode[] {
  switch (biome) {
    case 'coastal':
      return ['surf', 'bike', 'boat', 'fishing', 'market', 'photo'];
    case 'river':
      return ['bike', 'boat', 'fishing', 'market', 'photo'];
    case 'desert':
      return ['buggy', 'bike', 'market', 'photo'];
    case 'alpine':
      return ['ski', 'bike', 'fishing', 'market', 'photo'];
    case 'urban':
    default:
      return ['dj', 'bike', 'market', 'photo'];
  }
}

export function resolveCompleteLocation(
  placeName: string,
  countryName: string,
  lat: number = 0,
  lng: number = 0
): ResolvedLocation {
  const env = resolveLocationEnvironment(placeName, countryName, lat, lng);
  const market = getCityMarketItems(placeName, countryName, env.biome);
  const fish = getRegionalFishSpecies(countryName, env.biome);

  return {
    placeName,
    countryName,
    lat,
    lng,
    environment: env,
    market,
    fishSpecies: fish
  };
}

// Regional and biome-tailored fish species
export function getRegionalFishSpecies(countryName: string, biome: EnvironmentType = 'river'): FishSpecies[] {
  const c = (countryName || '').toLowerCase();

  // Coastal Saltwater species
  if (biome === 'coastal') {
    if (c.includes('japan')) {
      return [
        { name: 'Tokyo Bay Sea Bass (Suzuki)', icon: '🐟', rarity: 'Common', minWeight: 1.2, maxWeight: 4.8, funFact: 'Fierce coastal predator prized in Tokyo Edomae sushi.' },
        { name: 'Red Sea Bream (Tai)', icon: '🐠', rarity: 'Rare', minWeight: 2.0, maxWeight: 7.5, funFact: 'Auspicious celebratory fish symbolizing prosperity and fortune.' },
        { name: 'Pacific Bluefin Tuna', icon: '🦈', rarity: 'Legendary', minWeight: 45.0, maxWeight: 140.0, funFact: 'Monarch of ocean currents, capable of bursts over 70 km/h.' }
      ];
    }

    if (c.includes('australia') || c.includes('zealand')) {
      return [
        { name: 'Sydney Harbour Yellowtail Kingfish', icon: '🐟', rarity: 'Common', minWeight: 2.0, maxWeight: 8.0, funFact: 'Torpedo-shaped predator stalking harbor ferry wharves.' },
        { name: 'Barramundi Silver Stalker', icon: '🐠', rarity: 'Rare', minWeight: 4.0, maxWeight: 16.0, funFact: 'Famous fighting sportfish capable of massive airborne headshakes.' },
        { name: 'Great Coral Black Marlin', icon: '🦈', rarity: 'Legendary', minWeight: 60.0, maxWeight: 200.0, funFact: 'Legend of the outer reef depths with needle bill and sail fin.' }
      ];
    }

    return [
      { name: 'Coastal Striped Bass', icon: '🐟', rarity: 'Common', minWeight: 1.5, maxWeight: 6.0, funFact: 'Hunts along rocky jetty piers and crashing shoreline surf.' },
      { name: 'Deep Reef Red Snapper', icon: '🐠', rarity: 'Rare', minWeight: 3.2, maxWeight: 11.0, funFact: 'Vibrant crimson predator dwelling around offshore shipwrecks.' },
      { name: 'Atlantic Blue Marlin', icon: '🦈', rarity: 'Legendary', minWeight: 50.0, maxWeight: 160.0, funFact: 'High-speed ocean titan renowned for aerial tail-walk acrobatics.' }
    ];
  }

  // Alpine Mountain Stream species
  if (biome === 'alpine') {
    return [
      { name: 'Alpine Brook Char', icon: '🐟', rarity: 'Common', minWeight: 0.3, maxWeight: 1.2, funFact: 'Spotted jewel found in crystal-clear glacier-fed streams.' },
      { name: 'Rainbow Torrent Trout', icon: '🐠', rarity: 'Rare', minWeight: 1.4, maxWeight: 4.5, funFact: 'Shimmers with an iridescent pink stripe in roaring mountain rapids.' },
      { name: 'Golden Huchen (Danube Salmon)', icon: '🦈', rarity: 'Legendary', minWeight: 8.0, maxWeight: 25.0, funFact: 'Elusive apex predator of pristine European mountain rivers.' }
    ];
  }

  // River & Canal species (Default)
  if (c.includes('france') || c.includes('germany') || c.includes('kingdom') || c.includes('netherlands')) {
    return [
      { name: 'Seine River Perch', icon: '🐟', rarity: 'Common', minWeight: 0.5, maxWeight: 1.8, funFact: 'Striped freshwater stalker found beneath historic stone bridge arches.' },
      { name: 'European River Pike', icon: '🐠', rarity: 'Rare', minWeight: 3.5, maxWeight: 12.0, funFact: 'Camouflaged ambush hunter with sharp teeth lurking in canal weeds.' },
      { name: 'Giant Wels Catfish', icon: '🦈', rarity: 'Legendary', minWeight: 20.0, maxWeight: 75.0, funFact: 'River titan growing to enormous lengths in deep European riverbeds.' }
    ];
  }

  if (c.includes('brazil') || c.includes('amazon')) {
    return [
      { name: 'Peacock Bass (Tucunaré)', icon: '🐟', rarity: 'Common', minWeight: 1.5, maxWeight: 6.5, funFact: 'Brilliantly colored cichlid with an eye-spot marking on its tail.' },
      { name: 'Golden River Dorado', icon: '🐠', rarity: 'Rare', minWeight: 4.0, maxWeight: 14.0, funFact: 'Acclaimed river tiger famous for explosive acrobatic jumps.' },
      { name: 'Giant Pirarucu (Arapaima)', icon: '🦈', rarity: 'Legendary', minWeight: 40.0, maxWeight: 150.0, funFact: 'Prehistoric armored leviathan that breathes atmospheric air.' }
    ];
  }

  // Universal freshwater species
  return [
    { name: 'Mirror River Carp', icon: '🐟', rarity: 'Common', minWeight: 1.2, maxWeight: 5.5, funFact: 'Inquisitive bottom feeder found across world waterways.' },
    { name: 'Silver River Zander', icon: '🐠', rarity: 'Rare', minWeight: 2.2, maxWeight: 7.0, funFact: 'Keen night-vision hunter stalking river deeps.' },
    { name: 'Mythic Ancient Sturgeon', icon: '🦈', rarity: 'Legendary', minWeight: 25.0, maxWeight: 90.0, funFact: 'Living dinosaur cruising river channels for over a century.' }
  ];
}

// Curated authentic market items per region & biome
export function getCityMarketItems(
  cityName: string,
  countryName: string,
  biome: EnvironmentType = 'urban'
): { marketName: string; items: MarketItem[] } {
  const city = (cityName || '').toLowerCase();
  const country = (countryName || '').toLowerCase();

  // Desert Souks
  if (biome === 'desert' || city.includes('dubai') || city.includes('riyadh') || city.includes('marrakech')) {
    return {
      marketName: 'Grand Spice & Gold Souk',
      items: [
        { id: 'desert-dates', name: 'Royal Medjool Dates & Pistachios', category: 'food', icon: '🌴', priceCoins: 25, description: 'Sun-ripened organic desert dates stuffed with roasted nuts.' },
        { id: 'desert-tea', name: 'Moroccan Fresh Mint Tea & Glass', category: 'food', icon: '🫖', priceCoins: 20, description: 'Fragrant green gunpowder tea steeped with fresh spearmint leaves.' },
        { id: 'desert-oud', name: 'Smoked Agarwood Oud Perfume', category: 'souvenir', icon: '🏺', priceCoins: 110, description: 'Precious resinous oil infused with amber and desert cedar.' },
        { id: 'desert-vinyl', name: 'Classic Umm Kulthum Tarab LP', category: 'vinyl', icon: '💿', priceCoins: 130, description: 'Legendary Arabic orchestral broadcast recorded live in Cairo.' }
      ]
    };
  }

  // Alpine Chalet Markets
  if (biome === 'alpine' || city.includes('zurich') || city.includes('innsbruck') || city.includes('denver')) {
    return {
      marketName: 'Alpine Chalet & Artisan Market',
      items: [
        { id: 'alpine-cheese', name: 'Aged Cave Gruyère Wedge', category: 'food', icon: '🧀', priceCoins: 30, description: 'Nutty, savory mountain cheese aged 18 months in stone caves.' },
        { id: 'alpine-cider', name: 'Spiced Mountain Berry Glühwein', category: 'food', icon: '🍷', priceCoins: 25, description: 'Warming spiced drink infused with cinnamon, cloves, and orange.' },
        { id: 'alpine-bell', name: 'Hand-Forged Brass Cowbell', category: 'souvenir', icon: '🔔', priceCoins: 65, description: 'Traditional mountain artisan bell with embroidered leather strap.' },
        { id: 'alpine-vinyl', name: 'Swiss Mountain Horn & Yodel 45', category: 'vinyl', icon: '💿', priceCoins: 95, description: 'Historic acoustic analog recordings echoing across alpine peaks.' }
      ]
    };
  }

  // Tokyo
  if (city.includes('tokyo') || country.includes('japan')) {
    return {
      marketName: 'Tsukiji & Shibuya Street Bazaar',
      items: [
        { id: 'tokyo-ramen', name: 'Tonkotsu Ramen Bowl', category: 'food', icon: '🍜', priceCoins: 40, description: 'Rich steaming pork broth with chashu and bamboo shoots.' },
        { id: 'tokyo-dango', name: 'Hanami Matcha Dango', category: 'food', icon: '🍡', priceCoins: 20, description: 'Sweet chewy rice dumplings dipped in green tea glaze.' },
        { id: 'tokyo-vinyl', name: 'City Pop 1984 Vinyl LP', category: 'vinyl', icon: '💿', priceCoins: 120, description: 'Rare Shibuya-kei analog record found in an alleyway shop.' },
        { id: 'tokyo-daruma', name: 'Lucky Red Daruma Doll', category: 'souvenir', icon: '🏮', priceCoins: 65, description: 'Traditional papier-mâché talisman for perseverance and fortune.' }
      ]
    };
  }

  // Paris
  if (city.includes('paris') || country.includes('france')) {
    return {
      marketName: 'Marché aux Puces de Saint-Ouen',
      items: [
        { id: 'paris-croissant', name: 'Artisan Butter Croissant', category: 'food', icon: '🥐', priceCoins: 25, description: 'Golden flaky layers baked fresh this morning near the Seine.' },
        { id: 'paris-macaron', name: 'Pistachio & Rose Macarons', category: 'food', icon: '🧁', priceCoins: 35, description: 'Delicate Parisian meringue pastries filled with buttercream.' },
        { id: 'paris-vinyl', name: 'Gainsbourg Chanson 45 RPM', category: 'vinyl', icon: '💿', priceCoins: 110, description: 'Vintage French chanson record dug from a riverside bouquiniste stall.' },
        { id: 'paris-beret', name: 'Wool Montmartre Beret', category: 'souvenir', icon: '🎨', priceCoins: 75, description: 'Classic Parisian artist beret woven in pure black wool.' }
      ]
    };
  }

  // London
  if (city.includes('london') || country.includes('kingdom')) {
    return {
      marketName: 'Borough Market & Portobello Crates',
      items: [
        { id: 'london-fishchips', name: 'Crispy Fish & Chips', category: 'food', icon: '🍟', priceCoins: 45, description: 'Battered haddock with chunky chips wrapped in paper with malt vinegar.' },
        { id: 'london-tea', name: 'Earl Grey Royal Tea Tin', category: 'food', icon: '🫖', priceCoins: 30, description: 'Fragrant black tea infused with natural bergamot oil.' },
        { id: 'london-vinyl', name: 'Soho Punk 7-inch Single', category: 'vinyl', icon: '💿', priceCoins: 105, description: 'Original 1977 pressing recorded in a damp basement studio in Soho.' },
        { id: 'london-bus', name: 'Die-cast Red Routemaster Bus', category: 'souvenir', icon: '🚌', priceCoins: 60, description: 'Classic double-decker bus miniature with working wheels.' }
      ]
    };
  }

  // New York
  if (city.includes('new york') || country.includes('united states')) {
    return {
      marketName: 'Greenwich Village Flea & Deli',
      items: [
        { id: 'ny-bagel', name: 'Smoked Salmon Everything Bagel', category: 'food', icon: '🥯', priceCoins: 35, description: 'Toasted kettle-boiled bagel with cream cheese, lox, and capers.' },
        { id: 'ny-pastrami', name: 'Warm Pastrami on Rye', category: 'food', icon: '🥪', priceCoins: 55, description: 'Cured spiced beef piled high with spicy brown mustard.' },
        { id: 'ny-vinyl', name: 'Blue Note Hard Bop LP', category: 'vinyl', icon: '💿', priceCoins: 130, description: 'Sensational brass grooves recorded late night at Rudy Van Gelder studio.' },
        { id: 'ny-cab', name: 'Vintage Yellow Taxi Model', category: 'souvenir', icon: '🚕', priceCoins: 45, description: 'Iconic Checker Cab model with working doors and headlights.' }
      ]
    };
  }

  // Universal fallback for any other city worldwide
  return {
    marketName: `${cityName || 'Local'} Travelers Market`,
    items: [
      { id: `${cityName}-streetfood`, name: `Authentic ${cityName} Specialty`, category: 'food', icon: '🍲', priceCoins: 30, description: `Locally celebrated homecooked dish from the street stalls of ${cityName}.` },
      { id: `${cityName}-dessert`, name: `Handmade Sweet Delicacy`, category: 'food', icon: '🍯', priceCoins: 20, description: `Traditional confection crafted by neighborhood bakers in ${countryName}.` },
      { id: `${cityName}-vinyl`, name: `${cityName} Heritage Broadcast LP`, category: 'vinyl', icon: '💿', priceCoins: 90, description: `Pressed recording of local musicians playing regional folklore tunes.` },
      { id: `${cityName}-keepsake`, name: `Handcrafted ${countryName} Keepsake`, category: 'souvenir', icon: '🏺', priceCoins: 50, description: `Carved artisanal decorative souvenir commemorating your voyage here.` }
    ]
  };
}
