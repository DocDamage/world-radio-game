import type { MissionDefinition, ExpeditionDefinition } from './types';

export const MISSION_CATALOG: MissionDefinition[] = [
  // 1. Bicycle Grand Prix - Last-Mile Broadcast
  {
    id: 'bike-last-mile',
    gameId: 'bike',
    title: 'Last-Mile Broadcast',
    subtitle: 'Deliver audio cartridges through neighborhood traffic',
    durationMin: 3,
    description: 'Carry community radio broadcast cartridges from the transit hub to neighborhood antenna masts before sunset. Choose between climbing elevation or navigating congested flat avenues.',
    choices: [
      {
        id: 'climb',
        label: 'Highland Incline Shortcut',
        description: 'Shorter distance with higher pedal resistance and sparser vehicle flow.',
        modifier: 'Distance 1,600m • Steeper grade • Less traffic'
      },
      {
        id: 'flat',
        label: 'Avenue Flatway Corridor',
        description: 'Longer flat road through active downtown transit corridors and intersections.',
        modifier: 'Distance 2,200m • Flat grade • Dense traffic rhythm'
      }
    ],
    medalThresholds: { bronze: 1200, silver: 1800, gold: 2400 },
    rewards: { coins: 35, xp: 50 },
    contextLabel: 'Inspired by real street topography & bicycle network routes',
    expansionRef: 'O01/O18',
    status: 'live'
  },

  // 2. Boating - Harbor Radio Run
  {
    id: 'boat-harbor-run',
    gameId: 'boat',
    title: 'Harbor Radio Run',
    subtitle: 'Navigate ferry lanes and deliver transmitter crates',
    durationMin: 3,
    description: 'Collect transmitter crates and pilot your vessel through busy harbor lanes to dock smoothly at the broadcast wharf.',
    choices: [
      {
        id: 'sheltered',
        label: 'Sheltered Ring Channel',
        description: 'Calm water protected by seawall groynes, requiring careful precision steering.',
        modifier: 'Low crosswinds • Tighter navigation buoys'
      },
      {
        id: 'exposed',
        label: 'Open Harbor Crossing',
        description: 'Direct cut across active ferry shipping lanes with open water chop.',
        modifier: 'Faster transit • Active ferry schedules'
      }
    ],
    medalThresholds: { bronze: 100, silver: 250, gold: 400 },
    rewards: { coins: 40, xp: 60 },
    supportedBiomes: ['coastal', 'river'],
    contextLabel: 'Modeled on maritime navigation channels & port charts',
    expansionRef: 'O04/O17',
    status: 'live'
  },

  // 3. Fishing - River Field Journal
  {
    id: 'fishing-field-journal',
    gameId: 'fishing',
    title: 'River Field Journal',
    subtitle: 'Catalog native species along urban waterways',
    durationMin: 3,
    description: 'Document the aquatic species thriving in local waterways. Choose your casting depth and bait style to target rare ecological species.',
    choices: [
      {
        id: 'deep-channel',
        label: 'Deep Current Channel',
        description: 'Cast into deeper water for heavy bottom-stalking predators.',
        modifier: 'Heavy sinker • Stronger fight tension'
      },
      {
        id: 'shallows',
        label: 'Reedy Shallows & Bridge Piers',
        description: 'Cast near stone bridge arches for active surface feeders.',
        modifier: 'Light lure • Rapid bite frequency'
      }
    ],
    medalThresholds: { bronze: 100, silver: 200, gold: 350 },
    rewards: { coins: 30, xp: 45 },
    supportedBiomes: ['coastal', 'river', 'alpine'],
    contextLabel: 'Curated freshwater & coastal habitat survey',
    expansionRef: 'O07/O14',
    status: 'live'
  },

  // 4. Rooftop DJ - Orbit-to-Rooftop Set
  {
    id: 'dj-orbit-rooftop',
    gameId: 'dj',
    title: 'Orbit-to-Rooftop Set',
    subtitle: 'Sync rooftop drum machines with satellite pass frequencies',
    durationMin: 2,
    description: 'Perform a synchronized rhythm set under the night sky. Keep cadence with the beat clock and execute crisp snare stabs as celestial beacons cross overhead.',
    choices: [
      {
        id: 'synths',
        label: 'Space Synth 120 BPM',
        description: 'Steady 4/4 electronic cadence with rhythmic hi-hat rolls.',
        modifier: '120 BPM • Balanced timing windows'
      },
      {
        id: 'breakbeat',
        label: 'Broken Beat 140 BPM',
        description: 'High-energy syncopated breaks with rapid snare fills.',
        modifier: '140 BPM • Tighter precision windows'
      }
    ],
    medalThresholds: { bronze: 500, silver: 1200, gold: 2000 },
    rewards: { coins: 40, xp: 55 },
    contextLabel: 'Quantized analog beat grid inspired by orbital passes',
    expansionRef: 'O05/O06',
    status: 'live'
  },

  // 5. Street Chef - Broadcast Night Market
  {
    id: 'chef-night-market',
    gameId: 'market',
    title: 'Broadcast Night Market',
    subtitle: 'Cook local street cuisine for the station crew',
    durationMin: 2,
    description: 'Manage ingredients within budget and execute authentic skillet recipes with perfect sear and seasoning timing for festival radio hosts.',
    choices: [
      {
        id: 'classic',
        label: 'Heritage Market Recipe',
        description: 'Traditional time-tested specialty emphasizing slow, golden skillet sears.',
        modifier: 'Standard heat window • High consistency'
      },
      {
        id: 'express',
        label: 'High-Heat Rush Order',
        description: 'Fast-paced street food cooking demanding rapid reaction and agile flips.',
        modifier: 'Narrow peak temperature • 2x bonus for perfect timing'
      }
    ],
    medalThresholds: { bronze: 50, silver: 90, gold: 130 },
    rewards: { coins: 35, xp: 50 },
    contextLabel: 'Curated regional market delicacies and street ingredients',
    expansionRef: 'O16/O22',
    status: 'live'
  },

  // 6. Photo Snap - City Correspondent
  {
    id: 'photo-correspondent',
    gameId: 'photo',
    title: 'City Correspondent',
    subtitle: 'Capture postcard views for the world radio atlas',
    durationMin: 2,
    description: 'Frame distinctive urban architecture, golden-hour horizons, or transit arteries. Complete the composition brief to publish an official broadcast memory.',
    choices: [
      {
        id: 'skyline',
        label: 'Architectural Skyline Silhouette',
        description: 'Use a wide 24mm angle with balanced horizon leveling to capture city peaks.',
        modifier: 'Wide frame • Focus on horizon alignment'
      },
      {
        id: 'street-detail',
        label: 'Transit Landmark Close-Up',
        description: 'Use 50mm telephoto framing to highlight iconic transport and street atmosphere.',
        modifier: 'Narrow depth of field • Focus on subject centrality'
      }
    ],
    medalThresholds: { bronze: 70, silver: 85, gold: 95 },
    rewards: { coins: 30, xp: 40 },
    contextLabel: 'Exportable postcard rendering with authentic geolocation metadata',
    expansionRef: 'O08/O09',
    status: 'live'
  },

  // 7. Desert Buggy - Solar Relay Rally
  {
    id: 'buggy-solar-rally',
    gameId: 'buggy',
    title: 'Solar Relay Rally',
    subtitle: 'Cross desert dunes to inspect isolated repeater towers',
    durationMin: 3,
    description: 'Navigate sand ridges and salt flats in an off-road buggy to reach remote solar transmitters before the night broadcast begins.',
    choices: [
      {
        id: 'dune-ridge',
        label: 'High Dune Ridge',
        description: 'Soar off wind-sculpted sand dunes for huge airtime bonuses.',
        modifier: 'More jump ramps • Rough landing risk'
      },
      {
        id: 'canyon-wash',
        label: 'Canyon Gravel Wash',
        description: 'Flat, high-speed winding wash with hazardous rock outcroppings.',
        modifier: 'Higher top speed • Dense obstacle slalom'
      }
    ],
    medalThresholds: { bronze: 1000, silver: 2000, gold: 3000 },
    rewards: { coins: 40, xp: 60 },
    supportedBiomes: ['desert'],
    contextLabel: 'Arid terrain simulation inspired by topographic desert surveys',
    expansionRef: 'O01/O18',
    status: 'live'
  },

  // 8. Alpine Downhill - Mountain Broadcast Courier
  {
    id: 'ski-mountain-courier',
    gameId: 'ski',
    title: 'Mountain Broadcast Courier',
    subtitle: 'Slalom down snowy peaks with broadcast telemetry',
    durationMin: 2,
    description: 'Carve between slalom gates down glacier slopes to deliver emergency transmitter equipment to the mountain valley repeater.',
    choices: [
      {
        id: 'technical-slalom',
        label: 'Technical Slalom Line',
        description: 'Tight red and blue gates requiring precise carving rhythms and quick reflex turns.',
        modifier: 'Close gate spacing • +50% gate clearance bonus'
      },
      {
        id: 'glacier-speed',
        label: 'Open Glacier Speedline',
        description: 'Wide slopes with natural snow knoll jumps and speed tucks.',
        modifier: 'High velocity • Missed gate time penalties'
      }
    ],
    medalThresholds: { bronze: 1200, silver: 2000, gold: 2800 },
    rewards: { coins: 40, xp: 55 },
    supportedBiomes: ['alpine'],
    contextLabel: 'Sub-alpine glacier topology and slalom course physics',
    expansionRef: 'O01/O07',
    status: 'live'
  },

  // 9. Surfing - Swell Window
  {
    id: 'surf-swell-window',
    gameId: 'surf',
    title: 'Swell Window',
    subtitle: 'Ride ocean point breaks while tracking coastal radio',
    durationMin: 2,
    description: 'Catch peeling ocean sets, carve inside the pocket, and tuck into the barrel during an incoming maritime swell window.',
    choices: [
      {
        id: 'tube-master',
        label: 'Hollow Barrel Window',
        description: 'Fast-closing hollow waves with extended deep tube-ride opportunities.',
        modifier: 'High tube point multiplier • Narrow safe exit'
      },
      {
        id: 'open-face',
        label: 'Peeling Open Face',
        description: 'Long shoulder providing ample room for roundhouse cutbacks and floaters.',
        modifier: 'Gentler lip • Combo trick variety focus'
      }
    ],
    medalThresholds: { bronze: 600, silver: 1500, gold: 2500 },
    rewards: { coins: 35, xp: 50 },
    supportedBiomes: ['coastal'],
    contextLabel: 'Maritime wave telemetry and ocean swell simulation',
    expansionRef: 'O07/O09',
    status: 'live'
  },

  // 10. Signal Hunt - Find the Lost Relay
  {
    id: 'hunt-lost-relay',
    gameId: 'hunt',
    title: 'Find the Lost Relay',
    subtitle: 'Triangulate bearings to locate a hidden clandestine antenna',
    durationMin: 3,
    description: 'Deploy antenna azimuth sweeps, plot lines of bearing on radar, and track RF strength to isolate an unlisted community transmitter.',
    choices: [
      {
        id: 'yagi',
        label: 'High-Gain Yagi Array',
        description: 'Narrow forward lobe providing sharp directional accuracy with deep nulls.',
        modifier: 'High directional sensitivity • Sharp angle nulls'
      },
      {
        id: 'omni',
        label: 'Attenuated Loop Sensor',
        description: 'Wide beam suited for sweeping broader sectors in dense urban alleyways.',
        modifier: 'Wider lobe • Requires step-by-step proximity triangulation'
      }
    ],
    medalThresholds: { bronze: 50, silver: 80, gold: 100 },
    rewards: { coins: 45, xp: 65 },
    contextLabel: 'Radio direction finding (RDF) using Line of Bearing triangulation',
    expansionRef: 'O06/O17',
    status: 'live'
  },

  // 11. Radio Detective - The Missing Broadcast
  {
    id: 'detective-missing-broadcast',
    gameId: 'detective',
    title: 'The Missing Broadcast',
    subtitle: 'Analyze signals, grid frequencies & accents to find the city',
    durationMin: 3,
    description: 'Listen to an uncataloged radio feed, evaluate power grid harmonics and linguistic cues, and pinpoint the exact broadcast location on Earth without spoiling the answer.',
    choices: [
      {
        id: 'forensic-grid',
        label: 'Power Grid & Acoustic Analysis',
        description: 'Inspect power line frequency hum (50Hz vs 60Hz) and transit acoustics.',
        modifier: 'Forensic power grid readout • High-confidence continental clues'
      },
      {
        id: 'cultural-linguistic',
        label: 'Linguistic & Sun Angle Analysis',
        description: 'Decode script families, solar transit meridian hints, and ambient broadcasts.',
        modifier: 'Cultural clue cards • Precise regional narrowing'
      }
    ],
    medalThresholds: { bronze: 2500, silver: 4000, gold: 4800 },
    rewards: { coins: 50, xp: 80 },
    contextLabel: 'Forensic signal intelligence & geographic mystery isolation',
    expansionRef: 'O14/O15',
    status: 'live'
  }
];

