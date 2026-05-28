# AirWave Feature Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 8 production-quality features: hook refactor, persistent favorites, station avatars, shadcn UI polish, auto-reconnect, Now Playing metadata, sleep timer, and PWA support.

**Architecture:** `MordernAirwave.tsx` becomes a thin orchestrator delegating to dedicated hooks. A Next.js API route proxies Icecast metadata to sidestep CORS. `next-pwa` wraps the Next.js config for offline/installable support. shadcn/ui replaces native `<input type="range">` and adds Toast/Tooltip.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui, next-pwa, Lucide icons, Icecast JSON API

---

## Existing Assets (do NOT recreate)

| File | What it already does |
|------|----------------------|
| `hooks/useAudioPlayer.ts` | Full audio state machine — play, pause, volume, error |
| `hooks/useAudioManager.ts` | Alternate audio manager (lazy-init style) — currently unused |
| `lib/api.ts` → `apiService` | `toggleFavorite(id)`, `getFavorites()`, `getStations()`, auth |
| `types/Station.ts` | Already has `logo_url?: string` |
| `context/AuthContext.tsx` | `isAuthenticated`, `user` available everywhere |
| `next.config.mjs` | Rewrites `/api/*` → backend; `output: 'standalone'` |

---

## File Map

**New files:**
- `hooks/useStationFilter.ts` — search + genre + region filter logic
- `hooks/useFavorites.ts` — localStorage fallback + API sync for logged-in users
- `hooks/useStreamMetadata.ts` — poll Now Playing metadata every 15 s
- `hooks/useSleepTimer.ts` — countdown timer that pauses audio
- `components/station/StationAvatar.tsx` — logo image + initials fallback
- `components/player/SleepTimer.tsx` — sleep timer button + countdown UI
- `app/api/stream-metadata/route.ts` — server-side Icecast metadata proxy
- `public/manifest.json` — PWA manifest
- `public/icons/icon-192.png` & `icon-512.png` — PWA icons (user must supply)

**Modified files:**
- `components/MordernAirwave.tsx` — replace inline audio/filter code with hooks
- `components/station/StationCard.tsx` — add `StationAvatar`, Tooltip on name
- `components/player/StationInfo.tsx` — add `StationAvatar`, Now Playing line
- `components/player/AudioPlayer.tsx` — add `SleepTimer`, Now Playing display
- `components/player/VolumeControl.tsx` — replace `<input>` with shadcn Slider
- `components/layout/Header.tsx` — add Toast trigger on favorite toggle
- `app/layout.tsx` — add `<Toaster />` and PWA meta tags
- `next.config.mjs` — wrap with `withPWA`

---

## Task 1: Wire `MordernAirwave.tsx` to existing hooks

**Files:**
- Modify: `components/MordernAirwave.tsx`
- Modify: `hooks/useAudioPlayer.ts` (add `setIsLoading` exposure for togglePlay)

The inline audio implementation in `MordernAirwave.tsx` duplicates `hooks/useAudioPlayer.ts`. Replace it.

- [ ] **Step 1: Read the current `useAudioPlayer` return shape**

Confirm these properties exist and match what `MordernAirwave` needs:
`currentStation, isPlaying, isLoading, volume, isMuted, error, playStation, togglePlay, handleVolumeChange, toggleMute, clearError`

- [ ] **Step 2: Add `setIsLoading` exposure to `useAudioPlayer`**

In `hooks/useAudioPlayer.ts`, the `togglePlay` function doesn't set `isLoading = true` before calling `audio.play()`. Add it:

```ts
const togglePlay = useCallback(async () => {
  if (!audioRef.current || !currentStation) return;
  const audio = audioRef.current;
  if (isPlaying) {
    audio.pause();
  } else {
    setIsLoading(true);           // ← add this
    try {
      playPromiseRef.current = audio.play();
      await playPromiseRef.current;
      setError(null);
    } catch (err) {
      console.error('Play failed:', err);
      setIsLoading(false);        // ← add this
      setError('Failed to play audio. Try again.');
    }
  }
}, [isPlaying, currentStation]);
```

- [ ] **Step 3: Rewrite `MordernAirwave.tsx` using the hook**

Replace the entire component body. Keep mock station data and filter logic (filter logic moves to Task 2):

```tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { AudioPlayer } from '@/components/player';
import { StationGrid } from '@/components/station/StationGrid';
import { SearchAndFilters } from '@/components/station/SearchAndFilters';
import type { Station } from '@/types/Station';

const mockStations: Station[] = [ /* keep existing array unchanged */ ];

const ModernAirwave: React.FC = () => {
  const [filteredStations, setFilteredStations] = useState<Station[]>(mockStations);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [selectedRegion, setSelectedRegion] = useState('All');

  const {
    currentStation,
    isPlaying,
    isLoading,
    volume,
    isMuted,
    error: audioError,
    playStation,
    togglePlay,
    handleVolumeChange,
    toggleMute,
    clearError,
  } = useAudioPlayer();

  const genres = ['All', ...Array.from(new Set(mockStations.map(s => s.genre).filter(Boolean)))];
  const regions = ['All', ...Array.from(new Set(mockStations.map(s => s.region).filter(Boolean)))];

  useEffect(() => {
    let result = mockStations;
    if (searchTerm) result = result.filter(s =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (selectedGenre !== 'All') result = result.filter(s => s.genre === selectedGenre);
    if (selectedRegion !== 'All') result = result.filter(s => s.region === selectedRegion);
    setFilteredStations(result);
  }, [searchTerm, selectedGenre, selectedRegion]);

  return (
    <>
      <SearchAndFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedGenre={selectedGenre}
        onGenreChange={setSelectedGenre}
        selectedRegion={selectedRegion}
        onRegionChange={setSelectedRegion}
        genres={genres}
        regions={regions}
        stationCount={filteredStations.length}
      />

      {audioError && (
        <div className="mb-5 rounded-xl p-3.5 flex items-center gap-3 text-sm"
          style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: '#fbbf24' }} />
          <span style={{ color: '#fbbf24' }}>{audioError}</span>
          <button onClick={clearError} className="ml-auto text-xs opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      <StationGrid
        stations={filteredStations}
        loading={false}
        error={null}
        currentStation={currentStation}
        isPlaying={isPlaying}
        isAudioLoading={isLoading}
        favorites={new Set<number>()}          // replaced in Task 2
        onPlay={playStation}
        onFavorite={() => {}}                  // replaced in Task 2
        onRetry={() => {}}
      />

      <AudioPlayer
        currentStation={currentStation}
        isPlaying={isPlaying}
        volume={volume}
        isMuted={isMuted}
        onTogglePlay={togglePlay}
        onVolumeChange={handleVolumeChange}
        onMuteToggle={toggleMute}
        isLoading={isLoading}
      />
    </>
  );
};

export default ModernAirwave;
```

- [ ] **Step 4: Verify TypeScript is happy**

```bash
cd c:\Users\otien\build\airwave && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/MordernAirwave.tsx hooks/useAudioPlayer.ts
git commit -m "refactor: wire MordernAirwave to useAudioPlayer hook"
```

---

## Task 2: Extract `useStationFilter` + `useFavorites` with localStorage

**Files:**
- Create: `hooks/useStationFilter.ts`
- Create: `hooks/useFavorites.ts`
- Modify: `components/MordernAirwave.tsx`

- [ ] **Step 1: Create `hooks/useStationFilter.ts`**

```ts
import { useState, useEffect, useMemo } from 'react';
import type { Station } from '@/types/Station';

export function useStationFilter(stations: Station[]) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [selectedRegion, setSelectedRegion] = useState('All');

  const genres = useMemo(() =>
    ['All', ...Array.from(new Set(stations.map(s => s.genre).filter(Boolean)))],
    [stations]
  );

  const regions = useMemo(() =>
    ['All', ...Array.from(new Set(stations.map(s => s.region).filter(Boolean)))],
    [stations]
  );

  const filteredStations = useMemo(() => {
    let result = stations;
    if (searchTerm)
      result = result.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    if (selectedGenre !== 'All') result = result.filter(s => s.genre === selectedGenre);
    if (selectedRegion !== 'All') result = result.filter(s => s.region === selectedRegion);
    return result;
  }, [stations, searchTerm, selectedGenre, selectedRegion]);

  return {
    filteredStations,
    searchTerm, setSearchTerm,
    selectedGenre, setSelectedGenre,
    selectedRegion, setSelectedRegion,
    genres,
    regions,
  };
}
```

