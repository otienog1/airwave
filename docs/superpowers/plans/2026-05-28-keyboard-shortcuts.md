# Keyboard Shortcuts — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 11 keyboard shortcuts to Airwave with button tooltips and a `?` cheatsheet overlay, fully dark-mode-aware and accessible.

**Architecture:** A single `useKeyboardShortcuts` hook at `ModernAirwave` level registers one `document` keydown listener and returns the shortcut definitions consumed by the cheatsheet modal. `ShortcutCheatsheet` is built from scratch (not using the existing light-mode-only `Modal.tsx`) so it uses CSS vars and respects dark mode. Five existing files get small, focused edits.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Tailwind CSS v3, `next-themes` (theme toggle), `@base-ui/react` (existing Tooltip), Lucide React, `tw-animate-css` (entry animations).

---

## File Map

| Status | File | Responsibility |
|--------|------|----------------|
| Create | `hooks/useKeyboardShortcuts.ts` | All shortcut logic, one keydown listener, returns `ShortcutDef[]` |
| Create | `components/ui/ShortcutCheatsheet.tsx` | `?` modal with focus trap, dark-mode CSS vars, accessible |
| Modify | `components/station/SearchAndFilters.tsx` | Add `forwardRef` so caller can focus the search input |
| Modify | `components/player/PlayControl.tsx` | Wrap button in Tooltip showing `Space` hint |
| Modify | `components/player/VolumeControl.tsx` | Wrap mute button in Tooltip showing `M` hint |
| Modify | `components/MordernAirwave.tsx` | Wire hook + cheatsheet + `searchInputRef` |

---

## Task 1: `useKeyboardShortcuts` hook

**Files:**
- Create: `hooks/useKeyboardShortcuts.ts`

- [ ] **Step 1: Create the hook file**

```ts
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
  { label: 'Play / Pause',       keys: ['Space'], group: 'Playback' },
  { label: 'Volume Up',          keys: ['↑'],     group: 'Playback' },
  { label: 'Volume Down',        keys: ['↓'],     group: 'Playback' },
  { label: 'Previous Station',   keys: ['←'],     group: 'Playback' },
  { label: 'Next Station',       keys: ['→'],     group: 'Playback' },
  { label: 'Mute / Unmute',      keys: ['M'],     group: 'Playback' },
  { label: 'Favorite station',   keys: ['F'],     group: 'Playback' },
  { label: 'Focus search',       keys: ['/'],     group: 'Navigation' },
  { label: 'Clear search / close', keys: ['Esc'], group: 'Navigation' },
  { label: 'Toggle theme',       keys: ['T'],     group: 'App' },
  { label: 'Show shortcuts',     keys: ['?'],     group: 'App' },
];

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions): ShortcutDef[] {
  const { theme, setTheme } = useTheme();
  const {
    togglePlay, toggleMute, handleVolumeChange, volume,
    playStation, filteredStations, currentStation, toggleFavorite,
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

      // / always focuses search
      if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // All other shortcuts suppressed when an input is focused
      if (isInputFocused()) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;

        case 'ArrowUp':
          e.preventDefault();
          handleVolumeChange(Math.min(1, volume + 0.1));
          break;

        case 'ArrowDown':
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
          setTheme(theme === 'dark' ? 'light' : 'dark');
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
    playStation, filteredStations, currentStation, toggleFavorite,
    setSearchTerm, searchInputRef,
    isCheatsheetOpen, onToggleCheatsheet, onCloseCheatsheet,
    theme, setTheme,
  ]);

  return SHORTCUTS;
}
```

Write this to `hooks/useKeyboardShortcuts.ts`.

- [ ] **Step 2: Type-check**

```powershell
npx tsc --noEmit
```

Expected: no errors related to `useKeyboardShortcuts.ts`. Other pre-existing errors are acceptable.

- [ ] **Step 3: Commit**

```bash
git add hooks/useKeyboardShortcuts.ts
git commit -m "feat: add useKeyboardShortcuts hook with 11 shortcuts"
```

---

## Task 2: `ShortcutCheatsheet` component

**Files:**
- Create: `components/ui/ShortcutCheatsheet.tsx`

UI/UX requirements applied here:
- `role="dialog"` + `aria-modal="true"` + `aria-label` (WCAG keyboard navigation)
- Focus trap: Tab/Shift+Tab cycles within modal; focus returns to trigger on close
- Scale+fade enter animation respecting `prefers-reduced-motion` via `motion-safe:` Tailwind prefix
- Scrim `bg-black/50` (50% opacity — within the 40–60% accessible range)
- All colors via CSS vars — no hardcoded hex — works in both light and dark mode
- `<kbd>` elements styled to match the dark-mode mockup from brainstorming

