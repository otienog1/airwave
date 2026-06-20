# MBR Radio UX Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform MBR Radio into a premium Spotify/Apple-Music-quality streaming experience — robust player status display, share functionality, swipe gestures, visual empty states, and genre discovery.

**Architecture:** All features extend the existing component tree without removing working functionality. Player status flows through `StationInfo` props. Share logic is isolated in `useShare` + `ShareButton`. Empty states use a shared `EmptyState` primitive. Genre hero is a conditional render inside `MordernAirwave`. Swipe detection uses raw touch events — no library needed.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS 3.4, Lucide icons, Web Share API, CSS custom properties (`--color-*`), `@/lib/slug` for URL generation

---

## Audit: What Is Already Built

Do not re-implement these — they are complete and working:

| Feature | Location |
|---------|----------|
| Media Session API (lock screen controls) | `context/PlayerContext.tsx` L79–116 |
| Browser tab title updates | `context/PlayerContext.tsx` L68–76 |
| Listener count in player bar | `components/player/StationInfo.tsx` via `liveListeners` prop |
| Sleep timer | `hooks/useSleepTimer.ts` + `components/player/SleepTimer.tsx` |
| Song history / recent tracks | `components/station/RecentTracks.tsx` in `NowPlayingSheet` |
| Keyboard shortcuts + `?` overlay | `components/GlobalShortcuts.tsx` + `useKeyboardShortcuts.ts` |
| Auto-reconnect (5× exponential backoff) | `hooks/useAudioPlayer.ts` L96–113 |
| Skip prev/next station | `context/PlayerContext.tsx` L57–65 |
| Similar stations shelf | `components/station/StationDetail.tsx` L67–74 |
| Station deep link | `app/station/[slug]/page.tsx` |
| Buffering/loading spinner on play button | `components/player/PlayControl.tsx` via `isLoading` |

---

## What This Plan Builds

| # | Feature | Files |
|---|---------|-------|
| 1 | Volume persistence across sessions | `hooks/useAudioPlayer.ts` |
| 2 | Error & buffering text in player bar | `StationInfo.tsx`, `AudioPlayer.tsx`, `PersistentAudioPlayer.tsx` |
| 3 | Swipe-up on player bar → open sheet | `PersistentAudioPlayer.tsx` |
| 4 | Swipe-down on NowPlayingSheet → close | `NowPlayingSheet.tsx` |
| 5 | Share station button | `hooks/useShare.ts`, `components/ui/ShareButton.tsx`, `NowPlayingSheet.tsx` |
| 6 | Related stations shelf in NowPlayingSheet | `NowPlayingSheet.tsx` |
| 7 | EmptyState primitive component | `components/ui/EmptyState.tsx` |
| 8 | Visual empty states in Library | `app/library/page.tsx` |
| 9 | Genre hero when genre filter active | `components/MordernAirwave.tsx` |

---

## Design System Reference (Spotify + Apple Music)

Apply these design rules consistently across all tasks:

**Spacing:** 4/8/12/16/20/24/32/40/48px scale. Cards: 16px padding.

**Animation:**
- Micro-interactions: `150ms cubic-bezier(0.16,1,0.3,1)` (snappy ease-out)
- Sheet enter: `300ms cubic-bezier(0.16,1,0.3,1)` slide up + fade
- Sheet exit: `200ms ease-in` (exit faster than enter)
- Scale feedback on tap: `active:scale-95` (already in codebase — keep consistent)

**Color conventions (already in CSS variables):**
- Errors: `var(--color-error, #ef4444)` — red, never used for decoration
- Muted status: `var(--color-text-muted)` — reconnecting, buffering
- Accent: `var(--color-accent)` = `#6366f1` — CTAs and active states
- Text on dark surfaces: always ≥ 4.5:1 contrast ratio

**Icon family:** Lucide React only — consistent 2px stroke. Never mix with emoji.

**Touch targets:** Minimum 44×44px (`w-11 h-11`) for all interactive elements.

---

## Task 1: Volume Persistence

**Goal:** Restore user's last volume level after page refresh.

**Files:**
- Modify: `hooks/useAudioPlayer.ts`

- [ ] **Step 1: Read from localStorage on init**

In `hooks/useAudioPlayer.ts`, replace the `volume` initial state (currently line ~16):

```typescript
// Before:
const [volume, setVolume] = useState(options.volume ?? 0.8);

// After:
const [volume, setVolume] = useState<number>(() => {
  if (typeof window === 'undefined') return options.volume ?? 0.8;
  const saved = localStorage.getItem('airwave_volume');
  if (saved !== null) {
    const parsed = parseFloat(saved);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) return parsed;
  }
  return options.volume ?? 0.8;
});
```