- [ ] **Step 2: Create `hooks/useFavorites.ts`**

Favorites sync to the backend when user is authenticated, fall back to localStorage for guests.

```ts
import { useState, useEffect, useCallback } from 'react';
import { apiService } from '@/lib/api';

const LS_KEY = 'airwave_favorites';

function loadFromStorage(): Set<number> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? new Set<number>(JSON.parse(raw)) : new Set<number>();
  } catch {
    return new Set<number>();
  }
}

function saveToStorage(ids: Set<number>) {
  localStorage.setItem(LS_KEY, JSON.stringify(Array.from(ids)));
}

export function useFavorites(isAuthenticated: boolean) {
  const [favorites, setFavorites] = useState<Set<number>>(new Set());

  // Load on mount
  useEffect(() => {
    if (isAuthenticated) {
      apiService.getFavorites().then(res => {
        if (res.data) {
          const ids = new Set<number>(res.data.favorites.map(s => s.id));
          setFavorites(ids);
          saveToStorage(ids); // keep local in sync
        }
      });
    } else {
      setFavorites(loadFromStorage());
    }
  }, [isAuthenticated]);

  const toggleFavorite = useCallback(async (stationId: number) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(stationId)) {
        next.delete(stationId);
      } else {
        next.add(stationId);
      }
      saveToStorage(next);
      return next;
    });

    if (isAuthenticated) {
      await apiService.toggleFavorite(stationId);
    }
  }, [isAuthenticated]);

  return { favorites, toggleFavorite };
}
```

- [ ] **Step 3: Update `MordernAirwave.tsx` to use both hooks**

Replace the filter `useEffect` + favorites state with the hooks:

```tsx
'use client';

import React from 'react';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useStationFilter } from '@/hooks/useStationFilter';
import { useFavorites } from '@/hooks/useFavorites';
import { useAuth } from '@/context/AuthContext';
import { AudioPlayer } from '@/components/player';
import { StationGrid } from '@/components/station/StationGrid';
import { SearchAndFilters } from '@/components/station/SearchAndFilters';

const mockStations = [ /* unchanged */ ];

const ModernAirwave: React.FC = () => {
  const { isAuthenticated } = useAuth();

  const {
    currentStation, isPlaying, isLoading,
    volume, isMuted, error: audioError,
    playStation, togglePlay, handleVolumeChange, toggleMute, clearError,
  } = useAudioPlayer();

  const {
    filteredStations, searchTerm, setSearchTerm,
    selectedGenre, setSelectedGenre,
    selectedRegion, setSelectedRegion,
    genres, regions,
  } = useStationFilter(mockStations);

  const { favorites, toggleFavorite } = useFavorites(isAuthenticated);

  return (
    <>
      <SearchAndFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedGenre={selectedGenre}
        onGenreChange={setSelectedGenre}
        selectedRegion={selectedRegion}
        onRegionChange={setSelectedRegion}
        genres={genres}
        regions={regions}
        stationCount={filteredStations.length}
      />

      {audioError && (
        <div className="mb-5 rounded-xl p-3.5 flex items-center gap-3 text-sm"
          style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: '#fbbf24' }} />
          <span style={{ color: '#fbbf24' }}>{audioError}</span>
          <button onClick={clearError} className="ml-auto text-xs opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      <StationGrid
        stations={filteredStations}
        loading={false}
        error={null}
        currentStation={currentStation}
        isPlaying={isPlaying}
        isAudioLoading={isLoading}
        favorites={favorites}
        onPlay={playStation}
        onFavorite={toggleFavorite}
        onRetry={() => {}}
      />

      <AudioPlayer
        currentStation={currentStation}
        isPlaying={isPlaying}
        volume={volume}
        isMuted={isMuted}
        onTogglePlay={togglePlay}
        onVolumeChange={handleVolumeChange}
        onMuteToggle={toggleMute}
        isLoading={isLoading}
      />
    </>
  );
};

export default ModernAirwave;
```

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Manual test — favorites persist**