- [ ] **Step 1: Create the component file**

```tsx
'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { ShortcutDef } from '@/hooks/useKeyboardShortcuts';

interface ShortcutCheatsheetProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: ShortcutDef[];
}

const GROUPS: ShortcutDef['group'][] = ['Playback', 'Navigation', 'App'];

export const ShortcutCheatsheet: React.FC<ShortcutCheatsheetProps> = ({
  isOpen,
  onClose,
  shortcuts,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Save and restore focus
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement;
    } else {
      triggerRef.current?.focus();
    }
  }, [isOpen]);

  // Focus trap
  useEffect(() => {
    if (!isOpen) return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusable = dialog.querySelectorAll<HTMLElement>(
      'button, [href], input, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };

    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  // Prevent background scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      aria-hidden="false"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-150"
        style={{
          background: 'var(--color-surface, #1a1a2e)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <h2
            className="text-base font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            aria-label="Close shortcuts"
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors duration-150 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcut groups */}
        {GROUPS.map((group, gi) => {
          const rows = shortcuts.filter(s => s.group === group);
          if (rows.length === 0) return null;
          return (
            <div key={group}>
              {gi > 0 && (
                <div style={{ borderTop: '1px solid var(--color-border)' }} />
              )}
              <div
                className="px-5 pt-4 pb-1 text-xs font-semibold tracking-widest uppercase"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {group}
              </div>
              {rows.map(({ label, keys }) => (
                <div
                  key={label}
                  className="flex items-center justify-between px-5 py-2"
                >
                  <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    {label}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {keys.map(k => (
                      <kbd
                        key={k}
                        className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-md text-xs font-mono"
                        style={{
                          background: 'rgba(255,255,255,0.07)',
                          border: '1px solid var(--color-border)',
                          color: 'var(--color-text-primary)',
                        }}
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        })}

        {/* Footer note */}
        <p
          className="px-5 py-3 text-xs text-center"
          style={{
            borderTop: '1px solid var(--color-border)',
            color: 'var(--color-text-muted)',
          }}
        >
          Shortcuts are disabled while typing in search
        </p>
      </div>
    </div>
  );
};
```

Write this to `components/ui/ShortcutCheatsheet.tsx`.

- [ ] **Step 2: Type-check**

```powershell
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/ui/ShortcutCheatsheet.tsx
git commit -m "feat: add ShortcutCheatsheet modal with focus trap and dark-mode CSS vars"
```

---

## Task 3: `SearchAndFilters` — add `forwardRef`

The hook needs to imperatively focus the search input via a ref. We expose the ref by converting the component to use `forwardRef`.

**Files:**
- Modify: `components/station/SearchAndFilters.tsx`

- [ ] **Step 1: Apply the diff**

Replace the opening line and component declaration:

Old:
```tsx
import React from 'react';
import { Search, X } from 'lucide-react';
```

New (add `forwardRef` to the import and replace the export):
```tsx
import React, { forwardRef } from 'react';
import { Search, X } from 'lucide-react';
```

Replace the component function signature — old:
```tsx
export const SearchAndFilters: React.FC<SearchAndFiltersProps> = ({
    searchTerm,
    onSearchChange,
    selectedGenre,
    onGenreChange,
    selectedRegion,
    onRegionChange,
    genres,
    regions,
    stationCount,
}) => {
```

New:
```tsx
export const SearchAndFilters = forwardRef<HTMLInputElement, SearchAndFiltersProps>(({
    searchTerm,
    onSearchChange,
    selectedGenre,
    onGenreChange,
    selectedRegion,
    onRegionChange,
    genres,
    regions,
    stationCount,
}, ref) => {
```

Add `ref={ref}` to the `<input>` element (currently around line 49):

Old:
```tsx
                    <input
                        type="text"
                        placeholder="Search stations..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
```

New:
```tsx
                    <input
                        ref={ref}
                        type="text"
                        placeholder="Search stations..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
```

Close the `forwardRef` wrapper — at the very end of the file, replace:
```tsx
};
```
with:
```tsx
});
SearchAndFilters.displayName = 'SearchAndFilters';
```

- [ ] **Step 2: Type-check**

```powershell
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/station/SearchAndFilters.tsx
git commit -m "feat: forward ref on SearchAndFilters search input"
```

---

## Task 4: `PlayControl` — add `Space` tooltip

