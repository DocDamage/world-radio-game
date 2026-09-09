import type { MarketItem, FishSpecies, LocationEnvironment, EnvironmentType, ActivityMode } from '../types';

// Curated list of known major waterways and geography
interface CityGeoRule {
  keywords: string[];
  biome: EnvironmentType;
  waterwayName: string | null;
  badge: string;
  description: string;
}

const CITY_GEO_RULES: CityGeoRule[] = [
  // River & Canal Cities
  {
    keywords: ['paris', 'france'],
    biome: 'river',
    waterwayName: 'Seine River & Canal Saint-Martin',
    badge: '🛶 Historic Seine Riverway',
    description: 'Iconic stone bridges, bookstalls, and tree-lined quays along the Seine.'
  },
  {
    keywords: ['london', 'united kingdom', 'uk', 'thames'],
    biome: 'river',
    waterwayName: 'River Thames & Regent\'s Canal',
    badge: '🚢 Historic Thames Waterway',
    description: 'Tidal waterway flowing past Tower Bridge and historic docklands.'
  },
  {
    keywords: ['amsterdam', 'netherlands', 'holland'],
    biome: 'river',
    waterwayName: 'Prinsengracht & Amstel River Canals',
    badge: '🛶 Historic Ring Canals',
    description: 'Golden Age waterways flanked by gabled merchant townhouses.'
  },
  {
    keywords: ['venice', 'venezia', 'italy'],
    biome: 'river',
    waterwayName: 'Grand Canal & Venetian Lagoon',
    badge: '🛶 Grand Canal Waterway',
    description: 'Gondolas and historic waterbuses gliding past Gothic palazzos.'
  },
  {
    keywords: ['cairo', 'egypt'],
    biome: 'river',
    waterwayName: 'The River Nile',
    badge: '⛵ Historic Nile Riverway',
    description: 'The legendary river flowing through the heart of Cairo under felucca sails.'
  },
  {
    keywords: ['bangkok', 'thailand'],
    biome: 'river',
    waterwayName: 'Chao Phraya River & Khlongs',
    badge: '🚤 Chao Phraya Waterway',
    description: 'Vibrant long-tail boats and floating canal routes beside golden temples.'
  },
  {
    keywords: ['vienna', 'austria', 'danube'],
    biome: 'river',
    waterwayName: 'Danube River & Canal',
    badge: '🚢 Danube River Promenade',
    description: 'Majestic central European river lined with classical architecture.'
  },
  {
    keywords: ['prague', 'czech', 'vltava'],
    biome: 'river',
    waterwayName: 'Vltava River & Charles Bridge',
    badge: '🛶 Vltava Riverway',
    description: 'Picturesque river coursing under medieval stone arch bridges.'
  },
  {
    keywords: ['seoul', 'korea', 'han river'],
    biome: 'river',
    waterwayName: 'Hangang (Han River)',
    badge: '🚢 Han River Promenade',
    description: 'Broad waterway flanked by riverside parks and illuminated bridges.'
  },
  {
    keywords: ['rome', 'roma', 'tiber'],
    biome: 'river',
    waterwayName: 'Tiber River',
    badge: '🛶 Tiber Riverway',
    description: 'Ancient river meandering through classical marble and stone bridges.'
  },

  // Coastal / Maritime Harbor Cities
  {
    keywords: ['tokyo', 'japan', 'yokohama'],
    biome: 'coastal',
    waterwayName: 'Tokyo Bay & Sumida River',
    badge: '🌊 Tokyo Bay Maritime District',
    description: 'Futuristic waterfront skyline, container ports, and ocean breezes.'
  },
  {
    keywords: ['sydney', 'australia'],
    biome: 'coastal',
    waterwayName: 'Sydney Harbour & Pacific Coast',
    badge: '🌊 Sydney Harbour Port',
    description: 'World-famous harbor with sparkling blue bays and ferry lanes.'
  },
  {
    keywords: ['rio de janeiro', 'rio', 'brazil', 'brasil'],
    biome: 'coastal',
    waterwayName: 'Guanabara Bay & Copacabana',
    badge: '🌊 Guanabara Coastal Waters',
    description: 'Dramatic tropical coast flanked by Sugarloaf Mountain and ocean surf.'
  },
  {
    keywords: ['new york', 'nyc', 'manhattan', 'brooklyn'],
    biome: 'coastal',
    waterwayName: 'Hudson River & New York Harbor',
    badge: '🌊 New York Maritime Harbor',
    description: 'Bustling harbor ferries, tugboats, and skyline reflections.'
  },
  {
    keywords: ['san francisco', 'sf', 'california'],
    biome: 'coastal',
    waterwayName: 'San Francisco Bay & Pacific Coast',
    badge: '🌊 Pacific Bay Channel',
    description: 'Golden Gate fog, marine piers, and deep ocean swells.'
  },
  {
    keywords: ['lisbon', 'lisboa', 'portugal'],
    biome: 'coastal',
    waterwayName: 'Tagus River Estuary & Atlantic',
    badge: '🌊 Tagus Estuary & Ocean',
    description: 'Sunlit maritime river mouth opening into the wide Atlantic Ocean.'
  },
  {
    keywords: ['hong kong', 'hk'],
    biome: 'coastal',
    waterwayName: 'Victoria Harbour',
    badge: '🌊 Victoria Harbour Passage',
    description: 'Star Ferries and junk boats amidst towering harbor skyscrapers.'
  },
  {
    keywords: ['cape town', 'south africa'],
    biome: 'coastal',
    waterwayName: 'Table Bay & Atlantic Seaboard',
    badge: '🌊 Table Bay Maritime Coast',
    description: 'Rugged ocean coastline meeting the iconic Table Mountain backdrop.'
  },
  {
    keywords: ['singapore'],
    biome: 'coastal',
    waterwayName: 'Singapore Strait & Marina Bay',
    badge: '🌊 Marina Bay Maritime Port',
    description: 'Global crossroads of shipping lanes and futuristic coastal reservoirs.'
  },
  {
    keywords: ['barcelona', 'catalonia'],
    biome: 'coastal',
    waterwayName: 'Mediterranean Sea Port',
    badge: '🌊 Mediterranean Port',
    description: 'Golden beaches, marina boardwalks, and deep blue Mediterranean waters.'
  },
  {
    keywords: ['miami', 'florida'],
    biome: 'coastal',
    waterwayName: 'Biscayne Bay & Atlantic Ocean',
    badge: '🌊 Biscayne Bay Waters',
    description: 'Turquoise channels, speedboats, and neon tropical coastlines.'
  },
  {
    keywords: ['honolulu', 'hawaii'],
    biome: 'coastal',
    waterwayName: 'Pacific Ocean & Waikiki Reef',
    badge: '🌺 Pacific Reef Coast',
    description: 'Crystal ocean surf, outrigger canoes, and volcanic island shores.'
  },

  // Desert / Arid Cities
  {
    keywords: ['dubai', 'abu dhabi', 'united arab emirates', 'uae'],
    biome: 'desert',
    waterwayName: null,
    badge: '🏜️ Arabian Desert & Oasis',
    description: 'Gleaming hyper-modern skyline rising out of golden Arabian dunes.'
  },
  {
    keywords: ['riyadh', 'saudi arabia', 'jeddah'],
    biome: 'desert',
    waterwayName: null,
    badge: '🏜️ Najd Desert Dunes',
    description: 'Vast rolling sand seas and historic desert trading crossroads.'
  },
  {
    keywords: ['marrakech', 'morocco'],
    biome: 'desert',
    waterwayName: null,
    badge: '🏜️ Atlas Foothill Oasis',
    description: 'Ochre clay ramparts, date palms, and camel caravan gates.'
  },
  {
    keywords: ['phoenix', 'arizona', 'las vegas', 'nevada'],
    biome: 'desert',
    waterwayName: null,
    badge: '🏜️ Sonoran & Mojave Desert',
    description: 'Sun-baked canyon roads, giant saguaro cacti, and desert highways.'
  },
  {
    keywords: ['doha', 'qatar', 'kuwait', 'bahrain'],
    biome: 'desert',
    waterwayName: null,
    badge: '🏜️ Gulf Desert Sands',
    description: 'Wind-sculpted sand dunes and sparkling coastal oasis promenades.'
  },

  // Alpine / Mountain Cities
  {
    keywords: ['denver', 'colorado', 'rockies', 'salt lake city', 'utah'],
    biome: 'alpine',
    waterwayName: 'Clear Creek Mountain Stream',
    badge: '🏔️ Rocky Mountain Foothills',
    description: 'Mile-high alpine air, pine-scented canyons, and snowy peaks.'
  },
  {
    keywords: ['innsbruck', 'alps', 'salzburg', 'zurich', 'bern', 'geneva', 'switzerland'],
    biome: 'alpine',
    waterwayName: 'Alpine Glacier River',
    badge: '🏔️ Swiss & Austrian Alps',
    description: 'Crisp mountain valleys, chalets, and roaring glacial torrents.'
  },
  {
    keywords: ['kathmandu', 'nepal', 'himalaya'],
    biome: 'alpine',
    waterwayName: 'Bagmati Valley Stream',
    badge: '🏔️ Himalayan Valley',
    description: 'High Himalayan plateau crowned by ancient prayer-flag mountain passes.'
  },
  {
    keywords: ['santiago', 'chile', 'andes', 'la paz', 'bolivia', 'quito', 'bogota'],
    biome: 'alpine',
    waterwayName: 'Andean Mountain Stream',
    badge: '🏔️ High Andean Ridge',
    description: 'Towering Andean summits guarding high-altitude historic avenues.'
  },

  // Inland Metropolises (No major waterways)
  {
    keywords: ['madrid', 'spain'],
    biome: 'urban',
    waterwayName: null,
    badge: '🏙️ Iberian Grand Boulevard',
    description: 'Grand stone plazas, rooftop terraces, and lively boulevard cafes.'
  },
  {
    keywords: ['berlin', 'germany'],
    biome: 'urban',
    waterwayName: null,
    badge: '🏙️ Berlin Urban Metropolis',
    description: 'Vibrant underground club culture, street murals, and wide avenues.'
  },
  {
    keywords: ['mexico city', 'cdmx', 'mexico'],
    biome: 'urban',
    waterwayName: null,
    badge: '🏙️ Valle de México Megacity',
    description: 'High-altitude megalopolis bursting with street music, food stalls, and colonial plazas.'
  },
  {
    keywords: ['chicago', 'illinois', 'dallas', 'texas', 'atlanta', 'georgia'],
    biome: 'urban',
    waterwayName: null,
    badge: '🏙️ American Heartland Metropolis',
    description: 'Sky-scraping architectural canyons, bustling avenues, and transit lines.'
  },
  {
    keywords: ['sao paulo', 'são paulo'],
    biome: 'urban',
    waterwayName: null,
    badge: '🏙️ Paulista Concrete Metropolis',
    description: 'Endless sea of towers, neon street art, and legendary nightlife.'
  },
  {
    keywords: ['johannesburg', 'joburg'],
    biome: 'urban',
    waterwayName: null,
    badge: '🏙️ Highveld Metropolis',
    description: 'Gold Reef highlands, jacaranda avenues, and bustling rooftop vibes.'
  }
];