- [ ] **Step 2: Write to localStorage on every volume change**

In the existing `handleVolumeChange` callback, add persistence after `setVolume`:

```typescript
const handleVolumeChange = useCallback((newVolume: number) => {
  setVolume(newVolume);
  try { localStorage.setItem('airwave_volume', String(newVolume)); } catch {}
  if (newVolume === 0) {
    setIsMuted(true);
  } else {
    setIsMuted(prev => (prev ? false : prev));
  }
}, []);
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 4: Manual test**
  1. `yarn dev` → play a station → drag volume to ~30%
  2. Hard-refresh the page (Ctrl+Shift+R)
  3. Volume slider should start at 30%, not 80%

- [ ] **Step 5: Commit**

```bash
git add hooks/useAudioPlayer.ts
git commit -m "feat: persist volume level in localStorage across sessions"
```

---

## Task 2: Error & Buffering Status in Player Bar

**Goal:** Surface reconnecting/error messages that currently exist in state but are never shown to the user.

Context: `error` is already in `PlayerContextValue` and spread into the Provider. `isLoading` (buffering) is also available. Neither is currently rendered in the player bar UI — users see a frozen waveform with no feedback.

**Files:**
- Read: `components/player/StationInfo.tsx`
- Modify: `components/player/StationInfo.tsx`
- Modify: `components/player/AudioPlayer.tsx`
- Modify: `components/player/PersistentAudioPlayer.tsx`

- [ ] **Step 1: Read StationInfo to find the exact prop interface and JSX**

Open `components/player/StationInfo.tsx`. Note the current props and where `nowPlaying` is rendered. You will add two new optional props and a status line below the track name.

- [ ] **Step 2: Add status props to StationInfo**

Add `statusText` and `statusLevel` to the props interface, and render a small status line:

```typescript
// Add to existing props interface:
statusText?: string | null;
statusLevel?: 'info' | 'error';
```

Inside the JSX, immediately after the `nowPlaying` line (or wherever the track name renders), add:

```tsx
{statusText && (
  <p
    className="text-[11px] leading-none truncate mt-0.5"
    style={{
      color: statusLevel === 'error'
        ? 'var(--color-error, #ef4444)'
        : 'var(--color-text-muted)',
    }}
    role={statusLevel === 'error' ? 'alert' : undefined}
    aria-live={statusLevel === 'error' ? undefined : 'polite'}
  >
    {statusText}
  </p>
)}
```

- [ ] **Step 3: Add status props to AudioPlayer**

In `AudioPlayer.tsx`, add to `AudioPlayerProps`:

```typescript
statusText?: string | null;
statusLevel?: 'info' | 'error';
```

Pass them through to `<StationInfo>`:

```tsx
<StationInfo
  station={currentStation}
  isPlaying={isPlaying}
  nowPlaying={nowPlaying}
  liveListeners={liveListeners}
  statusText={statusText}
  statusLevel={statusLevel}
/>
```

- [ ] **Step 4: Compute and pass status in PersistentAudioPlayer**

In `PersistentAudioPlayer.tsx`, destructure `error` from `usePlayer()`:

```typescript
const {
  currentStation,
  isPlaying,
  volume,
  isMuted,
  isLoading,
  error,         // ← add this
  nowPlaying,
  listenerCounts,
  streamListeners,
  togglePlay,
  stopPlayback,
  handleVolumeChange,
  toggleMute,
} = usePlayer();
```

Compute status just before the return:

```typescript
const statusText: string | null = error ?? (isLoading ? 'Buffering…' : null);
const statusLevel: 'info' | 'error' = error ? 'error' : 'info';
```

Pass to `<AudioPlayer>`:

```tsx
<AudioPlayer
  currentStation={currentStation}
  isPlaying={isPlaying}
  volume={volume}
  isMuted={isMuted}
  onTogglePlay={togglePlay}
  onStopPlayback={stopPlayback}
  onVolumeChange={handleVolumeChange}
  onMuteToggle={toggleMute}
  isLoading={isLoading}
  nowPlaying={nowPlaying}
  liveListeners={liveListeners}
  onExpand={() => setSheetOpen(true)}
  statusText={statusText}
  statusLevel={statusLevel}
