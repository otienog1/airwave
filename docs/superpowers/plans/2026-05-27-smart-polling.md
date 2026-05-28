# Smart Polling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a station returns `startTime` + `durationSeconds` in its metadata (Zetta stations: Capital FM, Kiss 100, Classic 105), schedule a one-shot poll timed to fire exactly when the current song ends — instead of waiting up to 15 seconds for the flat interval to catch the new track.

**Architecture:** A single new ref (`smartPollTimerRef`) is added to `useStreamMetadata`. After every successful fetch, a helper function `scheduleSmartPoll` computes the song's remaining time and arms a one-shot `setTimeout`. The 15s interval continues running as a fallback for stations without timing data. The smart timer is cancelled on URL change, title change (a new one will be rescheduled), and unmount.

**Tech Stack:** React hooks, TypeScript — single file change only.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `hooks/useStreamMetadata.ts` | Modify | Add `smartPollTimerRef`, `parseDurationString()`, `scheduleSmartPoll()`, cancel logic |

---

## Task 1: Add Duration Parser + Smart Poll Scheduler

**Files:**
- Modify: `hooks/useStreamMetadata.ts`

This is a single-task plan. All logic lives in one file.

### Step 1: Read the current file

Open `hooks/useStreamMetadata.ts` and confirm it matches this structure:

```
useStreamMetadata(streamUrl, station, pollInterval = 15_000)
  refs: timerRef, prevTitleRef, openPlayIdRef, stationRef
  callbacks: closeOpenPlay, fetchMetadata
  effects: [streamUrl] setup/teardown, [unmount] closeOpenPlay
```

- [ ] **Step 2: Write the complete replacement for `hooks/useStreamMetadata.ts`**

Replace the entire file with:

