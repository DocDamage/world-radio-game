import React, { useState } from 'react';
import { Backpack, X, MapPin, Calendar, Trash2, Eye, Coins, Camera, Disc, Fish, Sparkles } from 'lucide-react';
import type { BackpackItem } from '../types';
import { soundEffects } from '../services/audioEffects';

interface BackpackModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: BackpackItem[];
  onRemoveItem: (id: string) => void;
  onSellItem?: (id: string, price: number) => void;
}

export const BackpackModal: React.FC<BackpackModalProps> = ({
  isOpen,
  onClose,
  items,
  onRemoveItem,
  onSellItem
}) => {
  const [filter, setFilter] = useState<'all' | 'food' | 'souvenir' | 'fish' | 'vinyl' | 'photo'>('all');
  const [inspectedItem, setInspectedItem] = useState<BackpackItem | null>(null);

  if (!isOpen) return null;

  const filteredItems = filter === 'all' ? items : items.filter(i => i.category === filter);

  const handleSell = (item: BackpackItem) => {
    const sellPrice = item.priceCoins ? Math.max(15, Math.round(item.priceCoins * 0.8)) : 25;
    if (onSellItem) {
      onSellItem(item.id, sellPrice);
      soundEffects.playCoinSound();
      if (inspectedItem?.id === item.id) {
        setInspectedItem(null);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-lime-400/30 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 text-slate-100 max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-lime-950/80 border border-lime-400/50 rounded-2xl text-lime-400">
              <Backpack className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-100 tracking-wide font-sans">
                Adventure Backpack & Souvenirs
              </h2>
              <p className="text-xs text-slate-400">
                {items.length} item{items.length === 1 ? '' : 's'} gathered across the world • Click to inspect details
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

        {/* Category Filter Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'all', label: `All (${items.length})` },
            { id: 'food', label: 'Street Food' },
            { id: 'vinyl', label: 'Vinyl Records' },
            { id: 'fish', label: 'Fish Catches' },
            { id: 'photo', label: 'Photos & Postcards' },
            { id: 'souvenir', label: 'Souvenirs' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl font-bold transition border whitespace-nowrap ${
                filter === tab.id
                  ? 'bg-lime-400 text-slate-950 border-lime-300'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Inventory Grid */}
        <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredItems.length === 0 ? (
            <div className="col-span-2 py-16 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
              <Backpack className="w-10 h-10 text-slate-700" />
              <div>No items in this pocket yet.</div>
              <p className="text-[11px] text-slate-600">
                Go to city markets, catch fish along waterways, shoot photos, or buy rare records!
              </p>
            </div>
          ) : (
            filteredItems.map(item => {
              const sellValue = item.priceCoins ? Math.max(15, Math.round(item.priceCoins * 0.8)) : 25;

              return (
                <div
                  key={item.id}
                  onClick={() => setInspectedItem(item)}
                  className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col justify-between hover:border-lime-400/50 transition cursor-pointer group shadow-sm hover:shadow-lg"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <span className="text-3xl p-1 bg-slate-950 rounded-xl border border-slate-800 group-hover:scale-110 transition">{item.icon}</span>
                      <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => handleSell(item)}
                          className="text-[10px] font-mono text-amber-400 hover:text-amber-300 px-2 py-0.5 rounded-lg bg-amber-950/60 border border-amber-500/30 flex items-center gap-1"
                          title="Sell for coins"
                        >
                          <Coins className="w-3 h-3" /> +{sellValue}
                        </button>
                        <button
                          onClick={() => onRemoveItem(item.id)}
                          className="text-slate-600 hover:text-rose-400 transition p-1"
                          title="Discard item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <h4 className="font-bold text-sm text-slate-100 mt-2 line-clamp-1">{item.name}</h4>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">{item.description}</p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span className="flex items-center gap-1 text-slate-400 truncate max-w-[150px]">
                      <MapPin className="w-3 h-3 text-lime-400 shrink-0" /> {item.city}, {item.country}
                    </span>
                    <span className="text-lime-400 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition">
                      <Eye className="w-3 h-3" /> Inspect
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Item Detail Inspection Card Modal */}
        {inspectedItem && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md rounded-3xl p-6 z-20 flex flex-col justify-between animate-in zoom-in-95 duration-150 border border-lime-400/40">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-lime-400 uppercase">
                <Sparkles className="w-4 h-4" /> Item Showcase • {inspectedItem.category}
              </div>
              <button
                onClick={() => setInspectedItem(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Showcase */}
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-4">
              <div className="relative">
                <span className="text-6xl p-4 bg-slate-900 rounded-3xl border border-slate-700 shadow-2xl block animate-bounce">
                  {inspectedItem.icon}
                </span>
                {inspectedItem.category === 'photo' && (
                  <Camera className="w-5 h-5 text-lime-400 absolute -bottom-1 -right-1 bg-slate-950 rounded-full p-0.5" />
                )}
                {inspectedItem.category === 'vinyl' && (
                  <Disc className="w-5 h-5 text-purple-400 absolute -bottom-1 -right-1 bg-slate-950 rounded-full p-0.5 animate-spin" />
                )}
                {inspectedItem.category === 'fish' && (
                  <Fish className="w-5 h-5 text-sky-400 absolute -bottom-1 -right-1 bg-slate-950 rounded-full p-0.5" />
                )}
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-100">{inspectedItem.name}</h3>
                <div className="flex items-center justify-center gap-2 text-xs font-mono text-lime-400 mt-1">
                  <MapPin className="w-3.5 h-3.5" /> {inspectedItem.city}, {inspectedItem.country}
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 max-w-md text-xs text-slate-300 leading-relaxed">
                {inspectedItem.description}
              </div>

              <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Logged {new Date(inspectedItem.acquiredAt).toLocaleDateString()}
                </span>
                <span>•</span>
                <span className="text-amber-400 font-bold">
                  Estimated Value: {inspectedItem.priceCoins ? Math.max(15, Math.round(inspectedItem.priceCoins * 0.8)) : 25} Coins
                </span>
              </div>
            </div>

            {/* Inspection Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                onClick={() => {
                  onRemoveItem(inspectedItem.id);
                  setInspectedItem(null);
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-rose-950/80 text-rose-400 border border-slate-800 hover:border-rose-500/40 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" /> Discard
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSell(inspectedItem)}
                  className="px-5 py-2 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-xs rounded-xl transition shadow flex items-center gap-1.5"
                >
                  <Coins className="w-4 h-4" /> Pawn for {inspectedItem.priceCoins ? Math.max(15, Math.round(inspectedItem.priceCoins * 0.8)) : 25} Coins
                </button>
                <button
                  onClick={() => setInspectedItem(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

