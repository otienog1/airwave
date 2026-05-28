# Real-Time Listener Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show how many AirWave app users are currently playing each station in real-time, using a heartbeat session system backed by MongoDB.

**Architecture:** Each browser session gets a UUID (persisted in localStorage). When a user plays a station, a `listenerSessions` document is upserted; a 30-second client heartbeat keeps it alive. MongoDB's TTL index (45s on `lastHeartbeat`) auto-expires sessions that go silent. A `GET /api/listeners/counts` aggregation returns a `{ [stationId]: count }` map that the client polls every 30s and renders as a badge on each station card and in the bottom player bar.

**Tech Stack:** Next.js 14 App Router, TypeScript, `mongodb` native driver (already installed), React hooks.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `lib/mongodb.ts` | Modify | Add `ListenerSessionDocument`, `getListenerSessionsCollection()`, TTL index in `ensureIndexes()` |
| `app/api/listeners/join/route.ts` | Create | Upsert session on play |
| `app/api/listeners/heartbeat/route.ts` | Create | Refresh `lastHeartbeat` |
| `app/api/listeners/leave/route.ts` | Create | Delete session on stop |
| `app/api/listeners/counts/route.ts` | Create | Aggregate live counts per station |
| `hooks/useListeners.ts` | Create | Session lifecycle + counts polling |
| `components/MordernAirwave.tsx` | Modify | Wire `useListeners`, pass `listenerCounts` down |
| `components/station/StationGrid.tsx` | Modify | Accept + forward `listenerCounts` prop |
| `components/station/StationCard.tsx` | Modify | Show "X listening" badge |
| `components/player/AudioPlayer.tsx` | Modify | Accept + pass `liveListeners` to `StationInfo` |
| `components/player/StationInfo.tsx` | Modify | Render live listener count |

---

## Task 1: Extend `lib/mongodb.ts` with Listener Session Types

**Files:**
- Modify: `lib/mongodb.ts`

- [ ] **Step 1: Add `ListenerSessionDocument` interface and `getListenerSessionsCollection()` to `lib/mongodb.ts`**

Open `lib/mongodb.ts`. After the `SnapshotDocument` interface (line 68), add:

```typescript
export interface ListenerSessionDocument {
  _id?: import('mongodb').ObjectId;
  sessionId: string;
  stationId: number;
  stationName: string;
  startedAt: Date;
  lastHeartbeat: Date;
  endedAt: Date | null;
}
```

After `getSnapshotsCollection()` (after line 37), add:

```typescript
export async function getListenerSessionsCollection(): Promise<Collection<ListenerSessionDocument>> {
  const db = await getDb();
  return db.collection<ListenerSessionDocument>('listenerSessions');
}
```

- [ ] **Step 2: Add listener session indexes to `ensureIndexes()`**

Inside `ensureIndexes()`, after the existing snapshot indexes (end of function), add:

```typescript
  const sessions = await getListenerSessionsCollection();

  // TTL: auto-expire sessions whose heartbeat has gone silent for 45s
  await sessions.createIndex(
    { lastHeartbeat: 1 },
    { expireAfterSeconds: 45, name: 'session_heartbeat_ttl' }
  );
  // Query: fast count by stationId for live sessions
  await sessions.createIndex(
    { stationId: 1, endedAt: 1 },
    { name: 'session_station_active' }
  );
  // Unique: one document per sessionId
  await sessions.createIndex(
    { sessionId: 1 },
    { unique: true, name: 'session_id_unique' }
  );
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no output (clean).

- [ ] **Step 4: Commit**

```bash
git add lib/mongodb.ts
git commit -m "feat: add ListenerSessionDocument and listener session indexes to MongoDB"
```

---

## Task 2: API Routes — Join, Heartbeat, Leave

**Files:**
- Create: `app/api/listeners/join/route.ts`
- Create: `app/api/listeners/heartbeat/route.ts`
- Create: `app/api/listeners/leave/route.ts`

### join

- [ ] **Step 1: Create `app/api/listeners/join/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getListenerSessionsCollection } from '@/lib/mongodb';