```typescript
import { useState, useEffect, useRef, useCallback } from 'react';
import type { Station } from '@/types/Station';

export interface StreamMetadata {
  title: string | null;
  artist: string | null;
  song: string | null;
  duration: string | null;
  durationSeconds: number | null;
  startTime: string | null;
  category: string | null;
  stationName: string | null;
  genre: string | null;
  bitrate: number | null;
  samplerate: number | null;
  listeners: number | null;
  source: 'zetta' | 'icecast' | 'icy' | null;
  loading: boolean;
}

const EMPTY_META: StreamMetadata = {
  title: null, artist: null, song: null,
  duration: null, durationSeconds: null, startTime: null, category: null,
  stationName: null, genre: null, bitrate: null, samplerate: null, listeners: null,
  source: null, loading: false,
};

const SMART_POLL_BUFFER_MS = 2_000;   // fire 2s after predicted song end
const SMART_POLL_MIN_MS   = 2_000;   // ignore if song ends in < 2s (too close)
const SMART_POLL_MAX_MS   = 10 * 60 * 1000; // ignore if > 10 min away (stale data)

/**
 * Parse "MM:SS" duration string → seconds.
 * Returns null if the string is missing or malformed.
 */
function parseDurationString(duration: string): number | null {
  const parts = duration.split(':');
  if (parts.length !== 2) return null;
  const [mm, ss] = parts.map(Number);
  if (isNaN(mm) || isNaN(ss)) return null;
  return mm * 60 + ss;
}

/**
 * Given metadata from a poll response, compute how many milliseconds
 * remain until the current song ends.
 * Returns null when timing data is unavailable or out of range.
 */
function msUntilSongEnd(data: StreamMetadata): number | null {
  const startMs = data.startTime ? new Date(data.startTime).getTime() : null;
  if (!startMs || isNaN(startMs)) return null;

  // Prefer durationSeconds; fall back to parsing the "MM:SS" string
  const durationSec =
    data.durationSeconds ??
    (data.duration ? parseDurationString(data.duration) : null);
  if (durationSec == null) return null;

  const songEndsAt = startMs + durationSec * 1000;
  const remaining  = songEndsAt - Date.now();

  if (remaining <= SMART_POLL_MIN_MS) return null;   // already ended / too close
  if (remaining > SMART_POLL_MAX_MS)  return null;   // data looks stale / wrong
  return remaining;
}

async function postPlayEvent(station: Station, meta: StreamMetadata): Promise<string | null> {
  try {
    const res = await fetch('/api/analytics/play-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        station,
        track: {
          title:           meta.title,
          artist:          meta.artist,
          song:            meta.song,
          duration:        meta.duration,
          durationSeconds: meta.durationSeconds,
          category:        meta.category,
          source:          meta.source,
          bitrate:         meta.bitrate,
          listeners:       meta.listeners,
        },
      }),
    });
    const data = await res.json();
    return data.playId ?? null;
  } catch {
    return null;
  }
}

async function patchClosePlay(playId: string): Promise<void> {
  try {
    await fetch('/api/analytics/play-event', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playId }),
    });
  } catch {
    // best-effort
  }
}

export function useStreamMetadata(
  streamUrl: string | null,
  station: Station | null,
  pollInterval = 15_000
): StreamMetadata {
  const [meta, setMeta] = useState<StreamMetadata>(EMPTY_META);
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const smartPollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevTitleRef     = useRef<string | null>(null);
  const openPlayIdRef    = useRef<string | null>(null);
  const stationRef       = useRef<Station | null>(station);
  // Keep a ref to the current streamUrl so the smart poll closure always fires
  // against the URL that was active when the timer was set.
  const streamUrlRef     = useRef<string | null>(streamUrl);

  useEffect(() => { stationRef.current  = station;   }, [station]);
  useEffect(() => { streamUrlRef.current = streamUrl; }, [streamUrl]);

  const cancelSmartPoll = useCallback(() => {
    if (smartPollTimerRef.current) {
      clearTimeout(smartPollTimerRef.current);
      smartPollTimerRef.current = null;
    }
  }, []);

  const closeOpenPlay = useCallback(async () => {
    if (openPlayIdRef.current) {
      await patchClosePlay(openPlayIdRef.current);
      openPlayIdRef.current = null;
    }
  }, []);

  const fetchMetadata = useCallback(async (url: string) => {
    try {
      const res      = await fetch(`/api/stream-metadata?url=${encodeURIComponent(url)}`);
      const data: StreamMetadata = await res.json();
      const fullMeta = { ...EMPTY_META, ...data, loading: false };

      setMeta(fullMeta);

      // ── Smart poll scheduling ──────────────────────────────────────────────
      // Always cancel any pending smart poll first (song may have changed or
      // we're rescheduling for the same song with updated remaining time).
      cancelSmartPoll();

      const remaining = msUntilSongEnd(data);
      if (remaining !== null) {
        const delay = remaining + SMART_POLL_BUFFER_MS;
        smartPollTimerRef.current = setTimeout(() => {
          smartPollTimerRef.current = null;
          const currentUrl = streamUrlRef.current;
          if (currentUrl) fetchMetadata(currentUrl);
        }, delay);
      }
      // ──────────────────────────────────────────────────────────────────────

      // Detect title change — post play event to analytics
      const currentStation = stationRef.current;
      if (data.title && data.title !== prevTitleRef.current && currentStation) {
        await closeOpenPlay();
        prevTitleRef.current = data.title;
        const playId = await postPlayEvent(currentStation, fullMeta);
        openPlayIdRef.current = playId;
      }

      // Fire-and-forget health snapshot
      if (currentStation) {
        fetch('/api/analytics/snapshot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            station: currentStation,
            isOnline: true,
            lastMetaSource: data.source ?? null,
            listeners: data.listeners ?? null,
          }),
        }).catch(() => {});
      }
    } catch {
      setMeta(prev => ({ ...prev, loading: false }));
      const currentStation = stationRef.current;
      if (currentStation) {
        fetch('/api/analytics/snapshot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ station: currentStation, isOnline: false, lastMetaSource: null, listeners: null }),
        }).catch(() => {});
      }
    }
  }, [closeOpenPlay, cancelSmartPoll]);

  useEffect(() => {
    if (!streamUrl) {
      setMeta(EMPTY_META);
      prevTitleRef.current = null;
      cancelSmartPoll();
      closeOpenPlay();
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    setMeta(prev => ({ ...prev, loading: true }));
    fetchMetadata(streamUrl);

    timerRef.current = setInterval(() => fetchMetadata(streamUrl), pollInterval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      cancelSmartPoll();
    };
  }, [streamUrl, pollInterval, fetchMetadata, closeOpenPlay, cancelSmartPoll]);

  // Close open play + cancel smart poll on unmount
  useEffect(() => {
    return () => {
      closeOpenPlay();
      cancelSmartPoll();
    };
  }, [closeOpenPlay, cancelSmartPoll]);

  return meta;
}
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no output (clean exit).

- [ ] **Step 4: Verify behaviour mentally / in browser**

Play **Capital FM** (uses Zetta → returns `startTime` + `durationSeconds`).

Open DevTools → Network tab → filter by `stream-metadata`.

You should see:
1. An initial fetch on play.
2. Regular fetches every 15s (flat interval).
3. An **extra fetch** that arrives close to the predicted song end time:
   - If the song has `durationSeconds: 226.65` and `startTime` from 2 minutes ago,
     the smart poll fires in ~`226.65 - 120 + 2 = ~108.65` seconds from now.
4. After the song changes, the pattern resets: a new smart poll is scheduled for the new song's duration.

For **Ghetto Radio** or **KBC** (ICY/plain, no `startTime`): only the regular 15s fetches appear — no smart poll.

- [ ] **Step 5: Commit**

```bash
git add hooks/useStreamMetadata.ts
git commit -m "feat: add smart end-of-song polling for stations with Zetta timing metadata"
```

---

## Self-Review

### Spec Coverage

| Requirement | Covered |
|---|---|
| Song end = startTime + durationSeconds | `msUntilSongEnd()` — `startMs + durationSec * 1000` |
| Fallback: parse `"MM:SS"` duration string | `parseDurationString()` used when `durationSeconds` is null |
| 2s buffer after predicted end | `SMART_POLL_BUFFER_MS = 2_000` added to delay |
| Skip if remaining ≤ 2s (already ended) | `if (remaining <= SMART_POLL_MIN_MS) return null` |
| Skip if remaining > 10 min (stale data) | `if (remaining > SMART_POLL_MAX_MS) return null` |
| Cancel on streamUrl change | `cancelSmartPoll()` in `useEffect` cleanup return |
| Cancel on title change | `cancelSmartPoll()` at top of smart-poll block in `fetchMetadata` (always cancel before rescheduling) |
| Cancel on unmount | unmount `useEffect` calls `cancelSmartPoll()` |
| 15s interval continues as fallback | `setInterval` unchanged |
| Smart poll is one-shot | `smartPollTimerRef.current = null` inside the timeout callback |
| Closure reads current URL | `streamUrlRef` kept in sync; timeout callback reads `streamUrlRef.current` |

### Placeholder Scan

No TBDs. All code is complete and exact.

### Type Consistency

- `msUntilSongEnd(data: StreamMetadata)` — `StreamMetadata` defined at top of same file. ✓
- `parseDurationString(duration: string): number | null` — called with `data.duration` which is `string | null`, guarded by `data.duration ?` ternary. ✓
- `cancelSmartPoll` — `useCallback` returning `void`, called in three places: `fetchMetadata`, `useEffect` cleanup, unmount effect. ✓
- `streamUrlRef.current` read inside the timeout callback — ref updated by `useEffect(() => { streamUrlRef.current = streamUrl; }, [streamUrl])`. ✓
