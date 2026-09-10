import type { PassportEntry, BackpackItem, RadioStation } from '../types';

export interface MissionRecord {
  missionId: string;
  gameId: string;
  completedAt: string;
  score: number;
  medal: 'bronze' | 'silver' | 'gold';
  coinsEarned: number;
  xpEarned: number;
}

export interface TravelerSaveData {
  version: 2;
  coins: number;
  xp: number;
  passport: PassportEntry[];
  backpack: BackpackItem[];
  favorites: Record<string, RadioStation>;
  highScores: Record<string, number>;
  completedMissions: Record<string, MissionRecord>;
  completedExpeditions: string[];
  settledTransactions: string[]; // Set of transaction IDs to prevent double payout
}

const STORAGE_KEY = 'world_radio_traveler_v2';

const DEFAULT_SAVE: TravelerSaveData = {
  version: 2,
  coins: 250,
  xp: 0,
  passport: [],
  backpack: [],
  favorites: {},
  highScores: { bike: 0, boat: 0, fishing: 0, dj: 0, buggy: 0, ski: 0, surf: 0 },
  completedMissions: {},
  completedExpeditions: [],
  settledTransactions: []
};

class TravelerStateManager {
  private state: TravelerSaveData;
  private isStorageAvailable: boolean = true;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.state = this.loadAndMigrate();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.save();
    this.listeners.forEach(fn => fn());
  }

  private loadAndMigrate(): TravelerSaveData {
    try {
      const v2Data = localStorage.getItem(STORAGE_KEY);
      if (v2Data) {
        const parsed = JSON.parse(v2Data);
        if (parsed && parsed.version === 2) {
          return {
            ...DEFAULT_SAVE,
            ...parsed,
            highScores: { ...DEFAULT_SAVE.highScores, ...(parsed.highScores || {}) },
            settledTransactions: Array.isArray(parsed.settledTransactions) ? parsed.settledTransactions : []
          };
        }
      }
    } catch (err) {
      console.warn('Failed to parse traveler v2 save data, attempting migration:', err);
    }

    // Attempt migration from v1 legacy keys
    return this.migrateFromV1();
  }

  private migrateFromV1(): TravelerSaveData {
    try {
      const coinsStr = localStorage.getItem('world_radio_coins');
      const passportStr = localStorage.getItem('world_radio_passport');
      const backpackStr = localStorage.getItem('world_radio_backpack');
      const favsStr = localStorage.getItem('world_radio_favorites');
      const hsStr = localStorage.getItem('world_radio_highscores');

      const coins = coinsStr ? Math.max(0, parseInt(coinsStr, 10) || 250) : 250;
      const passport = passportStr ? JSON.parse(passportStr) : [];
      const backpack = backpackStr ? JSON.parse(backpackStr) : [];
      const favorites = favsStr ? JSON.parse(favsStr) : {};
      const highScores = hsStr ? JSON.parse(hsStr) : DEFAULT_SAVE.highScores;

      const migrated: TravelerSaveData = {
        version: 2,
        coins: typeof coins === 'number' && !isNaN(coins) ? coins : 250,
        xp: 0,
        passport: Array.isArray(passport) ? passport : [],
        backpack: Array.isArray(backpack) ? backpack : [],
        favorites: typeof favorites === 'object' && favorites !== null ? favorites : {},
        highScores: typeof highScores === 'object' && highScores !== null ? { ...DEFAULT_SAVE.highScores, ...highScores } : DEFAULT_SAVE.highScores,
        completedMissions: {},
        completedExpeditions: [],
        settledTransactions: []
      };

      this.save(migrated);
      return migrated;
    } catch (err) {
      console.warn('Failed to migrate v1 data, using clean default state:', err);
      return { ...DEFAULT_SAVE };
    }
  }

  private save(dataToSave?: TravelerSaveData) {
    const data = dataToSave || this.state;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      this.isStorageAvailable = true;
    } catch (err) {
      console.warn('Storage unavailable or quota exceeded:', err);
      this.isStorageAvailable = false;
    }
  }

  public getState(): Readonly<TravelerSaveData> {
    return this.state;
  }

  public isStorageWorking(): boolean {
    return this.isStorageAvailable;
  }

  // Transactional once-only reward settlement
  public settleReward(
    transactionId: string,
    rewards: {
      coins?: number;
      xp?: number;
      backpackItem?: BackpackItem;
      missionId?: string;
      gameId?: string;
      medal?: 'bronze' | 'silver' | 'gold';
      score?: number;
    }
  ): { success: boolean; alreadySettled: boolean; coinsAwarded: number; xpAwarded: number } {
    if (!transactionId) {
      transactionId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    if (this.state.settledTransactions.includes(transactionId)) {
      return { success: false, alreadySettled: true, coinsAwarded: 0, xpAwarded: 0 };
    }

    const coinsToAdd = Math.max(0, rewards.coins || 0);
    const xpToAdd = Math.max(0, rewards.xp || 0);

    const nextSettled = [...this.state.settledTransactions, transactionId];
    // Keep max 500 transaction IDs to bound storage
    if (nextSettled.length > 500) {
      nextSettled.shift();
    }

    let nextBackpack = this.state.backpack;
    if (rewards.backpackItem) {
      nextBackpack = [rewards.backpackItem, ...nextBackpack];
    }

    let nextCompletedMissions = this.state.completedMissions;
    if (rewards.missionId && rewards.gameId) {
      nextCompletedMissions = {
        ...nextCompletedMissions,
        [rewards.missionId]: {
          missionId: rewards.missionId,
          gameId: rewards.gameId,
          completedAt: new Date().toISOString(),
          score: rewards.score || 0,
          medal: rewards.medal || 'bronze',
          coinsEarned: coinsToAdd,
          xpEarned: xpToAdd
        }
      };
    }

    this.state = {
      ...this.state,
      coins: this.state.coins + coinsToAdd,
      xp: this.state.xp + xpToAdd,
      backpack: nextBackpack,
      completedMissions: nextCompletedMissions,
      settledTransactions: nextSettled
    };

    this.notify();
    return { success: true, alreadySettled: false, coinsAwarded: coinsToAdd, xpAwarded: xpToAdd };
  }

  // Atomically sell an owned item for its true value
  public sellItem(itemId: string): { success: boolean; coinsEarned: number } {
    const itemIndex = this.state.backpack.findIndex(i => i.id === itemId);
    if (itemIndex === -1) {
      return { success: false, coinsEarned: 0 };
    }

    const item = this.state.backpack[itemIndex];
    // Derive price from item's defined price, with sane default 15
    const price = typeof item.priceCoins === 'number' && item.priceCoins > 0 ? Math.min(250, item.priceCoins) : 15;

    const nextBackpack = [...this.state.backpack];
    nextBackpack.splice(itemIndex, 1);

    this.state = {
      ...this.state,
      coins: this.state.coins + price,
      backpack: nextBackpack
    };

    this.notify();
    return { success: true, coinsEarned: price };
  }

  // Purchase an item from shop
  public purchaseItem(item: BackpackItem, cost: number): boolean {
    if (this.state.coins < cost) {
      return false;
    }

    // Check if already in backpack
    if (this.state.backpack.some(b => b.id === item.id)) {
      return false;
    }

    this.state = {
      ...this.state,
      coins: this.state.coins - cost,
      backpack: [{ ...item, priceCoins: Math.round(cost * 0.7) }, ...this.state.backpack]
    };

    this.notify();
    return true;
  }

  // Spend coins
  public deductCoins(amount: number): boolean {
    if (amount <= 0) return true;
    if (this.state.coins < amount) return false;

    this.state = {
      ...this.state,
      coins: this.state.coins - amount
    };

    this.notify();
    return true;
  }

  // Add coins directly
  public addCoins(amount: number) {
    if (amount <= 0) return;
    this.state = {
      ...this.state,
      coins: this.state.coins + amount
    };
    this.notify();
  }

  // Add passport stamp
  public addPassportEntry(entry: PassportEntry) {
    // Check if station already recorded today
    const exists = this.state.passport.some(p => p.stationUuid === entry.stationUuid);
    if (exists) return;

    this.state = {
      ...this.state,
      passport: [entry, ...this.state.passport],
      xp: this.state.xp + 25 // 25 XP per unique station visited
    };
    this.notify();
  }

  // Update high score
  public updateHighScore(game: string, score: number): boolean {
    const cur = this.state.highScores[game] || 0;
    if (score <= cur) return false;

    this.state = {
      ...this.state,
      highScores: {
        ...this.state.highScores,
        [game]: score
      }
    };
    this.notify();
    return true;
  }

  // Toggle favorite
  public toggleFavorite(station: RadioStation): boolean {
    const nextFavs = { ...this.state.favorites };
    let isFav = false;
    if (nextFavs[station.id]) {
      delete nextFavs[station.id];
    } else {
      nextFavs[station.id] = station;
      isFav = true;
    }

    this.state = {
      ...this.state,
      favorites: nextFavs
    };
    this.notify();
    return isFav;
  }

  // Complete an expedition
  public completeExpedition(expeditionId: string, bonusCoins: number, bonusXp: number): boolean {
    if (this.state.completedExpeditions.includes(expeditionId)) {
      return false;
    }

    this.state = {
      ...this.state,
      completedExpeditions: [...this.state.completedExpeditions, expeditionId],
      coins: this.state.coins + bonusCoins,
      xp: this.state.xp + bonusXp
    };
    this.notify();
    return true;
  }

  // Export / Import
  public exportJson(): string {
    return JSON.stringify(this.state, null, 2);
  }

  public importJson(jsonStr: string): boolean {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed && typeof parsed.coins === 'number' && Array.isArray(parsed.passport)) {
        this.state = {
          ...DEFAULT_SAVE,
          ...parsed,
          version: 2
        };
        this.notify();
        return true;
      }
    } catch (err) {
      console.warn('Import failed:', err);
    }
    return false;
  }
}

export const travelerState = new TravelerStateManager();
