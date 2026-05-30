'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import type { Station } from '@/types/Station';

export interface ShortcutDef {
  label: string;
  keys: string[];
  group: 'Playback' | 'Navigation' | 'App';
}

interface UseKeyboardShortcutsOptions {
  togglePlay: () => void;
  toggleMute: () => void;
  handleVolumeChange: (v: number) => void;
  volume: number;
  playStation: (station: Station) => void;
  filteredStations: Station[];
  currentStation: Station | null;
  favorites: Set<number>;
  toggleFavorite: (station: Station) => void;
  setSearchTerm: (term: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement>;
  isCheatsheetOpen: boolean;
  onToggleCheatsheet: () => void;
  onCloseCheatsheet: () => void;
}

function isInputFocused(): boolean {
  const tag = document.activeElement?.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

export const SHORTCUTS: ShortcutDef[] = [
  { label: 'Play / Pause',          keys: ['Space'], group: 'Playback' },
  { label: 'Volume Up',             keys: ['>'],     group: 'Playback' },
  { label: 'Volume Down',           keys: ['<'],     group: 'Playback' },
  { label: 'Previous Station',      keys: ['←'],     group: 'Playback' },
  { label: 'Next Station',          keys: ['→'],     group: 'Playback' },
  { label: 'Station Above',         keys: ['↑'],     group: 'Playback' },
  { label: 'Station Below',         keys: ['↓'],     group: 'Playback' },
  { label: 'Mute / Unmute',         keys: ['M'],     group: 'Playback' },
  { label: 'Favorite station',      keys: ['F'],     group: 'Playback' },
  { label: 'Focus search',          keys: ['/'],     group: 'Navigation' },
  { label: 'Clear search / close',  keys: ['Esc'],   group: 'Navigation' },
  { label: 'Toggle theme',          keys: ['T'],     group: 'App' },
  { label: 'Show shortcuts',        keys: ['?'],     group: 'App' },
];

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions): ShortcutDef[] {
  const { theme, setTheme } = useTheme();
  const {
    togglePlay, toggleMute, handleVolumeChange, volume,
    playStation, filteredStations, currentStation, favorites, toggleFavorite,
    setSearchTerm, searchInputRef,
    isCheatsheetOpen, onToggleCheatsheet, onCloseCheatsheet,
  } = options;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape: priority — cheatsheet > search clear
      if (e.key === 'Escape') {
        if (isCheatsheetOpen) { onCloseCheatsheet(); return; }
        if (searchInputRef.current && document.activeElement === searchInputRef.current) {
          setSearchTerm('');
          searchInputRef.current.blur();
        }
        return;
      }

      // / focuses search, but not if any input is already focused
      if (e.key === '/') {
        if (isInputFocused()) return;
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // All other shortcuts suppressed when an input is focused
      if (isInputFocused()) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          if (currentStation) {
            togglePlay();
          } else if (filteredStations.length > 0) {
            const firstFavorite = filteredStations.find(s => favorites.has(s.id));
            playStation(firstFavorite ?? filteredStations[0]);
          }
          break;

        case '>':
          e.preventDefault();
          handleVolumeChange(Math.min(1, volume + 0.1));
          break;

        case '<':
          e.preventDefault();
          handleVolumeChange(Math.max(0, volume - 0.1));
          break;

        case 'ArrowLeft':
        case 'ArrowRight': {
          e.preventDefault();
          if (filteredStations.length === 0) break;
          const currentIdx = currentStation
            ? filteredStations.findIndex(s => s.id === currentStation.id)
            : -1;
          if (e.key === 'ArrowRight') {
            const next = currentIdx === -1 ? 0 : (currentIdx + 1) % filteredStations.length;
            playStation(filteredStations[next]);
          } else {
            const prev = currentIdx === -1
              ? filteredStations.length - 1
              : (currentIdx - 1 + filteredStations.length) % filteredStations.length;
            playStation(filteredStations[prev]);
          }
          break;
        }

        case 'ArrowUp':
        case 'ArrowDown': {
          e.preventDefault();
          if (filteredStations.length === 0) break;
          const idx = currentStation
            ? filteredStations.findIndex(s => s.id === currentStation.id)
            : -1;
          // Match the grid column count from StationGrid: cols-1 / sm:2 / lg:3 / xl:4
          const w = window.innerWidth;
          const cols = w >= 1280 ? 4 : w >= 1024 ? 3 : w >= 640 ? 2 : 1;
          if (e.key === 'ArrowDown') {
            const next = idx === -1 ? 0 : Math.min(idx + cols, filteredStations.length - 1);
            playStation(filteredStations[next]);
          } else {
            const prev = idx === -1
              ? filteredStations.length - 1
              : Math.max(idx - cols, 0);
            playStation(filteredStations[prev]);
          }
          break;
        }

        case 'm':
        case 'M':
          toggleMute();
          break;

        case 'f':
        case 'F':
          if (currentStation) toggleFavorite(currentStation);
          break;

        case 't':
        case 'T':
          setTheme(theme === 'light' ? 'dark' : 'light');
          break;

        case '?':
          onToggleCheatsheet();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    togglePlay, toggleMute, handleVolumeChange, volume,
    playStation, filteredStations, currentStation, favorites, toggleFavorite,
    setSearchTerm, searchInputRef,
    isCheatsheetOpen, onToggleCheatsheet, onCloseCheatsheet,
    theme, setTheme,
  ]);

  return SHORTCUTS;
}