export function resolveLocationEnvironment(
  placeName: string,
  countryName: string,
  lat: number = 0,
  lng: number = 0
): LocationEnvironment {
  const p = (placeName || '').toLowerCase();
  const c = (countryName || '').toLowerCase();
  const full = `${p} ${c}`;

  // 1. Check curated exact matches
  for (const rule of CITY_GEO_RULES) {
    if (rule.keywords.some(k => full.includes(k))) {
      return buildEnvironment(rule.biome, rule.waterwayName, rule.badge, rule.description, placeName, countryName);
    }
  }

  // 2. Heuristic checks based on latitude, longitude, and country words
  // Island nations are coastal
  const islandCountries = ['japan', 'indonesia', 'philippines', 'new zealand', 'iceland', 'madagascar', 'cuba', 'jamaica', 'ireland', 'fiji', 'hawaii', 'caribbean', 'bahamas'];
  if (islandCountries.some(i => c.includes(i))) {
    return buildEnvironment(
      'coastal',
      `${placeName || 'Coastal'} Seaboard Waters`,
      '🌊 Island & Maritime Coast',
      `Island coastline and open ocean waters surrounding ${placeName || countryName}.`,
      placeName,
      countryName
    );
  }

  // High mountain areas (Andes, Rockies, Himalayas)
  if ((lat > 25 && lat < 38 && lng > 68 && lng < 95) || // Himalayas
      (lat > 35 && lat < 45 && lng > -112 && lng < -104) || // Rockies
      (lat > -45 && lat < 10 && lng > -78 && lng < -65)) { // Andes
    return buildEnvironment(
      'alpine',
      `${placeName || 'Alpine'} Mountain Stream`,
      '🏔️ Mountain Highlands',
      `High elevation mountain valley near ${placeName}, ${countryName}.`,
      placeName,
      countryName
    );
  }

  // Desert belt (Sahara, Arabian Peninsula, Central Australia)
  if ((lat > 15 && lat < 33 && lng > -15 && lng < 58) || // Sahara & Arabia
      (lat > -30 && lat < -20 && lng > 115 && lng < 140)) { // Outback
    return buildEnvironment(
      'desert',
      null,
      '🏜️ Arid Sands & Oasis',
      `Sun-drenched desert terrain and oasis settlements in ${countryName}.`,
      placeName,
      countryName
    );
  }

  // Default fallback for inland cities
  return buildEnvironment(
    'urban',
    null,
    '🏙️ City Street Grid',
    `Urban thoroughfares and cultural avenues of ${placeName || 'this city'}, ${countryName}.`,
    placeName,
    countryName
  );
}

function buildEnvironment(
  biome: EnvironmentType,
  waterwayName: string | null,
  badge: string,
  description: string,
  placeName: string,
  countryName: string
): LocationEnvironment {
  let availableActivities: ActivityMode[] = [];

  switch (biome) {
    case 'coastal':
      availableActivities = ['bike', 'boat', 'fishing', 'market', 'photo'];
      break;
    case 'river':
      availableActivities = ['bike', 'boat', 'fishing', 'market', 'photo'];
      break;
    case 'desert':
      availableActivities = ['buggy', 'bike', 'market', 'photo'];
      break;
    case 'alpine':
      availableActivities = ['ski', 'bike', 'fishing', 'market', 'photo'];
      break;
    case 'urban':
    default:
      availableActivities = ['bike', 'dj', 'market', 'photo'];
      break;
  }

  return {
    biome,
    badge,
    waterwayName: waterwayName ? waterwayName : null,
    description: description || `Exploring ${placeName}, ${countryName}`,
    availableActivities
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
