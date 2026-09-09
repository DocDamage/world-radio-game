export interface RadioStation {
  id: string;
  name: string;
  place: string;
  placeId?: string;
  country: string;
  countryCode?: string;
  website?: string;
  secure?: boolean;
  streamUrl: string;
  geo_lat: number;
  geo_long: number;
  tags?: string;
}

export interface Place {
  id: string;
  title: string;
  country: string;
  size: number;
  boost: boolean;
  geo: [number, number]; // [lng, lat]
}

export type AppMode = 'explore' | 'street' | 'hunt' | 'detective';

export interface SignalHuntState {
  targetStation: RadioStation | null;
  playerPos: { lat: number; lng: number };
  targetPos: { lat: number; lng: number };
  distanceMeters: number;
  signalStrength: number; // 0 - 100
  found: boolean;
  score: number;
}

export interface DetectiveState {
  targetStation: RadioStation | null;
  guessedPos: { lat: number; lng: number } | null;
  revealed: boolean;
  distanceKm: number | null;
  score: number;
}

export interface PassportEntry {
  stationUuid: string;
  stationName: string;
  city: string;
  country: string;
  countryCode: string;
  genre: string;
  visitedAt: string;
  coordinates: { lat: number; lng: number };
}

export type EnvironmentType = 'coastal' | 'river' | 'urban' | 'desert' | 'alpine';

export type ActivityMode = 'none' | 'bike' | 'boat' | 'fishing' | 'market' | 'photo' | 'dj' | 'buggy' | 'ski' | 'surf';

export interface LocationEnvironment {
  biome: EnvironmentType;
  badge: string;
  waterwayName: string | null;
  description: string;
  availableActivities: ActivityMode[];
}

export interface BackpackItem {
  id: string;
  name: string;
  category: 'food' | 'souvenir' | 'fish' | 'vinyl' | 'photo';
  icon: string;
  city: string;
  country: string;
  description: string;
  acquiredAt: string;
  photoUrl?: string;
  priceCoins?: number;
}

export interface MarketItem {
  id: string;
  name: string;
  category: 'food' | 'souvenir' | 'vinyl';
  icon: string;
  priceCoins: number;
  description: string;
}

export interface FishSpecies {
  name: string;
  icon: string;
  rarity: 'Common' | 'Rare' | 'Legendary';
  minWeight: number;
  maxWeight: number;
  funFact: string;
}
