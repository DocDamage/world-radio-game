import React, { useRef, useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Radio, 
  Globe, 
  Footprints, 
  AlertCircle, 
  Heart, 
  SkipBack, 
  SkipForward, 
  Circle, 
  Square, 
  Download 
} from 'lucide-react';
import type { RadioStation } from '../types';
import { soundEffects } from '../services/audioEffects';

interface RadioPlayerBarProps {
  station: RadioStation | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onEnterStreetWalk: () => void;
  isStreetMode: boolean;
  onPrevStation?: () => void;
  onNextStation?: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  isRecording: boolean;
  recordDuration: number;
  onToggleRecord: () => void;
  isMysteryMode?: boolean;
}

export const RadioPlayerBar: React.FC<RadioPlayerBarProps> = ({
  station,
  isPlaying,
  onTogglePlay,
  onEnterStreetWalk,
  isStreetMode,
  onPrevStation,
  onNextStation,
  isFavorite,
  onToggleFavorite,
  isRecording,
  recordDuration,
  onToggleRecord,
  isMysteryMode = false
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [volume, setVolume] = useState<number>(() => {
    const saved = localStorage.getItem('world_radio_volume');
    return saved ? parseFloat(saved) : 0.8;
  });
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [streamError, setStreamError] = useState<boolean>(false);
  const [isLoadingStream, setIsLoadingStream] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);

  // Expose audio element for recording
  useEffect(() => {
    (window as any).__worldRadioAudio = audioRef.current;
  }, []);

  // When station changes, trigger radio static burst & load stream
  useEffect(() => {
    if (!station) return;
    soundEffects.playStaticBurst(0.25, 0.12);

    if (audioRef.current) {
      audioRef.current.src = station.streamUrl;
      if (isPlaying) {
        audioRef.current.play().catch(() => {
          setStreamError(true);
        });
      }
    }
  }, [station, isPlaying]);

  // Media Session API Integration
  useEffect(() => {
    if (!station || !('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: isMysteryMode ? 'Classified Mystery Frequency' : station.name,
      artist: isMysteryMode ? 'Unknown Location' : ([station.place, station.country].filter(Boolean).join(', ') || 'World Radio'),
      album: 'OpenRadio 3D Explorer',
    });

    navigator.mediaSession.setActionHandler('play', onTogglePlay);
    navigator.mediaSession.setActionHandler('pause', onTogglePlay);
    if (onPrevStation) navigator.mediaSession.setActionHandler('previoustrack', onPrevStation);
    if (onNextStation) navigator.mediaSession.setActionHandler('nexttrack', onNextStation);

    return () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
      }
    };
  }, [station, isMysteryMode, onTogglePlay, onPrevStation, onNextStation]);

  // Sync isPlaying state
  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.play().catch(() => setStreamError(true));
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  // Sync and persist volume
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = isMuted ? 0 : volume;
    localStorage.setItem('world_radio_volume', volume.toString());
  }, [volume, isMuted]);

  const handleRetryStream = () => {
    setStreamError(false);
    setIsLoadingStream(true);
    if (audioRef.current && station) {
      audioRef.current.src = station.streamUrl;
      audioRef.current.play().catch(() => {
        setStreamError(true);
        setIsLoadingStream(false);
      });
    }
  };

  // Format record timer (MM:SS)
  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleDownloadDirectStream = () => {
    if (!station) return;
    const a = document.createElement('a');
    a.href = station.streamUrl;
    a.target = '_blank';
    a.rel = 'noreferrer';
    a.download = `${station.name}.mp3`;
    a.click();
  };

  // Sync volume
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 w-11/12 max-w-3xl bg-slate-900/90 backdrop-blur-xl border border-lime-400/30 rounded-3xl p-3 px-5 shadow-2xl shadow-black/80 text-slate-100 flex items-center justify-between gap-4">
      <audio
        ref={audioRef}
        onLoadStart={() => {
          setIsLoadingStream(true);
          setStreamError(false);
        }}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => {
          setIsBuffering(false);
          setIsLoadingStream(false);
          setStreamError(false);
        }}
        onCanPlay={() => {
          setIsLoadingStream(false);
          setIsBuffering(false);
        }}
        onError={() => {
          setStreamError(true);
          setIsLoadingStream(false);
          setIsBuffering(false);
        }}
      />

      {/* Station Info */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-lime-400 to-emerald-600 p-0.5 shadow-md flex-shrink-0 flex items-center justify-center overflow-hidden">
            <Radio className="w-6 h-6 text-slate-950" />
          </div>
          {isPlaying && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-lime-400" />
            </span>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-slate-100 truncate">
              {isMysteryMode
                ? '🕵️ Classified Frequency'
                : station
                ? station.name
                : 'Select a Station on the Globe'}
            </h3>
            {isPlaying && (
              <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded">
                ON AIR
              </span>
            )}
            {isBuffering && isPlaying && !streamError && (
              <span className="text-[10px] font-mono bg-sky-950 text-sky-400 border border-sky-500/30 px-1.5 py-0.5 rounded animate-pulse">
                BUFFERING
              </span>
            )}
            {streamError && (
              <div className="flex items-center gap-1.5">
                <span className="flex items-center gap-1 text-[10px] text-rose-300 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-500/40">
                  <AlertCircle className="w-3 h-3 text-rose-400" /> Stream Unavailable
                </span>
                <button
                  onClick={handleRetryStream}
                  className="text-[10px] bg-slate-800 hover:bg-slate-700 text-lime-400 px-2 py-0.5 rounded border border-slate-700"
                >
                  Retry
                </button>
                {onNextStation && (
                  <button
                    onClick={onNextStation}
                    className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded border border-slate-700"
                  >
                    Next Station
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs text-slate-400 truncate">
              {isMysteryMode
                ? 'Location hidden for Detective Investigation'
                : station
                ? `${station.place ? station.place + ', ' : ''}${station.country}`
                : 'Explore worldwide broadcasts in 3D'}
            </p>
            {/* Live Audio Equalizer Waveform */}
            {isPlaying && !streamError && (
              <div className="flex items-end gap-0.5 h-3">
                <div className="w-1 bg-lime-400 rounded-full animate-[pulse_0.6s_ease-in-out_infinite] h-full" />
                <div className="w-1 bg-lime-400 rounded-full animate-[pulse_0.9s_ease-in-out_infinite_0.2s] h-3/4" />
                <div className="w-1 bg-lime-400 rounded-full animate-[pulse_0.4s_ease-in-out_infinite_0.4s] h-4/5" />
                <div className="w-1 bg-lime-400 rounded-full animate-[pulse_0.8s_ease-in-out_infinite_0.1s] h-2/3" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Playback Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {onPrevStation && (
          <button
            onClick={onPrevStation}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            title="Previous Station"
          >
            <SkipBack className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={onTogglePlay}
          disabled={!station}
          className={`p-3 rounded-2xl font-bold transition shadow-lg flex items-center justify-center ${
            isPlaying
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/30'
              : 'bg-lime-400 hover:bg-lime-300 text-slate-950 shadow-lime-400/30'
          } disabled:opacity-50 disabled:cursor-not-allowed active:scale-95`}
          title={isPlaying ? 'Pause Broadcast' : 'Tune In'}
        >
          {isLoadingStream ? (
            <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-5 h-5 fill-slate-950" />
          ) : (
            <Play className="w-5 h-5 fill-slate-950 ml-0.5" />
          )}
        </button>

        {onNextStation && (
          <button
            onClick={onNextStation}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            title="Next Station"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        )}

        {/* Favorite Heart Button */}
        {onToggleFavorite && station && (
          <button
            onClick={onToggleFavorite}
            className={`p-2.5 rounded-xl border transition ${
              isFavorite
                ? 'bg-rose-950/60 border-rose-500/50 text-rose-400'
                : 'bg-slate-800/80 border-slate-700/60 text-slate-400 hover:text-white'
            }`}
            title={isFavorite ? 'Remove from favorites (F)' : 'Add to favorites (F)'}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500' : ''}`} />
          </button>
        )}

        {/* Record Live Audio Button */}
        {station && (
          <button
            onClick={onToggleRecord}
            className={`px-3 py-2 rounded-xl font-bold text-xs border transition flex items-center gap-1.5 active:scale-95 shadow-md ${
              isRecording
                ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400 animate-pulse shadow-rose-600/40'
                : 'bg-slate-800/80 hover:bg-slate-700 text-rose-400 border-rose-500/30'
            }`}
            title={isRecording ? 'Stop Recording & Save Audio File (R or Controller X)' : 'Record Live Audio (R or Controller X)'}
          >
            {isRecording ? (
              <>
                <Square className="w-3.5 h-3.5 fill-white" />
                <span className="font-mono">{formatTimer(recordDuration)}</span>
              </>
            ) : (
              <>
                <Circle className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                <span className="hidden sm:inline">REC</span>
              </>
            )}
          </button>
        )}

        {/* Direct Stream Download Button */}
        {station && (
          <button
            onClick={handleDownloadDirectStream}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            title="Download / Open Live Audio Stream (.mp3/.aac)"
          >
            <Download className="w-4 h-4" />
          </button>
        )}

        {/* Volume Slider */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="text-slate-400 hover:text-white transition"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={e => {
              setVolume(parseFloat(e.target.value));
              setIsMuted(false);
            }}
            className="w-16 accent-lime-400 cursor-pointer h-1 bg-slate-700 rounded-lg"
          />
        </div>

        {/* Street Walk / Orbit View Toggle */}
        <button
          onClick={onEnterStreetWalk}
          disabled={!station}
          className={`px-4 py-2.5 rounded-2xl font-bold text-xs transition border flex items-center gap-1.5 shadow-md ${
            isStreetMode
              ? 'bg-gradient-to-r from-lime-400 to-emerald-400 text-slate-950 border-lime-300'
              : 'bg-slate-800 hover:bg-slate-700 text-lime-300 border-lime-400/30'
          } disabled:opacity-40 disabled:cursor-not-allowed active:scale-95`}
        >
          {isStreetMode ? (
            <>
              <Globe className="w-4 h-4" /> Back to Orbit
            </>
          ) : (
            <>
              <Footprints className="w-4 h-4" /> Walk Streets
            </>
          )}
        </button>
      </div>
    </div>
  );
};