/**
 * POST /api/listeners/join
 * Body: { sessionId: string, stationId: number, stationName: string }
 * Upserts a listener session document. Safe to call on every play/station-change.
 */
export async function POST(req: NextRequest) {
  try {
    const { sessionId, stationId, stationName } = await req.json() as {
      sessionId: string;
      stationId: number;
      stationName: string;
    };

    if (!sessionId || !stationId) {
      return NextResponse.json({ error: 'Missing sessionId or stationId' }, { status: 400 });
    }

    const sessions = await getListenerSessionsCollection();
    const now = new Date();

    await sessions.updateOne(
      { sessionId },
      {
        $set: { stationId, stationName, lastHeartbeat: now, endedAt: null },
        $setOnInsert: { startedAt: now },
      },
      { upsert: true }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[listeners/join]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

### heartbeat

- [ ] **Step 2: Create `app/api/listeners/heartbeat/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getListenerSessionsCollection } from '@/lib/mongodb';

/**
 * POST /api/listeners/heartbeat
 * Body: { sessionId: string }
 * Refreshes lastHeartbeat to keep the session alive past the 45s TTL.
 */
export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json() as { sessionId: string };

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    const sessions = await getListenerSessionsCollection();
    await sessions.updateOne(
      { sessionId, endedAt: null },
      { $set: { lastHeartbeat: new Date() } }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[listeners/heartbeat]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

### leave

- [ ] **Step 3: Create `app/api/listeners/leave/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getListenerSessionsCollection } from '@/lib/mongodb';

/**
 * POST /api/listeners/leave
 * Body: { sessionId: string }
 * Deletes the session document immediately (faster than waiting for TTL).
 */
export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json() as { sessionId: string };

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    const sessions = await getListenerSessionsCollection();
    await sessions.deleteOne({ sessionId });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[listeners/leave]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no output (clean).

- [ ] **Step 5: Commit**

```bash
git add app/api/listeners/join/route.ts app/api/listeners/heartbeat/route.ts app/api/listeners/leave/route.ts
git commit -m "feat: add listener session join/heartbeat/leave API routes"
```

---

## Task 3: API Route — Counts

**Files:**
- Create: `app/api/listeners/counts/route.ts`

- [ ] **Step 1: Create `app/api/listeners/counts/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import { getListenerSessionsCollection } from '@/lib/mongodb';

/**
 * GET /api/listeners/counts
 * Returns { counts: { [stationId]: number } } — live session count per station.
 * Only counts sessions with endedAt: null (TTL handles the rest).
 */
export async function GET() {
  try {
    const sessions = await getListenerSessionsCollection();

    const agg = await sessions.aggregate<{ _id: number; count: number }>([
      { $match: { endedAt: null } },
      { $group: { _id: '$stationId', count: { $sum: 1 } } },
    ]).toArray();

    const counts: Record<number, number> = {};
    for (const row of agg) {
      counts[row._id] = row.count;
    }

    return NextResponse.json({ counts }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    console.error('[listeners/counts]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no output (clean).

- [ ] **Step 3: Commit**

```bash
git add app/api/listeners/counts/route.ts
git commit -m "feat: add GET /api/listeners/counts aggregation route"
```

---

## Task 4: `useListeners` Hook

**Files:**
- Create: `hooks/useListeners.ts`

- [ ] **Step 1: Create `hooks/useListeners.ts`**

```typescript
import { useState, useEffect, useRef, useCallback } from 'react';

const LS_KEY = 'airwave_session_id';
const HEARTBEAT_MS = 30_000;
const COUNTS_POLL_MS = 30_000;

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(LS_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(LS_KEY, id);
  }
  return id;
}

async function apiPost(path: string, body: object): Promise<void> {
  try {
    await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    // best-effort — never throw
  }
}

export function useListeners(
  currentStationId: number | null,
  currentStationName: string | null,
  isPlaying: boolean
): Record<number, number> {
  const [listenerCounts, setListenerCounts] = useState<Record<number, number>>({});
  const sessionId = useRef<string>('');
  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const countsTimer    = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevStationId  = useRef<number | null>(null);

  // Initialise sessionId once on the client
  useEffect(() => {
    sessionId.current = getOrCreateSessionId();
  }, []);

  const fetchCounts = useCallback(async () => {
    try {
      const res = await fetch('/api/listeners/counts');
      const data = await res.json() as { counts: Record<number, number> };
      setListenerCounts(data.counts ?? {});
    } catch {
      // keep stale counts
    }
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current);
      heartbeatTimer.current = null;
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    stopHeartbeat();
    heartbeatTimer.current = setInterval(() => {
      if (sessionId.current) {
        apiPost('/api/listeners/heartbeat', { sessionId: sessionId.current });
      }
    }, HEARTBEAT_MS);
  }, [stopHeartbeat]);

  // React to play/pause and station changes
  useEffect(() => {
    if (!sessionId.current) return;

    const sid = sessionId.current;
    const stationChanged = currentStationId !== prevStationId.current;

    if (!isPlaying || currentStationId === null) {
      // Leaving — clean up previous session
      if (prevStationId.current !== null) {
        apiPost('/api/listeners/leave', { sessionId: sid });
      }
      stopHeartbeat();
      prevStationId.current = null;
      return;
    }

    if (stationChanged) {
      // Leave previous station before joining new one
      if (prevStationId.current !== null) {
        apiPost('/api/listeners/leave', { sessionId: sid });
      }
      prevStationId.current = currentStationId;
      apiPost('/api/listeners/join', {
        sessionId: sid,
        stationId: currentStationId,
        stationName: currentStationName ?? '',
      });
      startHeartbeat();
      fetchCounts();
    }
  }, [isPlaying, currentStationId, currentStationName, startHeartbeat, stopHeartbeat, fetchCounts]);

  // Poll counts independently of play state
  useEffect(() => {
    fetchCounts();
    countsTimer.current = setInterval(fetchCounts, COUNTS_POLL_MS);
    return () => {
      if (countsTimer.current) clearInterval(countsTimer.current);
    };
  }, [fetchCounts]);

  // Leave on unmount
  useEffect(() => {
    return () => {
      stopHeartbeat();
      if (sessionId.current && prevStationId.current !== null) {
        apiPost('/api/listeners/leave', { sessionId: sessionId.current });
      }
    };
  }, [stopHeartbeat]);

  return listenerCounts;
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no output (clean).

- [ ] **Step 3: Commit**

```bash
git add hooks/useListeners.ts
git commit -m "feat: add useListeners hook with session join/heartbeat/leave and counts polling"
```

---

## Task 5: Wire `useListeners` into `MordernAirwave.tsx`

**Files:**
- Modify: `components/MordernAirwave.tsx`

- [ ] **Step 1: Import `useListeners` at the top of `MordernAirwave.tsx`**

Find the existing imports block (around line 4–11). Add after the existing hook imports:

```typescript
import { useListeners } from '@/hooks/useListeners';
```

- [ ] **Step 2: Call the hook after the existing hook calls**

In `MordernAirwave.tsx`, find the block that ends with:

```typescript
    const { title: nowPlaying } = useStreamMetadata(
        isPlaying && currentStation ? currentStation.url : null,
        currentStation
    );
```

Add immediately after it:

```typescript
    const listenerCounts = useListeners(
        currentStation?.id ?? null,
        currentStation?.name ?? null,
        isPlaying
    );
```

- [ ] **Step 3: Pass `listenerCounts` to `StationGrid`**

Find the `<StationGrid ...>` JSX block. Add the `listenerCounts` prop:

```tsx
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
                nowPlaying={nowPlaying}
                listenerCounts={listenerCounts}
            />
```

- [ ] **Step 4: Pass `liveListeners` to `AudioPlayer`**

Find the `<AudioPlayer ...>` JSX block. Add the `liveListeners` prop:

```tsx
            <AudioPlayer
                currentStation={currentStation}
                isPlaying={isPlaying}
                volume={volume}
                isMuted={isMuted}
                onTogglePlay={togglePlay}
                onVolumeChange={handleVolumeChange}
                onMuteToggle={toggleMute}
                isLoading={isLoading}
                nowPlaying={nowPlaying}
                liveListeners={currentStation ? (listenerCounts[currentStation.id] ?? 0) : 0}
            />
```

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: errors about missing props on `StationGrid`, `StationCard`, `AudioPlayer`, `StationInfo` — these are fixed in Tasks 6 and 7. If there are other unexpected errors, fix them now.

- [ ] **Step 6: Commit**

```bash
git add components/MordernAirwave.tsx
git commit -m "feat: wire useListeners into MordernAirwave, pass listenerCounts to grid and player"
```

---

## Task 6: Listener Count Badge on `StationCard` and `StationGrid`

**Files:**
- Modify: `components/station/StationGrid.tsx`
- Modify: `components/station/StationCard.tsx`

### StationGrid

- [ ] **Step 1: Add `listenerCounts` prop to `StationGrid`**

Open `components/station/StationGrid.tsx`. In the `StationGridProps` interface, add:

```typescript
    listenerCounts?: Record<number, number>;
```

In the destructured props of `StationGrid`, add `listenerCounts`:

```typescript
export const StationGrid: React.FC<StationGridProps> = ({
    stations,
    loading,
    error,
    currentStation,
    isPlaying,
    isAudioLoading,
    favorites,
    onPlay,
    onFavorite,
    onRetry,
    nowPlaying,
    listenerCounts,
}) => {
```

Pass it to each `StationCard`:

```tsx
                    <StationCard
                        key={station.id}
                        station={station}
                        isPlaying={isPlaying && isCurrent}
                        isCurrentStation={isCurrent}
                        isLoading={isAudioLoading && isCurrent}
                        onPlay={() => onPlay(station)}
                        onFavorite={() => onFavorite(station.id)}
                        isFavorite={favorites.has(station.id)}
                        nowPlaying={isCurrent ? nowPlaying : null}
                        liveListeners={listenerCounts?.[station.id] ?? 0}
                    />
```

### StationCard

- [ ] **Step 2: Add `liveListeners` prop to `StationCard`**

Open `components/station/StationCard.tsx`. In the `StationCardProps` interface, add:

```typescript
    liveListeners?: number;
```

In the destructured props, add `liveListeners`:

```typescript
export const StationCard: React.FC<StationCardProps> = ({
    station,
    isPlaying,
    isCurrentStation,
    isLoading,
    onPlay,
    onFavorite,
    isFavorite,
    nowPlaying,
    liveListeners = 0,
}) => {
```

- [ ] **Step 3: Render the listener badge in the meta row**

In `StationCard`, find the meta row — the line:

```tsx
                {station.is_live && (
```

Add the listener count badge **after** the closing `</div>` of the meta row (after `{frequency && ...}`), just before the `{/* Play button */}` comment:

```tsx
                {/* Listener count badge */}
                {liveListeners > 0 && (
                    <div className="flex items-center gap-1 mb-2">
                        <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ background: colors.accent, opacity: 0.7 }}
                        />
                        <span className="text-xs tabular-nums" style={{ color: colors.accent }}>
                            {liveListeners.toLocaleString()} listening now
                        </span>
                    </div>
                )}
```

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no output (clean).

- [ ] **Step 5: Commit**

```bash
git add components/station/StationGrid.tsx components/station/StationCard.tsx
git commit -m "feat: show live listener count badge on StationCard"
```

---

## Task 7: Listener Count in Bottom Player Bar

**Files:**
- Modify: `components/player/AudioPlayer.tsx`
- Modify: `components/player/StationInfo.tsx`

### AudioPlayer

- [ ] **Step 1: Add `liveListeners` prop to `AudioPlayer`**

Open `components/player/AudioPlayer.tsx`. In the `AudioPlayerProps` interface add:

```typescript
    liveListeners?: number;
```

In the destructured props add `liveListeners`:

```typescript
export const AudioPlayer: React.FC<AudioPlayerProps> = ({
    currentStation,
    isPlaying,
    volume,
    isMuted,
    onTogglePlay,
    onVolumeChange,
    onMuteToggle,
    isLoading,
    nowPlaying,
    liveListeners = 0,
}) => {
```

Pass it to `StationInfo`:

```tsx
                    <StationInfo
                        station={currentStation}
                        isPlaying={isPlaying}
                        nowPlaying={nowPlaying}
                        liveListeners={liveListeners}
                    />
```

### StationInfo

- [ ] **Step 2: Add `liveListeners` prop and render it in `StationInfo`**

Open `components/player/StationInfo.tsx`. The full file after the change:

```typescript
import React from 'react';
import { StationAvatar } from '@/components/station/StationAvatar';
import { Station } from '../../types/Station';

interface StationInfoProps {
    station: Station;
    isPlaying?: boolean;
    nowPlaying?: string | null;
    liveListeners?: number;
}

export const StationInfo: React.FC<StationInfoProps> = ({
    station,
    isPlaying,
    nowPlaying,
    liveListeners = 0,
}) => (
    <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="relative">
            <StationAvatar
                name={station.name}
                logoUrl={station.logo_url}
                size={44}
            />
            {isPlaying && (
                <div
                    className="absolute inset-0 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(99,102,241,0.15)' }}
                >
                    <div className="flex items-end gap-0.5" style={{ height: '18px' }}>
                        {[0, 1, 2, 3].map(i => (
                            <div
                                key={i}
                                className="waveform-bar"
                                style={{ background: '#6366f1', animationDelay: `${i * 0.15}s` }}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>

        <div className="min-w-0 flex-1">
            <h4
                className="font-semibold text-sm leading-tight truncate"
                style={{ color: 'var(--color-text-primary)' }}
            >
                {station.name}
            </h4>
            {station.description && (
                <p
                    className="text-xs truncate mt-0.5"
                    style={{ color: 'var(--color-text-secondary)' }}
                >
                    {station.description}
                </p>
            )}
            {nowPlaying && (
                <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-accent)' }}>
                    ♪ {nowPlaying}
                </p>
            )}
            {liveListeners > 0 && (
                <p className="text-xs mt-0.5 tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
                    {liveListeners.toLocaleString()} listening now
                </p>
            )}
        </div>
    </div>
);
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no output (clean).

- [ ] **Step 4: Commit**

```bash
git add components/player/AudioPlayer.tsx components/player/StationInfo.tsx
git commit -m "feat: show live listener count in bottom player bar"
```

---

## Self-Review

### Spec Coverage

| Requirement | Task |
|---|---|
| UUID sessionId persisted in localStorage | Task 4 (`getOrCreateSessionId`) |
| POST /api/listeners/join on play | Task 2, Task 4 |
| POST /api/listeners/heartbeat every 30s | Task 2, Task 4 (`startHeartbeat`) |
| POST /api/listeners/leave on pause/stop/unmount | Task 2, Task 4 |
| GET /api/listeners/counts aggregation | Task 3 |
| TTL index 45s on `lastHeartbeat` | Task 1 |
| Leave previous station when switching | Task 4 (`stationChanged` check) |
| Poll counts every 30s | Task 4 (`countsTimer`) |
| "X listening now" badge on StationCard | Task 6 |
| "X listening now" in bottom player | Task 7 |
| MordernAirwave wired | Task 5 |

### Placeholder Scan

No TBDs, no "implement later", no "add error handling". All code is complete in every step.

### Type Consistency

- `listenerCounts: Record<number, number>` — defined in `useListeners` return, used in `MordernAirwave`, `StationGrid`, `StationCard` — consistent.
- `liveListeners: number` — passed from `MordernAirwave` → `AudioPlayer` → `StationInfo`; and from `StationGrid` → `StationCard` — consistent.
- `getListenerSessionsCollection()` — defined in `lib/mongodb.ts` Task 1, imported in all four route files in Tasks 2–3 — consistent.
- `ListenerSessionDocument` fields (`sessionId`, `stationId`, `lastHeartbeat`, `endedAt`) — used identically in join/heartbeat/leave/counts routes — consistent.