The existing `@base-ui/react` Tooltip supports a `<kbd data-slot="kbd">` inside `TooltipContent` for styled key hints. Wrap the play/pause button.

**Files:**
- Modify: `components/player/PlayControl.tsx`

- [ ] **Step 1: Apply the diff**

Old imports:
```tsx
import React from 'react';
import { Play, Pause, Loader2 } from 'lucide-react';
```

New:
```tsx
import React from 'react';
import { Play, Pause, Loader2 } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
```

Replace the return statement:

Old:
```tsx
    return (
        <button
            onClick={onTogglePlay}
            disabled={isLoading}
            className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 shrink-0"
            style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                boxShadow: '0 4px 16px rgba(99, 102, 241, 0.4)',
                opacity: isLoading ? 0.7 : 1,
                cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
            aria-label={isPlaying ? 'Pause' : 'Play'}
        >
            {isLoading ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : isPlaying ? (
                <Pause className="w-5 h-5 text-white" />
            ) : (
                <Play className="w-5 h-5 text-white" style={{ marginLeft: '2px' }} />
            )}
        </button>
    );
```

New:
```tsx
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    onClick={onTogglePlay}
                    disabled={isLoading}
                    className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 shrink-0"
                    style={{
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        boxShadow: '0 4px 16px rgba(99, 102, 241, 0.4)',
                        opacity: isLoading ? 0.7 : 1,
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                    }}
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                    {isLoading ? (
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                    ) : isPlaying ? (
                        <Pause className="w-5 h-5 text-white" />
                    ) : (
                        <Play className="w-5 h-5 text-white" style={{ marginLeft: '2px' }} />
                    )}
                </button>
            </TooltipTrigger>
            <TooltipContent side="top">
                {isPlaying ? 'Pause' : 'Play'}
                <kbd data-slot="kbd">Space</kbd>
            </TooltipContent>
        </Tooltip>
    );
```

- [ ] **Step 2: Type-check**

```powershell
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/player/PlayControl.tsx
git commit -m "feat: add Space keyboard hint tooltip to play/pause button"
```

---

## Task 5: `VolumeControl` — add `M` tooltip on mute button

**Files:**
- Modify: `components/player/VolumeControl.tsx`

- [ ] **Step 1: Apply the diff**

Old imports:
```tsx
import React, { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
```

New:
```tsx
import React, { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
```

Wrap the mute `<button>` — old:
```tsx
            <button
                onClick={handleIconClick}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 hover:bg-white/10 active:scale-90"
                style={{ color: isMuted ? 'var(--color-text-muted)' : 'var(--color-accent)' }}
                aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
```

New:
```tsx
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        onClick={handleIconClick}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 hover:bg-white/10 active:scale-90"
                        style={{ color: isMuted ? 'var(--color-text-muted)' : 'var(--color-accent)' }}
                        aria-label={isMuted ? 'Unmute' : 'Mute'}
                    >
                        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                    {isMuted ? 'Unmute' : 'Mute'}
                    <kbd data-slot="kbd">M</kbd>
                </TooltipContent>
            </Tooltip>
```

- [ ] **Step 2: Type-check**

```powershell
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/player/VolumeControl.tsx
git commit -m "feat: add M keyboard hint tooltip to mute button"
```

---

## Task 6: Wire everything in `ModernAirwave`

This task ties all previous tasks together.

**Files:**
- Modify: `components/MordernAirwave.tsx`

- [ ] **Step 1: Apply the diff**

Old imports:
```tsx
import React from 'react';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useStationFilter } from '@/hooks/useStationFilter';
import { useFavorites } from '@/hooks/useFavorites';
import { HeartBurst } from '@/components/ui/HeartBurst';
import { useStreamMetadata } from '@/hooks/useStreamMetadata';
import { useAuth } from '@/context/AuthContext';
import { AudioPlayer } from '@/components/player';
import { StationGrid } from '@/components/station/StationGrid';
import { SearchAndFilters } from '@/components/station/SearchAndFilters';
import { stations as mockStations } from '@/lib/stations';
```

New:
```tsx
'use client';

import React, { useRef, useState, useCallback } from 'react';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useStationFilter } from '@/hooks/useStationFilter';
import { useFavorites } from '@/hooks/useFavorites';
import { HeartBurst } from '@/components/ui/HeartBurst';
import { useStreamMetadata } from '@/hooks/useStreamMetadata';
import { useAuth } from '@/context/AuthContext';
import { AudioPlayer } from '@/components/player';
import { StationGrid } from '@/components/station/StationGrid';
import { SearchAndFilters } from '@/components/station/SearchAndFilters';
import { ShortcutCheatsheet } from '@/components/ui/ShortcutCheatsheet';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { stations as mockStations } from '@/lib/stations';
```