/>
```

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 6: Manual test**
  1. Play a station — confirm no status text in player bar (clean state)
  2. DevTools → Network → set to Offline → wait 5–10 seconds
  3. Player bar should show "Buffering…" then "Stream lost. Reconnecting in 2s… (1/5)" in muted color
  4. After 5 retries: shows "Stream unavailable. Please try again." in red
  5. Set Network back to Online → play another station → status clears

- [ ] **Step 7: Commit**

```bash
git add components/player/StationInfo.tsx components/player/AudioPlayer.tsx components/player/PersistentAudioPlayer.tsx
git commit -m "feat: show buffering and error status in player bar"
```

---

## Task 3: Swipe Gestures

**Goal:** Swipe up on the player bar to open NowPlayingSheet. Swipe down on the drag handle area to close it.

**Files:**
- Modify: `components/player/PersistentAudioPlayer.tsx`
- Modify: `components/player/NowPlayingSheet.tsx`

### Part A — Swipe up to open

- [ ] **Step 1: Add touch refs and handlers to PersistentAudioPlayer**

Inside `PersistentAudioPlayer` component body, add:

```typescript
const touchStartYRef = React.useRef<number>(0);

const handleTouchStart = (e: React.TouchEvent) => {
  touchStartYRef.current = e.touches[0].clientY;
};

const handleTouchEnd = (e: React.TouchEvent) => {
  const delta = touchStartYRef.current - e.changedTouches[0].clientY;
  if (delta > 48) setSheetOpen(true); // swipe up ≥ 48px
};
```

- [ ] **Step 2: Attach handlers to the player bar wrapper**

The `PersistentAudioPlayer` return currently looks like:

```tsx
return (
  <>
    <div aria-live="polite" className="sr-only">...</div>
    <AudioPlayer ... />
    <NowPlayingSheet ... />
  </>
);
```

Wrap `<AudioPlayer>` in a div with the touch handlers:

```tsx
<div
  onTouchStart={handleTouchStart}
  onTouchEnd={handleTouchEnd}
  style={{ touchAction: 'none' }}  // prevent browser swipe-back conflict
>
  <AudioPlayer ... />
</div>
```

### Part B — Drag handle + swipe down to close

- [ ] **Step 3: Add drag handle pill to NowPlayingSheet**

In `NowPlayingSheet.tsx`, at the very top of the scrollable content (before the top bar row), add:

```tsx
{/* Drag handle — visual affordance for swipe-down */}
<div className="flex justify-center pt-3 pb-1" aria-hidden="true">
  <div
    className="w-10 h-1 rounded-full"
    style={{ background: 'var(--color-border-strong, rgba(255,255,255,0.15))' }}
  />
</div>
```

- [ ] **Step 4: Add swipe-down detection on the top bar area**

In `NowPlayingSheet.tsx`, add refs and handlers:

```typescript
const touchStartYRef = React.useRef<number>(0);

const handleTouchStart = (e: React.TouchEvent) => {
  touchStartYRef.current = e.touches[0].clientY;
};

const handleTouchEnd = (e: React.TouchEvent) => {
  const delta = e.changedTouches[0].clientY - touchStartYRef.current;
  if (delta > 80) onClose(); // swipe down ≥ 80px
};
```

Apply only to the top bar row (not the scroll area, to avoid conflict with list scrolling):

```tsx
<div
  className="flex items-center justify-between pt-4 pb-2"
  style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}
  onTouchStart={handleTouchStart}
  onTouchEnd={handleTouchEnd}
>
  {/* existing chevron + "Now Playing" + spacer */}
</div>
```

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Manual test (Chrome DevTools mobile emulation)**
  1. Enable mobile device emulation (F12 → device toolbar)
  2. With a station playing, swipe upward on the player bar → sheet opens
  3. On the sheet, swipe down from the drag handle area → sheet closes
  4. Scroll the RecentTracks list up and down → sheet should NOT close (delta < 80px)

- [ ] **Step 7: Commit**

```bash
git add components/player/PersistentAudioPlayer.tsx components/player/NowPlayingSheet.tsx
git commit -m "feat: swipe-up on player bar to open sheet, swipe-down to dismiss"
```

---

## Task 4: Share Station

**Goal:** One-tap sharing of the current station via Web Share API (mobile) with clipboard fallback (desktop).

**Files:**
- Create: `hooks/useShare.ts`
- Create: `components/ui/ShareButton.tsx`
- Modify: `components/player/NowPlayingSheet.tsx`

- [ ] **Step 1: Create useShare hook**

Create `hooks/useShare.ts`:

```typescript
import { useCallback, useState } from 'react';

