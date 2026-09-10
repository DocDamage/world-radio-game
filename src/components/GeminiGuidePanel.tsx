import React, { useState } from 'react';
import { Key, Sparkles, Compass, HelpCircle, Bot, X } from 'lucide-react';
import type { RadioStation } from '../types';
import { askGeminiGuide } from '../services/geminiApi';
import { useModalA11y } from '../hooks/useModalA11y';

interface GeminiGuidePanelProps {
  apiKey: string;
  onSaveApiKey: (key: string) => void;
  activeStation: RadioStation | null;
  isOpen: boolean;
  onClose: () => void;
}

export const GeminiGuidePanel: React.FC<GeminiGuidePanelProps> = ({
  apiKey,
  onSaveApiKey,
  activeStation,
  isOpen,
  onClose
}) => {
  const [inputKey, setInputKey] = useState(apiKey);
  const [guideText, setGuideText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'guide' | 'scavenger' | 'trivia'>('guide');

  const handleFetchGuide = async (mode: 'guide' | 'scavenger' | 'trivia') => {
    if (!activeStation) return;
    setActiveTab(mode);
    setLoading(true);

    const city = activeStation.place || activeStation.country;
    const country = activeStation.country;
    const stationName = activeStation.name;
    const genre = activeStation.tags || 'Music';

    const text = await askGeminiGuide(apiKey, city, country, stationName, genre, mode);
    setGuideText(text);
    setLoading(false);
  };

  // Shared modal a11y: Escape to close, focus trap, focus restore
  const { containerRef: dialogRef, dialogProps } = useModalA11y({ isOpen, onClose });

  if (!isOpen) return null;

  return (
    <div
      ref={dialogRef}
      {...dialogProps}
      className="fixed top-20 right-6 z-40 w-96 max-w-[calc(100vw-3rem)] bg-slate-900/95 backdrop-blur-md border border-cyan-500/40 rounded-3xl p-5 shadow-2xl text-slate-100 flex flex-col gap-4 animate-in fade-in slide-in-from-right duration-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-tr from-cyan-500 to-indigo-500 rounded-xl text-white">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-sm tracking-wide text-cyan-300">Gemini Street Companion</div>
            <div className="text-[11px] text-slate-400">AI Local Guide & Neighborhood Host</div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* API Key Config Input */}
      <div className="flex flex-col gap-1.5 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <Key className="w-3.5 h-3.5 text-cyan-400" /> Gemini API Key
          </span>
          <span className="text-[10px] text-slate-500">Stored locally in browser</span>
        </div>
        <div className="flex gap-2">
          <input
            type="password"
            placeholder="Paste your Google Gemini API Key"
            value={inputKey}
            onChange={e => setInputKey(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-400 font-mono"
          />
          <button
            onClick={() => onSaveApiKey(inputKey)}
            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl transition"
          >
            Save
          </button>
        </div>
      </div>

      {/* Guide Tabs */}
      <div className="flex bg-slate-950 rounded-xl p-1 gap-1 border border-slate-800 text-xs">
        <button
          onClick={() => handleFetchGuide('guide')}
          className={`flex-1 py-1.5 rounded-lg font-medium transition flex items-center justify-center gap-1 ${
            activeTab === 'guide' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Compass className="w-3.5 h-3.5" /> Neighborhood
        </button>
        <button
          onClick={() => handleFetchGuide('scavenger')}
          className={`flex-1 py-1.5 rounded-lg font-medium transition flex items-center justify-center gap-1 ${
            activeTab === 'scavenger' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" /> Scavenger
        </button>
        <button
          onClick={() => handleFetchGuide('trivia')}
          className={`flex-1 py-1.5 rounded-lg font-medium transition flex items-center justify-center gap-1 ${
            activeTab === 'trivia' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" /> Trivia
        </button>
      </div>

      {/* Output Content */}
      <div className="min-h-28 bg-slate-950/80 rounded-2xl p-4 border border-slate-800 text-xs text-slate-300 leading-relaxed flex flex-col justify-between">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-6 text-cyan-400 gap-2">
            <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-[11px] text-slate-400">Consulting local Gemini guide...</span>
          </div>
        ) : guideText ? (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 mb-1 flex items-center gap-1">
              <Bot className="w-3 h-3" /> Local Dispatch: {activeStation?.place || activeStation?.country}
            </div>
            {guideText}
          </div>
        ) : (
          <div className="text-center py-6 text-slate-500">
            Click one of the buttons above to ask your AI guide about this neighborhood, request a street scavenger target, or hear local trivia!
          </div>
        )}
      </div>
    </div>
  );
};
