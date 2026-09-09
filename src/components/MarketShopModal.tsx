import React, { useState, useRef } from 'react';
import { ShoppingBag, Coins, X, Check, Sparkles, Flame, ChefHat, Trophy } from 'lucide-react';
import { getCityMarketItems } from '../services/activityData';
import { soundEffects } from '../services/audioEffects';
import { gamepadManager } from '../services/gamepadManager';
import type { BackpackItem, MarketItem } from '../types';
import confetti from 'canvas-confetti';

interface MarketShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  cityName: string;
  countryName: string;
  coins: number;
  onDeductCoins: (amount: number) => boolean;
  onAddBackpackItem: (item: BackpackItem) => void;
  backpackItemIds: string[];
}

export const MarketShopModal: React.FC<MarketShopModalProps> = ({
  isOpen,
  onClose,
  cityName,
  countryName,
  coins,
  onDeductCoins,
  onAddBackpackItem,
  backpackItemIds
}) => {
  const [activePrepItem, setActivePrepItem] = useState<MarketItem | null>(null);
  const [prepProgress, setPrepProgress] = useState<number>(0); // 0 - 100
  const [prepStep, setPrepStep] = useState<'heat' | 'flip' | 'season' | 'done'>('heat');
  const [sizzleTemp, setSizzleTemp] = useState<number>(50); // 0 - 100

  const prepTimerRef = useRef<number | null>(null);

  if (!isOpen) return null;

  const { marketName, items } = getCityMarketItems(cityName, countryName);

  const handleInstantBuy = (item: MarketItem) => {
    if (backpackItemIds.includes(item.id)) return;
    if (coins < item.priceCoins) {
      soundEffects.playStaticBurst(0.2, 0.15);
      return;
    }

    const success = onDeductCoins(item.priceCoins);
    if (success) {
      soundEffects.playCoinSound();
      onAddBackpackItem({
        id: item.id,
        name: item.name,
        category: item.category,
        icon: item.icon,
        city: cityName,
        country: countryName,
        description: item.description,
        acquiredAt: new Date().toISOString(),
        priceCoins: item.priceCoins
      });
    }
  };

  // Start Artisan Cooking Minigame
  const startArtisanPrep = (item: MarketItem) => {
    setActivePrepItem(item);
    setPrepStep('heat');
    setPrepProgress(20);
    setSizzleTemp(50);
    soundEffects.playStaticBurst(0.1, 0.2); // Sizzle sound
    gamepadManager.vibrate(80, 0.4, 0.2);

    // Heat oscillation
    prepTimerRef.current = window.setInterval(() => {
      setSizzleTemp(t => {
        const next = t + (Math.random() - 0.45) * 12;
        return Math.max(10, Math.min(95, next));
      });
    }, 120);
  };

  const handlePrepAction = () => {
    if (!activePrepItem) return;

    soundEffects.playRadarPing(800 + prepProgress * 4, 0.1);
    gamepadManager.vibrate(60, 0.5, 0.3);

    if (prepStep === 'heat') {
      setPrepStep('flip');
      setPrepProgress(55);
      soundEffects.playStaticBurst(0.08, 0.15);
    } else if (prepStep === 'flip') {
      setPrepStep('season');
      setPrepProgress(85);
      soundEffects.playRadarPing(1100, 0.15);
    } else if (prepStep === 'season') {
      setPrepStep('done');
      setPrepProgress(100);
      if (prepTimerRef.current) clearInterval(prepTimerRef.current);

      soundEffects.playTriumphChime();
      confetti({
        particleCount: 75,
        spread: 60,
        origin: { y: 0.6 }
      });

      // Award free item + chef bonus
      onAddBackpackItem({
        id: activePrepItem.id,
        name: `★ Master-Crafted ${activePrepItem.name}`,
        category: activePrepItem.category,
        icon: activePrepItem.icon,
        city: cityName,
        country: countryName,
        description: `Handcrafted with local street vendors in ${cityName}. ${activePrepItem.description}`,
        acquiredAt: new Date().toISOString(),
        priceCoins: 0
      });
    }
  };

  const closePrep = () => {
    if (prepTimerRef.current) clearInterval(prepTimerRef.current);
    setActivePrepItem(null);
    setPrepStep('heat');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="relative w-full max-w-xl bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-400/40 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 text-slate-100 max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-950/80 border border-amber-400/50 rounded-2xl text-amber-400">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-100 tracking-wide font-sans">
                {marketName}
              </h2>
              <p className="text-xs text-slate-400">
                Local Bakeries, Vintage Crates & Street Stalls in {cityName}, {countryName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Coins Wallet Bar */}
        <div className="bg-slate-950/80 rounded-2xl px-4 py-2.5 border border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-mono">Traveler's Coin Purse:</span>
          <div className="flex items-center gap-1.5 font-mono text-base font-black text-amber-400">
            <Coins className="w-4 h-4" /> {coins} Coins
          </div>
        </div>

        {/* Active Artisan Cooking/Crafting Minigame View */}
        {activePrepItem ? (
          <div className="bg-slate-900/90 border border-amber-400/60 rounded-2xl p-5 flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between w-full border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-300">
                <ChefHat className="w-4 h-4 text-amber-400" /> Artisan Street Food Prep: {activePrepItem.name}
              </div>
              <button onClick={closePrep} className="text-xs text-slate-400 hover:text-white">
                Cancel
              </button>
            </div>

            {/* Sizzle Viewport */}
            <div className="w-full h-36 bg-slate-950 rounded-2xl border border-amber-500/30 flex flex-col items-center justify-center relative overflow-hidden">
              <div className="text-5xl animate-bounce">{activePrepItem.icon}</div>

              {/* Sizzle heat glow */}
              <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-orange-500/30 to-transparent pointer-events-none" />

              <div className="absolute top-2 right-3 flex items-center gap-1 text-[11px] font-mono text-amber-400">
                <Flame className="w-3.5 h-3.5 animate-pulse text-orange-500" /> Sizzle Heat: {Math.round(sizzleTemp)}°C
              </div>
            </div>

            {/* Step instruction */}
            <div className="w-full flex flex-col gap-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-amber-300 font-bold">
                  {prepStep === 'heat' && 'Step 1: Stoke the Heat in the Skillet!'}
                  {prepStep === 'flip' && 'Step 2: Quick-Flip the Dish!'}
                  {prepStep === 'season' && 'Step 3: Garnish with Fresh Local Spices!'}
                  {prepStep === 'done' && '★ 3-Star Artisan Street Food Masterpiece!'}
                </span>
                <span className="text-slate-400">{prepProgress}%</span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-150"
                  style={{ width: `${prepProgress}%` }}
                />
              </div>
            </div>

            {/* Action button */}
            {prepStep !== 'done' ? (
              <button
                onClick={handlePrepAction}
                className="w-full py-3 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-amber-400/20 active:scale-95 flex items-center justify-center gap-2"
              >
                <Flame className="w-4 h-4 fill-slate-950" />
                {prepStep === 'heat' && 'Stoke Sizzle!'}
                {prepStep === 'flip' && 'FLIP & TOSS!'}
                {prepStep === 'season' && 'GARNISH & SERVE!'}
              </button>
            ) : (
              <button
                onClick={closePrep}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm rounded-2xl shadow-xl transition flex items-center justify-center gap-2"
              >
                <Trophy className="w-4 h-4" /> Stash Master Dish in Backpack
              </button>
            )}
          </div>
        ) : (
          /* Market Wares Grid */
          <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {items.map(item => {
              const isOwned = backpackItemIds.includes(item.id);
              const canAfford = coins >= item.priceCoins;

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition flex flex-col justify-between ${
                    isOwned
                      ? 'bg-slate-950/40 border-slate-800/60 opacity-80'
                      : 'bg-slate-900/70 border-slate-800 hover:border-amber-400/50'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-3xl p-1 bg-slate-950 rounded-xl border border-slate-800">{item.icon}</span>
                      <span className="text-[10px] font-mono uppercase bg-amber-950/60 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-bold">
                        {item.category}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-100 mt-2.5 leading-snug">{item.name}</h4>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{item.description}</p>
                  </div>

                  <div className="mt-4 pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-1.5">
                    <div className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5" /> {item.priceCoins}
                    </div>

                    {isOwned ? (
                      <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                        <Check className="w-4 h-4" /> Owned
                      </span>
                    ) : (
                      <div className="flex items-center gap-1">
                        {item.category === 'food' && (
                          <button
                            onClick={() => startArtisanPrep(item)}
                            className="px-2.5 py-1.5 bg-amber-950/80 hover:bg-amber-900/90 text-amber-300 border border-amber-500/40 rounded-xl text-[11px] font-bold transition active:scale-95 flex items-center gap-1"
                            title="Cook with street chef to earn free!"
                          >
                            <ChefHat className="w-3 h-3" /> Cook
                          </button>
                        )}
                        <button
                          onClick={() => handleInstantBuy(item)}
                          disabled={!canAfford}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                            canAfford
                              ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 active:scale-95 shadow-md shadow-amber-400/20'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          Buy
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer info */}
        <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Cook with local street chefs to earn authentic dishes for free!
          </span>
          <span className="font-mono text-[10px] text-slate-500">SAVED IN BACKPACK</span>
        </div>
      </div>
    </div>
  );
};