Inside the `ModernAirwave` component body, add after the `const { isAuthenticated }` line:

```tsx
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [isCheatsheetOpen, setIsCheatsheetOpen] = useState(false);
    const openCheatsheet = useCallback(() => setIsCheatsheetOpen(true), []);
    const closeCheatsheet = useCallback(() => setIsCheatsheetOpen(false), []);
    const toggleCheatsheet = useCallback(() => setIsCheatsheetOpen(prev => !prev), []);
```

After all the existing hooks (after the `nowPlaying` line), call the keyboard hook:

```tsx
    const shortcuts = useKeyboardShortcuts({
        togglePlay,
        toggleMute,
        handleVolumeChange,
        volume,
        playStation,
        filteredStations,
        currentStation,
        toggleFavorite,
        setSearchTerm,
        searchInputRef,
        isCheatsheetOpen,
        onToggleCheatsheet: toggleCheatsheet,
        onCloseCheatsheet: closeCheatsheet,
    });
```

Pass `ref` to `SearchAndFilters` — old:
```tsx
            <SearchAndFilters
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
```

New:
```tsx
            <SearchAndFilters
                ref={searchInputRef}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
```

At the bottom of the JSX, before the closing `</>`, add the cheatsheet:

```tsx
            <ShortcutCheatsheet
                isOpen={isCheatsheetOpen}
                onClose={closeCheatsheet}
                shortcuts={shortcuts}
            />
```

- [ ] **Step 2: Type-check**

```powershell
npx tsc --noEmit
```

Expected: zero errors (or only pre-existing errors unrelated to this feature).

- [ ] **Step 3: Run dev server and verify**

```powershell
yarn dev
```

Open `http://localhost:3000` and verify:

| Action | Expected |
|--------|----------|
| Press `Space` | Plays/pauses current station |
| Press `↑` / `↓` | Volume changes by 10% |
| Press `←` / `→` | Switches to previous/next station in filtered list |
| Press `M` | Mutes/unmutes |
| Press `F` while station playing | Triggers favorite |
| Press `/` | Search input gets focus |
| Press `Escape` in search | Clears search and blurs |
| Press `?` | Opens cheatsheet overlay |
| Press `Escape` with cheatsheet open | Closes cheatsheet |
| Press `T` | Toggles dark/light theme |
| Hover play button | Tooltip shows `Play Space` or `Pause Space` |
| Hover mute button | Tooltip shows `Mute M` or `Unmute M` |
| Tab inside cheatsheet | Focus cycles within modal only |
| Close cheatsheet | Focus returns to `?` trigger element |
| Type in search, press `Space` | Types a space (shortcut suppressed) |

- [ ] **Step 4: Commit**

```bash
git add components/MordernAirwave.tsx
git commit -m "feat: wire keyboard shortcuts, cheatsheet modal, and search ref in ModernAirwave"
```

---

## Self-Review

**Spec coverage:**
- ✅ `Space` play/pause — Task 1
- ✅ `↑/↓` volume — Task 1
- ✅ `←/→` prev/next station with wrapping — Task 1
- ✅ `M` mute — Task 1
- ✅ `F` favorite — Task 1
- ✅ `/` focus search — Task 1
- ✅ `Escape` priority (cheatsheet > search clear) — Task 1
- ✅ `T` toggle theme — Task 1
- ✅ `?` open cheatsheet — Task 1
- ✅ Shortcuts suppressed when input focused — Task 1
- ✅ Cheatsheet modal with three groups — Task 2
- ✅ Focus trap in modal — Task 2
- ✅ Focus returns to trigger on close — Task 2
- ✅ `prefers-reduced-motion` respected — Task 2 (`motion-safe:` prefix)
- ✅ Dark-mode CSS vars (no hardcoded hex) — Task 2
- ✅ Tooltip on play/pause button — Task 4
- ✅ Tooltip on mute button — Task 5
- ✅ `forwardRef` on search input — Task 3
- ✅ Next/prev no-op on empty filtered list — Task 1 (`if filteredStations.length === 0 break`)
- ✅ `F` no-op if no station — Task 1 (`if (currentStation)` guard)

**No placeholders found.**

**Type consistency:** `ShortcutDef` defined in Task 1, imported in Task 2 and Task 6. `searchInputRef` typed `React.RefObject<HTMLInputElement>` throughout. `onToggleCheatsheet` / `onCloseCheatsheet` prop names match between Task 1 interface and Task 6 call site.
