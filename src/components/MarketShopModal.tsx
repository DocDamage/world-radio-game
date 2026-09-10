import React, { useState, useRef, useEffect } from 'react';
import { ShoppingBag, Coins, X, Check, Sparkles, Flame, ChefHat, Trophy, ArrowRightLeft, Star } from 'lucide-react';
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
  backpack?: BackpackItem[];
  onSellItem?: (itemId: string, priceCoins: number) => void;
}

export const MarketShopModal: React.FC<MarketShopModalProps> = ({
  isOpen,
  onClose,
  cityName,
  countryName,
  coins,
  onDeductCoins,
  onAddBackpackItem,
  backpackItemIds,
  backpack = [],
  onSellItem
}) => {
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  const [activePrepItem, setActivePrepItem] = useState<MarketItem | null>(null);
  const [prepProgress, setPrepProgress] = useState<number>(0); // 0 - 100
  const [prepStep, setPrepStep] = useState<'heat' | 'flip' | 'season' | 'done'>('heat');
  const [sizzleTemp, setSizzleTemp] = useState<number>(50); // 0 - 100
  const [tempDirection, setTempDirection] = useState<number>(1);
  const [cookingScore, setCookingScore] = useState<number>(0);
  const [starRating, setStarRating] = useState<number>(3);
  const [lastStepFeedback, setLastStepFeedback] = useState<string>('');

  const prepTimerRef = useRef<number | null>(null);

  // Live Skillet Temperature & Timing Oscillation
  useEffect(() => {
    if (!isOpen || !activePrepItem || prepStep === 'done') return;

    const interval = setInterval(() => {
      setSizzleTemp(prev => {
        let next = prev + tempDirection * (prepStep === 'flip' ? 6 : 4);
        if (next >= 95) {
          next = 95;
          setTempDirection(-1);
        } else if (next <= 15) {
          next = 15;
          setTempDirection(1);
        }
        return next;
      });
    }, 45);

    return () => clearInterval(interval);
  }, [isOpen, activePrepItem, prepStep, tempDirection]);

  // Clean up state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setActivePrepItem(null);
      setPrepStep('heat');
      setCookingScore(0);
      setLastStepFeedback('');
    }
  }, [isOpen]);

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
    setPrepProgress(15);
    setSizzleTemp(30);
    setTempDirection(1);
    setCookingScore(0);
    setStarRating(3);
    setLastStepFeedback('');
    soundEffects.playSkilletSizzle(1.2, 0.18);
    gamepadManager.vibrate(80, 0.4, 0.2);
  };

  // Execute interactive cooking step based on timing needle
  const handlePrepAction = () => {
    if (!activePrepItem) return;

    gamepadManager.vibrate(60, 0.5, 0.3);

    if (prepStep === 'heat') {
      // Optimal Sear Zone: 65°C to 85°C
      const isPerfect = sizzleTemp >= 65 && sizzleTemp <= 85;
      const isGood = sizzleTemp >= 50 && sizzleTemp <= 92;
      const stepPts = isPerfect ? 35 : isGood ? 20 : 10;
      setCookingScore(s => s + stepPts);
      setLastStepFeedback(isPerfect ? '🔥 PERFECT SEAR (+35)' : isGood ? 'Sizzled nicely (+20)' : 'Over/under-seared (+10)');
      soundEffects.playSkilletSizzle(0.8, 0.2);

      setPrepStep('flip');
      setPrepProgress(50);
      setSizzleTemp(25);
    } else if (prepStep === 'flip') {
      // Optimal Flip Zone: 50% to 75%
      const isPerfect = sizzleTemp >= 50 && sizzleTemp <= 75;
      const isGood = sizzleTemp >= 35 && sizzleTemp <= 88;
      const stepPts = isPerfect ? 35 : isGood ? 20 : 10;
      setCookingScore(s => s + stepPts);
      setLastStepFeedback(isPerfect ? '✨ GOLDEN AIR FLIP (+35)' : isGood ? 'Solid toss (+20)' : 'Clumsy flip (+10)');
      soundEffects.playRadarPing(1100, 0.15);

      setPrepStep('season');
      setPrepProgress(80);
      setSizzleTemp(20);
    } else if (prepStep === 'season') {
      // Optimal Season Zone: 45% to 70%
      const isPerfect = sizzleTemp >= 45 && sizzleTemp <= 70;
      const stepPts = isPerfect ? 30 : 15;
      const finalScore = cookingScore + stepPts;
      setCookingScore(finalScore);

      const stars = finalScore >= 90 ? 3 : finalScore >= 60 ? 2 : 1;
      setStarRating(stars);

      setPrepStep('done');
      setPrepProgress(100);

      if (stars === 3) {
        soundEffects.playCrowdCheer(2.5, 0.2);
        confetti({
          particleCount: 100,
          spread: 75,
          origin: { y: 0.6 }
        });
      } else {
        soundEffects.playTriumphChime();
      }

      // Award master chef item to backpack
      onAddBackpackItem({
        id: `chef-${Date.now()}`,
        name: `${stars === 3 ? '★★★ Master' : stars === 2 ? '★★ Artisan' : '★ Fresh'} ${activePrepItem.name}`,
        category: activePrepItem.category,
        icon: activePrepItem.icon,
        city: cityName,
        country: countryName,
        description: `Handcrafted with street artisans in ${cityName}. Score: ${finalScore}/100. ${activePrepItem.description}`,
        acquiredAt: new Date().toISOString(),
        priceCoins: Math.round(activePrepItem.priceCoins * 1.5)
      });
    }
  };

  const closePrep = () => {
    if (prepTimerRef.current) clearInterval(prepTimerRef.current);
    setActivePrepItem(null);
    setPrepStep('heat');
  };

  // Sell Item from Backpack
  const handleSellBackpackItem = (item: BackpackItem) => {
    const sellPrice = item.priceCoins ? Math.max(15, Math.round(item.priceCoins * 0.8)) : 25;
    if (onSellItem) {
      onSellItem(item.id, sellPrice);
      soundEffects.playCoinSound();
    }
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
                Local Bakeries, Artisan Kitchens & Pawn Stalls in {cityName}, {countryName}
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

        {/* Navigation & Wallet Bar */}
        <div className="flex items-center justify-between gap-3 bg-slate-950/80 rounded-2xl px-4 py-2.5 border border-slate-800">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => { setActiveTab('buy'); closePrep(); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                activeTab === 'buy'
                  ? 'bg-amber-400 text-slate-950 border-amber-300'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-800'
              }`}
            >
              🛍️ Buy Goods
            </button>
            <button
              onClick={() => { setActiveTab('sell'); closePrep(); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border flex items-center gap-1 ${
                activeTab === 'sell'
                  ? 'bg-amber-400 text-slate-950 border-amber-300'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-800'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" /> Pawn & Sell Wares
            </button>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-sm font-black text-amber-400">
            <Coins className="w-4 h-4" /> {coins} Coins
          </div>
        </div>

        {/* Active Artisan Cooking/Crafting Minigame View */}
        {activePrepItem ? (
          <div className="bg-slate-900/90 border border-amber-400/60 rounded-2xl p-5 flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between w-full border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-300">
                <ChefHat className="w-4 h-4 text-amber-400" /> Street Chef Kitchen: {activePrepItem.name}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                  Prep: {prepProgress}%
                </span>
                <button onClick={closePrep} className="text-xs text-slate-400 hover:text-white">
                  Cancel
                </button>
              </div>
            </div>

            {/* Sizzle Viewport */}
            <div className="w-full h-36 bg-slate-950 rounded-2xl border border-amber-500/30 flex flex-col items-center justify-center relative overflow-hidden">
              <div className="text-5xl animate-bounce">{activePrepItem.icon}</div>

              {/* Sizzle heat glow */}
              <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-orange-500/30 to-transparent pointer-events-none" />

              <div className="absolute top-2 right-3 flex items-center gap-1 text-[11px] font-mono text-amber-400">
                <Flame className="w-3.5 h-3.5 animate-pulse text-orange-500" /> Sizzle Temp: {Math.round(sizzleTemp)}°C
              </div>

              {lastStepFeedback && (
                <div className="absolute bottom-2 font-mono text-xs font-bold text-amber-300 bg-black/70 px-3 py-1 rounded-full border border-amber-400/40 animate-pulse">
                  {lastStepFeedback}
                </div>
              )}
            </div>

            {/* Interactive Timing Gauge */}
            {prepStep !== 'done' && (
              <div className="w-full flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-mono font-bold">
                  <span className="text-amber-300">
                    {prepStep === 'heat' && 'Step 1: Hit Sizzle in the Green Sear Zone (65–85°C)!'}
                    {prepStep === 'flip' && 'Step 2: Quick Skillet Toss in the Golden Zone (50–75%)!'}
                    {prepStep === 'season' && 'Step 3: Garnish with Spices in the Precision Zone (45–70%)!'}
                  </span>
                </div>

                {/* Oscillating needle bar with target zone */}
                <div className="relative w-full h-5 bg-slate-900 rounded-full border border-slate-800 overflow-hidden p-0.5">
                  {/* Optimal Zone Highlight */}
                  <div
                    className="absolute top-0 bottom-0 bg-emerald-500/30 border-x border-emerald-400/70 pointer-events-none"
                    style={{
                      left: prepStep === 'heat' ? '65%' : prepStep === 'flip' ? '50%' : '45%',
                      width: prepStep === 'heat' ? '20%' : prepStep === 'flip' ? '25%' : '25%'
                    }}
                  />
                  {/* Moving Needle */}
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-75"
                    style={{ width: `${sizzleTemp}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-500">
                  <span>Cold</span>
                  <span className="text-emerald-400 font-bold">✦ GREEN ZONE = PERFECT RATING ✦</span>
                  <span>Scorched</span>
                </div>
              </div>
            )}

            {/* Cooking Results Card */}
            {prepStep === 'done' && (
              <div className="flex flex-col items-center gap-2 py-2">
                <div className="flex items-center gap-1 text-amber-400 text-2xl">
                  {Array.from({ length: starRating }).map((_, i) => (
                    <Star key={i} className="w-6 h-6 fill-amber-400" />
                  ))}
                </div>
                <div className="text-sm font-black text-amber-300 uppercase tracking-wide">
                  {starRating === 3 ? '★★★ 3-Star Master Chef Perfection!' : starRating === 2 ? '★★ Delicious Street Bite!' : '★ Hearty Local Meal!'}
                </div>
                <p className="text-xs text-slate-400 text-center max-w-sm">
                  Handmade specialty ready to enjoy or sell for Traveler Coins at any world market!
                </p>
              </div>
            )}

            {/* Action button */}
            {prepStep !== 'done' ? (
              <button
                onClick={handlePrepAction}
                className="w-full py-3 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-amber-400/20 active:scale-95 flex items-center justify-center gap-2"
              >
                <Flame className="w-4 h-4 fill-slate-950" />
                {prepStep === 'heat' && 'TIME SEAR! (Click in Green Zone)'}
                {prepStep === 'flip' && 'TOSS SKILLET! (Click in Golden Zone)'}
                {prepStep === 'season' && 'DROP SPICES! (Click in Precision Zone)'}
              </button>
            ) : (
              <button
                onClick={closePrep}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm rounded-2xl shadow-xl transition flex items-center justify-center gap-2"
              >
                <Trophy className="w-4 h-4" /> Stash Culinary Masterpiece in Backpack
              </button>
            )}
          </div>
        ) : activeTab === 'buy' ? (
          /* Market Wares Grid (Buy Mode) */
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

                    <h3 className="font-bold text-sm text-slate-100 mt-2">{item.name}</h3>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{item.description}</p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-amber-400">{item.priceCoins} Coins</span>

                    {isOwned ? (
                      <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Owned
                      </span>
                    ) : item.category === 'food' ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => startArtisanPrep(item)}
                          className="px-2.5 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-bold text-[10px] rounded-xl hover:from-orange-400 hover:to-amber-400 transition flex items-center gap-1"
                          title="Cook this dish live with interactive skillet heat!"
                        >
                          <Flame className="w-3 h-3 fill-slate-950" /> Cook Live
                        </button>
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
                    ) : (
                      <button
                        onClick={() => handleInstantBuy(item)}
                        disabled={!canAfford}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                          canAfford
                            ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 active:scale-95 shadow-md shadow-amber-400/20'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        Buy
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Pawn & Sell Wares Grid */
          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2.5">
            {backpack.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
                <ShoppingBag className="w-10 h-10 text-slate-700" />
                <div>Your backpack is completely empty.</div>
                <p className="text-[11px] text-slate-600 max-w-xs">
                  Catch fish in local waterways, take street photos, or buy souvenirs around the globe to pawn them here for coins!
                </p>
              </div>
            ) : (
              backpack.map(item => {
                const sellValue = item.priceCoins ? Math.max(15, Math.round(item.priceCoins * 0.8)) : 25;

                return (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-900/70 border border-slate-800 rounded-2xl flex items-center justify-between hover:border-amber-400/40 transition group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl p-1.5 bg-slate-950 rounded-xl border border-slate-800">{item.icon}</span>
                      <div>
                        <div className="font-bold text-xs text-slate-100 line-clamp-1">{item.name}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <span>{item.city}, {item.country}</span>
                          <span>•</span>
                          <span className="capitalize">{item.category}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="font-mono text-xs font-bold text-amber-400">
                        +{sellValue} Coins
                      </div>
                      <button
                        onClick={() => handleSellBackpackItem(item)}
                        className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl transition shadow active:scale-95 flex items-center gap-1"
                      >
                        <Coins className="w-3.5 h-3.5" /> Sell
                      </button>
                    </div>
                  </div>
                );
              })
            )}
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