1. Open app, mark 2 stations as favorites
2. Hard-refresh the page (`Ctrl+Shift+R`)
3. Both stations should still show heart filled

- [ ] **Step 6: Commit**

```bash
git add hooks/useStationFilter.ts hooks/useFavorites.ts components/MordernAirwave.tsx
git commit -m "feat: extract useStationFilter and useFavorites with localStorage persistence"
```

---

## Task 3: `StationAvatar` component

**Files:**
- Create: `components/station/StationAvatar.tsx`
- Modify: `components/station/StationCard.tsx`
- Modify: `components/player/StationInfo.tsx`

`Station.logo_url` already exists in the type. This component shows the image when available; falls back to a coloured circle with the station's initials.

- [ ] **Step 1: Create `components/station/StationAvatar.tsx`**

```tsx
import React, { useState } from 'react';

interface StationAvatarProps {
  name: string;
  logoUrl?: string;
  accentColor?: string;
  size?: number;        // px, default 36
  className?: string;
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
}

export const StationAvatar: React.FC<StationAvatarProps> = ({
  name,
  logoUrl,
  accentColor = '#6366f1',
  size = 36,
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);
  const showImage = logoUrl && !imgError;

  return (
    <div
      className={`rounded-xl flex items-center justify-center shrink-0 overflow-hidden ${className}`}
      style={{ width: size, height: size, background: showImage ? 'transparent' : accentColor + '20', border: `1px solid ${accentColor}25` }}
    >
      {showImage ? (
        <img
          src={logoUrl}
          alt={`${name} logo`}
          width={size}
          height={size}
          className="object-contain w-full h-full"
          onError={() => setImgError(true)}
        />
      ) : (
        <span
          className="font-bold select-none"
          style={{ color: accentColor, fontSize: size * 0.36 }}
        >
          {getInitials(name)}
        </span>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Update `StationCard.tsx` — replace Radio icon block with `StationAvatar`**

In `components/station/StationCard.tsx`, replace the icon `<div>` that currently contains either waveform bars or a `<Radio>` icon:

```tsx
// add import at top
import { StationAvatar } from './StationAvatar';

// Replace the icon div (w-9 h-9) in the top row:
<div className="relative">
  <StationAvatar
    name={station.name}
    logoUrl={station.logo_url}
    accentColor={colors.accent}
    size={36}
  />
  {isPlaying && isCurrentStation && (
    <div className="absolute inset-0 rounded-xl flex items-center justify-center"
      style={{ background: colors.glow }}>
      <div className="flex items-end gap-0.5" style={{ height: '14px' }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="waveform-bar"
            style={{ background: colors.accent, animationDelay: `${i * 0.15}s`, width: '2px', height: '14px' }} />
        ))}
      </div>
    </div>
  )}
</div>
```

- [ ] **Step 3: Update `StationInfo.tsx` — replace Radio icon with `StationAvatar`**

In `components/player/StationInfo.tsx`:

```tsx
import { StationAvatar } from '@/components/station/StationAvatar';

