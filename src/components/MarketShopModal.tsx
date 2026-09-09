import React from 'react';
import { ShoppingBag, Coins, X, Check, Sparkles } from 'lucide-react';
import { getCityMarketItems } from '../services/activityData';
import { soundEffects } from '../services/audioEffects';
import type { BackpackItem } from '../types';

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
  if (!isOpen) return null;

  const { marketName, items } = getCityMarketItems(cityName, countryName);

  const handleBuy = (item: typeof items[0]) => {
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

        {/* Market Wares Grid */}
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

                <div className="mt-4 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5" /> {item.priceCoins} Coins
                  </div>

                  {isOwned ? (
                    <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                      <Check className="w-4 h-4" /> In Backpack
                    </span>
                  ) : (
                    <button
                      onClick={() => handleBuy(item)}
                      disabled={!canAfford}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                        canAfford
                          ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 active:scale-95 shadow-md shadow-amber-400/20'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {canAfford ? 'Purchase' : 'Need Coins'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Earn coins by walking, mystery games & fishing
          </span>
          <span className="font-mono text-[10px] text-slate-500">SAVED IN BACKPACK</span>
        </div>
      </div>
    </div>
  );
};
