import React, { useState } from 'react';
import { Backpack, X, MapPin, Calendar, Trash2 } from 'lucide-react';
import type { BackpackItem } from '../types';

interface BackpackModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: BackpackItem[];
  onRemoveItem: (id: string) => void;
}

export const BackpackModal: React.FC<BackpackModalProps> = ({
  isOpen,
  onClose,
  items,
  onRemoveItem
}) => {
  const [filter, setFilter] = useState<'all' | 'food' | 'souvenir' | 'fish' | 'vinyl'>('all');

  if (!isOpen) return null;

  const filteredItems = filter === 'all' ? items : items.filter(i => i.category === filter);

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
                {items.length} item{items.length === 1 ? '' : 's'} gathered across the world
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
            { id: 'souvenir', label: 'Souvenirs' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl font-bold transition border ${
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
                Go to city markets, catch fish along the water, or buy rare records in street shops!
              </p>
            </div>
          ) : (
            filteredItems.map(item => (
              <div
                key={item.id}
                className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col justify-between hover:border-lime-400/40 transition group"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <span className="text-3xl p-1 bg-slate-950 rounded-xl border border-slate-800">{item.icon}</span>
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="text-slate-600 hover:text-rose-400 transition p-1"
                      title="Discard item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <h4 className="font-bold text-sm text-slate-100 mt-2">{item.name}</h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{item.description}</p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span className="flex items-center gap-1 text-slate-400">
                    <MapPin className="w-3 h-3 text-lime-400" /> {item.city}, {item.country}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {new Date(item.acquiredAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