// Replace the icon div:
<div className="relative">
  <StationAvatar
    name={station.name}
    logoUrl={station.logo_url}
    size={44}
  />
  {isPlaying && (
    <div className="absolute inset-0 rounded-xl flex items-center justify-center"
      style={{ background: 'rgba(99,102,241,0.15)' }}>
      <div className="flex items-end gap-0.5" style={{ height: '18px' }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="waveform-bar"
            style={{ background: '#6366f1', animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  )}
</div>
```

- [ ] **Step 4: TypeScript check + visual test**

```bash
npx tsc --noEmit
```

Check that station cards show initials (since no logos are set in mock data yet), and the waveform overlay still appears when playing.

- [ ] **Step 5: Commit**

```bash
git add components/station/StationAvatar.tsx components/station/StationCard.tsx components/player/StationInfo.tsx
git commit -m "feat: add StationAvatar with logo image and initials fallback"
```

---

## Task 4: Install shadcn + add Slider, Toast, Tooltip

**Files:**
- Modify: `components/player/VolumeControl.tsx` — use shadcn Slider
- Create: `components/ui/toaster.tsx` (generated by shadcn)
- Modify: `app/layout.tsx` — add `<Toaster />`
- Modify: `hooks/useFavorites.ts` — call `toast()` on toggle

- [ ] **Step 1: Initialise shadcn**

```bash
cd c:\Users\otien\build\airwave
npx shadcn@latest init
```

When prompted:
- Style: **Default**
- Base color: **Slate**
- CSS variables: **Yes**

This writes `components.json` and updates `globals.css` with shadcn CSS variables.

- [ ] **Step 2: Add required components**

```bash
npx shadcn@latest add slider toast tooltip
```

This generates:
- `components/ui/slider.tsx`
- `components/ui/toast.tsx` + `toaster.tsx` + `use-toast.ts`
- `components/ui/tooltip.tsx`

- [ ] **Step 3: Add `<Toaster />` to layout**

In `app/layout.tsx`, import and render after `{children}`:

```tsx
import { Toaster } from '@/components/ui/toaster';

// inside <body>, after {children}:
<Toaster />
```

- [ ] **Step 4: Replace volume `<input>` with shadcn `Slider`**

Replace all of `components/player/VolumeControl.tsx`:

```tsx
'use client';

import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

interface VolumeControlProps {
  volume: number;
  isMuted: boolean;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
}

export const VolumeControl: React.FC<VolumeControlProps> = ({
  volume, isMuted, onVolumeChange, onMuteToggle,
}) => (
  <div className="hidden sm:flex items-center gap-2.5">
    <button
      onClick={onMuteToggle}
      className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10"
      style={{ color: isMuted ? 'var(--color-text-muted)' : 'var(--color-text-secondary)' }}
      aria-label={isMuted ? 'Unmute' : 'Mute'}
    >
      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
    </button>
    <Slider
      min={0}
      max={1}
      step={0.01}
      value={[isMuted ? 0 : volume]}
      onValueChange={([v]) => onVolumeChange(v)}
      className="w-24"
      aria-label="Volume"
    />
  </div>
);
```

- [ ] **Step 5: Add toast on favorite toggle in `useFavorites.ts`**

```ts
// Add at top of useFavorites.ts
import { toast } from '@/components/ui/use-toast';

// Inside toggleFavorite, after updating state:
const isFav = favorites.has(stationId);     // capture BEFORE toggle
// ... existing toggle logic ...
toast({
  title: isFav ? 'Removed from favorites' : 'Added to favorites',
  duration: 2000,
});
```

- [ ] **Step 6: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: Manual test**

- Volume slider should be a styled track, not a native range input
- Favoriting a station should show a toast in the bottom-right for 2 s

- [ ] **Step 8: Commit**

```bash
git add components/ui/ components/player/VolumeControl.tsx hooks/useFavorites.ts app/layout.tsx components.json
git commit -m "feat: add shadcn Slider, Toast, Tooltip; toast on favorite toggle"
```

---

## Task 5: Auto-reconnect on stream drop

**Files:**
- Modify: `hooks/useAudioPlayer.ts`

When the audio stream drops (network error, server hiccup), the hook currently sets an error state and stops. Add automatic reconnect with exponential backoff: 2 s → 4 s → 8 s → 16 s → 30 s cap, max 5 attempts.

- [ ] **Step 1: Add reconnect refs and logic to `useAudioPlayer.ts`**

Add these refs at the top of the hook body (alongside existing refs):

```ts
const reconnectAttemptsRef = useRef(0);
const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const MAX_RECONNECT = 5;
```

- [ ] **Step 2: Replace the `handleError` handler inside the `useEffect`**

```ts
const handleError = () => {
  if (!audioRef.current) return;
  const audio = audioRef.current;

  // Ignore error when no src is set
  if (!audio.src || audio.src === window.location.href) return;

  setIsLoading(false);
  setIsPlaying(false);

  if (reconnectAttemptsRef.current < MAX_RECONNECT) {
    const delay = Math.min(2000 * 2 ** reconnectAttemptsRef.current, 30000);
    reconnectAttemptsRef.current += 1;

    setError(`Stream lost. Reconnecting in ${delay / 1000}s… (${reconnectAttemptsRef.current}/${MAX_RECONNECT})`);

    reconnectTimerRef.current = setTimeout(() => {
      if (!audioRef.current) return;
      setError(null);
      setIsLoading(true);
      audioRef.current.load();
      audioRef.current.play().catch(() => {
        // handleError will fire again if this fails too
      });
    }, delay);
  } else {
    setError('Stream unavailable. Please try again.');
    reconnectAttemptsRef.current = 0;
    options.onError?.('Stream unavailable');
  }
};
```

- [ ] **Step 3: Reset attempts on successful play**

In the existing `handlePlay` handler, add:

```ts
const handlePlay = () => {
  reconnectAttemptsRef.current = 0;           // ← add this
  if (reconnectTimerRef.current) {
    clearTimeout(reconnectTimerRef.current);  // ← add this
    reconnectTimerRef.current = null;
  }
  setIsPlaying(true);
  setError(null);
  options.onPlay?.(currentStation!);
};
```

- [ ] **Step 4: Clear timer in the cleanup function**

In the `return () => { … }` of the `useEffect`:

```ts
if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
```

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Manual test**

Play a station, then disable your network adapter for 5 seconds. The error banner should show a countdown. Re-enable network → stream should resume automatically.

- [ ] **Step 7: Commit**

```bash
git add hooks/useAudioPlayer.ts
git commit -m "feat: auto-reconnect on stream drop with exponential backoff"
```

---

## Task 6: Stream metadata (Now Playing)

**Files:**
- Create: `app/api/stream-metadata/route.ts`
- Create: `hooks/useStreamMetadata.ts`
- Modify: `components/player/AudioPlayer.tsx`
- Modify: `components/player/StationInfo.tsx`

Most Kenyan stations run Icecast. The JSON endpoint is at `<stream-base-url>/status-json.xsl`. Fetch it server-side to avoid CORS.

- [ ] **Step 1: Create `app/api/stream-metadata/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const streamUrl = req.nextUrl.searchParams.get('url');
  if (!streamUrl) return NextResponse.json({ error: 'Missing url' }, { status: 400 });

  try {
    // Derive the Icecast status endpoint from the stream URL
    const url = new URL(streamUrl);
    const statusUrl = `${url.protocol}//${url.host}/status-json.xsl`;

    const res = await fetch(statusUrl, {
      headers: { 'User-Agent': 'AirWave/1.0' },
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) return NextResponse.json({ title: null }, { status: 200 });

    const data = await res.json();

    // Icecast JSON structure: data.icestats.source (object or array)
    const sources = data?.icestats?.source;
    const source = Array.isArray(sources) ? sources[0] : sources;
    const title: string | null = source?.title ?? null;

    return NextResponse.json({ title }, {
      headers: { 'Cache-Control': 's-maxage=10, stale-while-revalidate=20' },
    });
  } catch {
    return NextResponse.json({ title: null }, { status: 200 });
  }
}
```

- [ ] **Step 2: Create `hooks/useStreamMetadata.ts`**

```ts
import { useState, useEffect, useRef } from 'react';

export interface StreamMetadata {
  title: string | null;
  loading: boolean;
}

export function useStreamMetadata(streamUrl: string | null, pollInterval = 15_000): StreamMetadata {
  const [title, setTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMetadata = async (url: string) => {
    try {
      const res = await fetch(`/api/stream-metadata?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      setTitle(data.title ?? null);
    } catch {
      setTitle(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!streamUrl) { setTitle(null); return; }

    setLoading(true);
    fetchMetadata(streamUrl);

    timerRef.current = setInterval(() => fetchMetadata(streamUrl), pollInterval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [streamUrl, pollInterval]);

  return { title, loading };
}
```

- [ ] **Step 3: Thread metadata through `AudioPlayer.tsx`**

In `components/player/AudioPlayer.tsx`:

```tsx
import { useStreamMetadata } from '@/hooks/useStreamMetadata';

// Inside the component, before return:
const { title: nowPlaying } = useStreamMetadata(
  isPlaying ? currentStation.url : null
);

// Pass nowPlaying to StationInfo:
<StationInfo station={currentStation} isPlaying={isPlaying} nowPlaying={nowPlaying} />
```

- [ ] **Step 4: Display Now Playing in `StationInfo.tsx`**

Add `nowPlaying?: string | null` to `StationInfoProps`, then render below description:

```tsx
{nowPlaying && (
  <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-accent)' }}>
    ♪ {nowPlaying}
  </p>
)}
```

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Manual test**

Play Capital FM or Kiss 100 (Icecast-based streams). After ~5 s, song title should appear below the station name in the bottom player. If the station doesn't expose Icecast metadata, the line simply won't appear (graceful fallback).

- [ ] **Step 7: Commit**

```bash
git add app/api/stream-metadata/route.ts hooks/useStreamMetadata.ts components/player/AudioPlayer.tsx components/player/StationInfo.tsx
git commit -m "feat: Now Playing metadata via Icecast proxy with 15s polling"
```

---

## Task 7: Sleep timer

**Files:**
- Create: `hooks/useSleepTimer.ts`
- Create: `components/player/SleepTimer.tsx`
- Modify: `components/player/AudioPlayer.tsx`

- [ ] **Step 1: Create `hooks/useSleepTimer.ts`**

```ts
import { useState, useEffect, useRef, useCallback } from 'react';

export function useSleepTimer(onExpire: () => void) {
  const [minutesLeft, setMinutesLeft] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const secondsRef = useRef<number>(0);

  const start = useCallback((minutes: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    secondsRef.current = minutes * 60;
    setMinutesLeft(minutes);

    intervalRef.current = setInterval(() => {
      secondsRef.current -= 1;
      const minsLeft = Math.ceil(secondsRef.current / 60);
      setMinutesLeft(minsLeft > 0 ? minsLeft : 0);

      if (secondsRef.current <= 0) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        setMinutesLeft(null);
        onExpire();
      }
    }, 1000);
  }, [onExpire]);

  const cancel = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setMinutesLeft(null);
  }, []);

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  return { minutesLeft, isActive: minutesLeft !== null, start, cancel };
}
```

- [ ] **Step 2: Create `components/player/SleepTimer.tsx`**

```tsx
'use client';

import React, { useState } from 'react';
import { Timer, X } from 'lucide-react';

const PRESET_MINUTES = [15, 30, 60, 90];

interface SleepTimerProps {
  minutesLeft: number | null;
  isActive: boolean;
  onStart: (minutes: number) => void;
  onCancel: () => void;
}

export const SleepTimer: React.FC<SleepTimerProps> = ({
  minutesLeft, isActive, onStart, onCancel,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative hidden sm:block">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
        style={{
          color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)',
          background: isActive ? 'rgba(99,102,241,0.1)' : 'transparent',
        }}
        aria-label="Sleep timer"
        title={isActive ? `Stops in ${minutesLeft} min` : 'Set sleep timer'}
      >
        {isActive
          ? <span className="text-xs font-bold tabular-nums">{minutesLeft}m</span>
          : <Timer className="w-4 h-4" />
        }
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute bottom-10 right-0 z-20 rounded-xl p-3 shadow-2xl"
            style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border-strong)', minWidth: '160px' }}
          >
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              Sleep timer
            </p>
            <div className="flex flex-col gap-1">
              {PRESET_MINUTES.map(m => (
                <button
                  key={m}
                  onClick={() => { onStart(m); setOpen(false); }}
                  className="text-left px-3 py-1.5 rounded-lg text-sm transition-colors"
                  style={{ color: 'var(--color-text-primary)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-overlay-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {m} minutes
                </button>
              ))}
              {isActive && (
                <button
                  onClick={() => { onCancel(); setOpen(false); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm mt-1 transition-colors"
                  style={{ color: '#f87171' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <X className="w-3.5 h-3.5" /> Cancel timer
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
```

- [ ] **Step 3: Integrate `SleepTimer` into `AudioPlayer.tsx`**

```tsx
import { useSleepTimer } from '@/hooks/useSleepTimer';
import { SleepTimer } from './SleepTimer';

// Inside the component, before return:
const { minutesLeft, isActive: timerActive, start: startTimer, cancel: cancelTimer } =
  useSleepTimer(onTogglePlay); // onTogglePlay pauses when called with isPlaying=true
```

Add `<SleepTimer>` to the controls row, next to `<VolumeControl>`:

```tsx
<div className="flex items-center gap-3 shrink-0">
  <PlayControl … />
  <VolumeControl … />
  <SleepTimer
    minutesLeft={minutesLeft}
    isActive={timerActive}
    onStart={startTimer}
    onCancel={cancelTimer}
  />
</div>
```

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Manual test**

1. Play a station
2. Click the timer icon → popover opens with 15/30/60/90 options
3. Choose 15 min → icon changes to "15m" countdown
4. Hover shows remaining time in tooltip
5. Wait for timer (or reduce to 1 min in code temporarily for testing) → audio pauses

- [ ] **Step 6: Commit**

```bash
git add hooks/useSleepTimer.ts components/player/SleepTimer.tsx components/player/AudioPlayer.tsx
git commit -m "feat: sleep timer with 15/30/60/90 min presets"
```

---

## Task 9: PWA with next-pwa

**Files:**
- Modify: `next.config.mjs`
- Create: `public/manifest.json`
- Create: `public/icons/` (user must supply 192×192 and 512×512 PNG icons)
- Modify: `app/layout.tsx`

- [ ] **Step 1: Install next-pwa**

```bash
yarn add next-pwa
yarn add -D @types/next-pwa
```

- [ ] **Step 2: Create `public/manifest.json`**

```json
{
  "name": "AirWave Radio",
  "short_name": "AirWave",
  "description": "Stream Kenya's best radio stations live",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0b0f",
  "theme_color": "#6366f1",
  "orientation": "any",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

- [ ] **Step 3: Add placeholder icons**

Create a `public/icons/` folder and add two PNG files (192×192 and 512×512). A quick way without image tools: copy any square PNG and rename it. The app will work without them for testing; Chrome just won't show the install prompt.

```bash
mkdir public\icons
# Copy a placeholder or use any tool to generate a 192x192 indigo square PNG
```

- [ ] **Step 4: Wrap `next.config.mjs` with `withPWA`**

```js
import withPWA from 'next-pwa';

const pwaConfig = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',  // only active in production
  register: true,
  skipWaiting: true,
});

const nextConfig = {
  output: 'standalone',
  experimental: { outputFileTracingRoot: undefined },
  env: { NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL },
  async rewrites() {
    return [{
      source: '/api/:path*',
      destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/:path*`,
    }];
  },
  images: { domains: ['localhost', 'yourdomain.com'] },
};

export default pwaConfig(nextConfig);
```

- [ ] **Step 5: Add PWA meta tags to `app/layout.tsx`**

Inside `<head>` (add a `<head>` element in the layout if not present):

```tsx
export const metadata: Metadata = {
  title: 'AirWave Radio',
  description: "Stream Kenya's best radio stations live",
  manifest: '/manifest.json',        // ← add
  themeColor: '#6366f1',             // ← add
  appleWebApp: {                     // ← add
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'AirWave',
  },
};
```

- [ ] **Step 6: Build and test PWA**

```bash
yarn build && yarn start
```

Open `http://localhost:3000` in Chrome. Open DevTools → Application → Manifest. Verify:
- App name shows "AirWave Radio"
- Icons are listed
- Start URL is `/`

In Chrome address bar, look for the install button (⊕). Click it → app installs as a standalone window.

- [ ] **Step 7: Commit**

```bash
git add next.config.mjs public/manifest.json public/icons/ app/layout.tsx
git commit -m "feat: PWA support with next-pwa, manifest, and installable prompt"
```

---

## Self-Review

| Requirement | Covered by |
|-------------|-----------|
| Refactor hooks | Task 1 + Task 2 |
| Persist favorites | Task 2 (`useFavorites` + localStorage + API sync) |
| Station avatar / initials | Task 3 |
| shadcn Slider, Toast, Tooltip | Task 4 |
| Auto-reconnect | Task 5 |
| Now Playing metadata | Task 6 |
| Sleep timer | Task 7 |
| PWA | Task 9 |

**Known limitations:**
- Metadata proxy only works for Icecast streams; Shoutcast and HLS streams will silently return `null` (graceful)
- PWA service worker is disabled in development (`disable: process.env.NODE_ENV === 'development'`) — test with `yarn build && yarn start`
- `onTogglePlay` in the sleep timer callback will call `togglePlay` which toggles; make sure `isPlaying` is `true` when the timer fires, otherwise the audio won't pause. If needed, accept a dedicated `onPause` prop instead.