export const EXPEDITIONS: ExpeditionDefinition[] = [
  {
    id: 'exp-silent-frequency',
    title: 'The Silent Frequency',
    subtitle: 'Triangulate, document, and uncover a lost radio signal',
    description: 'A legendary independent world broadcast went silent. Triangulate its relay tower in Signal Hunt, capture its landmark skyline in Photo Snap, and identify its hidden destination in Radio Detective.',
    stageMissionIds: ['hunt-lost-relay', 'photo-correspondent', 'detective-missing-broadcast'],
    finalReward: {
      coins: 60,
      xp: 120,
      badgeName: '📡 Silent Frequency Restorer',
      badgeIcon: '✨'
    }
  },
  {
    id: 'exp-harbor-rooftop',
    title: 'Harbor to Rooftop',
    subtitle: 'Prepare a city-wide community radio festival',
    description: 'Deliver transmitter crates across the harbor in Boating, courier audio cartridges in Bicycle, cook authentic recipes at the Night Market, and perform the finale set in Rooftop DJ.',
    stageMissionIds: ['boat-harbor-run', 'bike-last-mile', 'chef-night-market', 'dj-orbit-rooftop'],
    finalReward: {
      coins: 80,
      xp: 150,
      badgeName: '🎉 City Festival Impresario',
      badgeIcon: '🏙️'
    }
  },
  {
    id: 'exp-coast-to-coast',
    title: 'Coast to Coast',
    subtitle: 'Explore maritime swells, river life, and coastal scenes',
    description: 'Ride coastal wave sets in Surfing, document river wildlife in Fishing, and compose an iconic postcard in Photo Snap.',
    stageMissionIds: ['surf-swell-window', 'fishing-field-journal', 'photo-correspondent'],
    finalReward: {
      coins: 60,
      xp: 100,
      badgeName: '🌊 Coastal Voyager',
      badgeIcon: '🏄'
    }
  },
  {
    id: 'exp-mountain-relay',
    title: 'Mountain Summit Relay',
    subtitle: 'Descend alpine slopes and reconnect high-altitude transmitters',
    description: 'Carry vital transmitter telemetry through slalom gates in Alpine Downhill, lock onto the summit relay in Signal Hunt, and photograph the mountain peak.',
    stageMissionIds: ['ski-mountain-courier', 'hunt-lost-relay', 'photo-correspondent'],
    finalReward: {
      coins: 70,
      xp: 130,
      badgeName: '🏔️ Alpine Apex Courier',
      badgeIcon: '🎿'
    }
  }
];

export function getMissionById(id: string): MissionDefinition | undefined {
  return MISSION_CATALOG.find(m => m.id === id);
}

export function getExpeditionById(id: string): ExpeditionDefinition | undefined {
  return EXPEDITIONS.find(e => e.id === id);
}

export function getMissionsForGame(gameId: string): MissionDefinition[] {
  return MISSION_CATALOG.filter(m => m.gameId === gameId);
}