interface ShareOptions {
  title: string;
  text: string;
  url: string;
}

export function useShare() {
  const [copied, setCopied] = useState(false);

  const share = useCallback(async (options: ShareOptions) => {
    if (typeof navigator === 'undefined') return;

    // Web Share API — native sheet on iOS/Android
    if (navigator.share) {
      try {
        await navigator.share(options);
        return;
      } catch (e) {
        // AbortError = user cancelled — don't fall through to clipboard
        if (e instanceof DOMException && e.name === 'AbortError') return;
      }
    }

    // Clipboard fallback for desktop
    try {
      await navigator.clipboard.writeText(options.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard blocked (non-HTTPS or permissions denied) — silently skip
    }
  }, []);

  return { share, copied };
}
```

- [ ] **Step 2: Create ShareButton component**

Create `components/ui/ShareButton.tsx`:

```tsx
'use client';
import React from 'react';
import { Share2, Check } from 'lucide-react';
import { useShare } from '@/hooks/useShare';

interface ShareButtonProps {
  stationName: string;
  stationSlug: string;
  className?: string;
}

export const ShareButton: React.FC<ShareButtonProps> = ({
  stationName,
  stationSlug,
  className = '',
}) => {
  const { share, copied } = useShare();

  const handleShare = () => {
    const url = `${window.location.origin}/station/${stationSlug}`;
    share({
      title: `${stationName} on MBR Radio`,
      text: `Listen to ${stationName} live on MBR Radio`,
      url,
    });
  };

  return (
    <button
      onClick={handleShare}
      className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all hover:bg-white/10 active:scale-90 cursor-pointer ${className}`}
      style={{
        color: copied ? 'var(--color-accent)' : 'var(--color-text-secondary)',
      }}
      aria-label={copied ? 'Link copied!' : `Share ${stationName}`}
      title={copied ? 'Link copied!' : 'Share station'}
    >
      {copied
        ? <Check className="w-5 h-5" />
        : <Share2 className="w-5 h-5" />
      }
    </button>
  );
};
```

- [ ] **Step 3: Add ShareButton to NowPlayingSheet top bar**

In `NowPlayingSheet.tsx`, import:

```typescript
import { ShareButton } from '@/components/ui/ShareButton';
import { slugify } from '@/lib/slug';
```

In the top bar row, replace the trailing spacer:

```tsx
// Before:
<span className="w-11" aria-hidden="true" />

// After:
<ShareButton
  stationName={currentStation.name}
  stationSlug={slugify(currentStation.name)}
/>
```

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Manual test**

**On desktop:**
1. Open NowPlayingSheet
2. Click share icon → icon changes to a checkmark for 2.5s
3. Paste clipboard → `http://localhost:3000/station/capital-fm` (or equivalent)

**On mobile (or Chrome DevTools mobile emulation):**
1. Tap share icon → native OS share sheet appears with the station name and URL

- [ ] **Step 6: Commit**

```bash
git add hooks/useShare.ts components/ui/ShareButton.tsx components/player/NowPlayingSheet.tsx
git commit -m "feat: share station via Web Share API or clipboard in now-playing sheet"
```

---

## Task 5: Related Stations in NowPlayingSheet

**Goal:** Show a "More like this" horizontal station shelf at the bottom of the expanded player, matching what StationDetail already shows.

Note: `useStations` uses a module-level cache shared with `PlayerContext` — adding it here causes zero extra network fetches.

**Files:**
- Modify: `components/player/NowPlayingSheet.tsx`

- [ ] **Step 1: Import dependencies**

In `NowPlayingSheet.tsx`, add:

```typescript
import { useStations } from '@/hooks/useStations';
import { StationTile } from '@/components/station/StationTile';
import { Shelf } from '@/components/ui/Shelf';
```

- [ ] **Step 2: Compute similar stations**

Inside the component body, after the `usePlayer()` destructure, add:

```typescript
const { stations: allStations } = useStations({ autoFetch: true });

const similar = currentStation
  ? allStations
      .filter(s =>
        s.id !== currentStation.id &&
        (s.genre === currentStation.genre || s.region === currentStation.region)
      )
      .sort((a, b) => {
        const aScore = (a.genre === currentStation.genre ? 2 : 0) + (a.region === currentStation.region ? 1 : 0);
        const bScore = (b.genre === currentStation.genre ? 2 : 0) + (b.region === currentStation.region ? 1 : 0);
        return bScore - aScore;
      })
      .slice(0, 8)
  : [];
```

- [ ] **Step 3: Render shelf below RecentTracks**

In the JSX, after the `<div className="mt-8"><RecentTracks .../></div>` block, add:

```tsx
{similar.length > 0 && (
  <div className="mt-6 pb-6">
    <Shelf title="More like this">
      {similar.map(s => (
        <StationTile
          key={s.id}
          station={s}
          isPlaying={currentStation?.id === s.id && isPlaying}
        />
      ))}
    </Shelf>
  </div>
)}
```

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Manual test**
  1. Play any station → open NowPlayingSheet → scroll to bottom
  2. "More like this" shelf appears with up to 8 stations of the same genre/region
  3. Tap a StationTile — it should start playing that station
  4. Play a genre with few stations — shelf appears with as many as exist; if 0 match, shelf is hidden

- [ ] **Step 6: Commit**

```bash
git add components/player/NowPlayingSheet.tsx
git commit -m "feat: related stations shelf in now-playing sheet"
```

---

## Task 6: EmptyState Primitive

**Goal:** Reusable visual empty state with gradient icon container, heading, body text, and optional CTA. Matches Spotify's empty state visual language.

**Design:**
- Centered column layout
- 64×64px rounded-2xl container with semi-transparent indigo gradient background
- Icon: 28×28px, colored `var(--color-accent)`
- Heading: 16px semibold, primary text
- Body: 14px, 1.5 line-height, muted text, max-width 280px
- CTA: 40px height, pill shape (`rounded-full`), indigo-violet gradient, white text

**Files:**
- Create: `components/ui/EmptyState.tsx`

- [ ] **Step 1: Create the component**

```tsx
import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  heading: string;
  body: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  heading,
  body,
  action,
}) => (
  <div className="flex flex-col items-center justify-center py-12 px-6 text-center gap-4">
    <div
      className="w-16 h-16 rounded-2xl flex items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.12) 100%)',
        border: '1px solid rgba(99,102,241,0.18)',
      }}
      aria-hidden="true"
    >
      <span style={{ color: 'var(--color-accent)' }} className="flex items-center justify-center">
        {icon}
      </span>
    </div>

    <div className="space-y-1.5" style={{ maxWidth: 280 }}>
      <p
        className="text-base font-semibold"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {heading}
      </p>
      <p
        className="text-sm leading-relaxed"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {body}
      </p>
    </div>

    {action && (
      <button
        onClick={action.onClick}
        className="mt-1 px-6 h-10 rounded-full text-sm font-semibold text-white transition-transform active:scale-95 cursor-pointer"
        style={{
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        }}
      >
        {action.label}
      </button>
    )}
  </div>
);
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/ui/EmptyState.tsx
git commit -m "feat: EmptyState primitive component"
```

---

## Task 7: Visual Empty States in Library

**Goal:** Replace the two plain-text empty state strings in the Library page with the new `EmptyState` component.

**Files:**
- Modify: `app/library/page.tsx`

- [ ] **Step 1: Import EmptyState and icons**

In `app/library/page.tsx`, add:

```typescript
import { EmptyState } from '@/components/ui/EmptyState';
import { useRouter } from 'next/navigation';
```

`Heart` and `History` icons are already imported.

- [ ] **Step 2: Add router inside LibraryContent**

`LibraryContent` is a `'use client'` component inside a Suspense wrapper — `useRouter` is safe here. Add at the top of `LibraryContent`:

```typescript
const router = useRouter();
```

- [ ] **Step 3: Replace favorites empty state**

Find and replace:

```tsx
// Before:
<p className="text-sm py-4" style={{ color: 'var(--color-text-muted)' }}>
  No favorites yet — tap the heart on any station to save it here.
</p>

// After:
<EmptyState
  icon={<Heart className="w-7 h-7" />}
  heading="No favorites yet"
  body="Tap the heart on any station to save it here."
  action={{ label: 'Browse Stations', onClick: () => router.push('/') }}
/>
```

- [ ] **Step 4: Replace recently played empty state**

Find and replace:

```tsx
// Before:
<p className="text-sm py-4" style={{ color: 'var(--color-text-muted)' }}>
  Stations you play will show up here.
</p>

// After:
<EmptyState
  icon={<History className="w-7 h-7" />}
  heading="Nothing played yet"
  body="Stations you listen to will appear here."
  action={{ label: 'Start Listening', onClick: () => router.push('/') }}
/>
```

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Manual test**
  1. Sign in → go to `/library` with no favorites
  2. Should see gradient-icon empty state with "Browse Stations" button
  3. Click button → navigates to home
  4. If recently played list is also empty, second empty state appears in same style
  5. Add a favorite → empty state disappears, station row appears

- [ ] **Step 7: Commit**

```bash
git add app/library/page.tsx
git commit -m "feat: visual empty states for Library favorites and history sections"
```

---

## Task 8: Genre Hero in Home Page

**Goal:** When a genre filter is active on the home page, show an editorial hero section (Spotify genre page feel) using the genre's color theme.

Context: The home page is `components/MordernAirwave.tsx`. Genre state is `selectedGenre` from `useStationFilter`. The file already imports `getGenreTheme` and `slugify`. `filteredStations` is the post-filter list so its `.length` is the station count.

**Files:**
- Modify: `components/MordernAirwave.tsx`

- [ ] **Step 1: Read the current render structure**

Open `components/MordernAirwave.tsx`. Find the JSX return. Locate where `<SearchAndFilters>` and `<StationGrid>` are rendered. The genre hero should appear between `<SearchAndFilters>` and `<StationGrid>`.

- [ ] **Step 2: Add genre hero JSX**

After `<SearchAndFilters>` (or its enclosing div), add:

```tsx
{selectedGenre && (() => {
  const theme = getGenreTheme(selectedGenre);
  const [gradFrom, gradTo] = theme.gradient;
  return (
    <div
      className="relative rounded-2xl px-6 py-7 mb-5 overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${gradFrom}28 0%, ${gradTo}14 100%)`,
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Radial glow behind the text */}
      <div
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 15% 50%, ${gradFrom}33, transparent 65%)`,
        }}
        aria-hidden="true"
      />
      <p
        className="text-[10px] font-semibold uppercase tracking-[0.22em] mb-1"
        style={{ color: theme.accent }}
      >
        Genre
      </p>
      <h2
        className="text-2xl font-bold"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {selectedGenre}
      </h2>
      <p
        className="text-sm mt-1 tabular-nums"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {filteredStations.length} {filteredStations.length === 1 ? 'station' : 'stations'}
      </p>
    </div>
  );
})()}
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Manual test**
  1. On the home page, click any genre pill (e.g., "Gospel")
  2. A hero section appears above the grid with:
     - "Genre" label in the genre accent color
     - Bold genre name (e.g., "Gospel")
     - Station count ("12 stations")
     - Subtle gradient tint matching the genre
  3. Click a different genre → hero updates instantly
  4. Click "All" or clear the filter → hero disappears
  5. Genre with 1 station → "1 station" (singular)

- [ ] **Step 5: Commit**

```bash
git add components/MordernAirwave.tsx
git commit -m "feat: editorial genre hero when genre filter is active on home page"
```

---

## Self-Review

### Spec Coverage

| UX Improvement | Plan Task |
|----------------|-----------|
| Buffering/stall feedback | Task 2 ✓ |
| Error recovery UI | Task 2 ✓ |
| Volume persistence | Task 1 ✓ |
| Media Session API | Already done ✓ |
| "Stations like this" | Task 5 ✓ |
| Genre pages / discovery | Task 8 ✓ |
| Browser tab title | Already done ✓ |
| Swipe-up to expand player | Task 3 ✓ |
| Swipe-down to dismiss | Task 3 ✓ |
| Station card full-tap (mobile) | StationCard already handles `onClick` on whole card — verify during testing |
| Listener count on player bar | Already done ✓ |
| Song history in sheet | Already done ✓ |
| Share station | Task 4 ✓ |
| Visual empty states | Tasks 6–7 ✓ |
| Keyboard shortcuts overlay | Already done ✓ |
| aria-live for screen readers | Already done ✓ |
| Sleep timer | Already done ✓ |

### Placeholder Scan

No "TBD", "TODO", "implement later", or "add validation" patterns. Every step contains the actual code to write.

### Type Consistency

- `statusText: string | null`, `statusLevel: 'info' | 'error'` — defined in Task 2 Step 2 and used in Steps 3–4
- `ShareOptions` interface in `useShare.ts` matches the call site in `ShareButton.tsx`
- `EmptyStateProps` defined in Task 6 Step 1; same interface used in Task 7

---

## Execution Options

Plan complete and saved to `docs/superpowers/plans/2026-06-20-mbr-radio-ux-overhaul.md`.

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks

**2. Inline Execution** — execute tasks sequentially in this session

Each task is independently deployable — commit after each one for clean rollback points.
