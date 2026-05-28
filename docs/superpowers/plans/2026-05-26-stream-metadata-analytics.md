# Stream Metadata Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every time a Kenyan radio station plays a new song, write a structured record to MongoDB — capturing station, track, time, and stream health data suitable for song-play history, trending charts, genre/time heatmaps, and station uptime monitoring.

**Architecture:** A singleton MongoDB client (`lib/mongodb.ts`) is shared across all Next.js API routes. The client-side `useStreamMetadata` hook detects title changes by comparing the previous title ref to the new one, then POSTs a play-event; when a new title arrives it also fires a PATCH to close the previous play's `endedAt`. All analytics reads go through dedicated GET routes that run aggregation pipelines directly on the `plays` and `stationSnapshots` collections.

**Tech Stack:** Next.js 14 App Router, TypeScript, `mongodb` npm package (native driver, no mongoose), MongoDB Atlas (or local), TTL index for 90-day auto-purge.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `lib/mongodb.ts` | Create | Singleton MongoClient, typed collection getters |
| `lib/analytics.ts` | Create | `insertPlay`, `closePlay`, `insertSnapshot`, `getTrending`, `getStationHistory` |
| `app/api/analytics/play-event/route.ts` | Create | `POST` new play, `PATCH` close previous play |
| `app/api/analytics/trending/route.ts` | Create | `GET` top songs last 1h / 24h |
| `app/api/analytics/station/[id]/route.ts` | Create | `GET` play history for one station |
| `hooks/useStreamMetadata.ts` | Modify | Detect title changes → POST/PATCH play events |
| `.env.local` | Modify | Add `MONGODB_URI` |

---

## Task 1: MongoDB Client Singleton

**Files:**
- Create: `lib/mongodb.ts`
- Modify: `.env.local`

- [ ] **Step 1: Add `MONGODB_URI` to `.env.local`**

Open `.env.local` (create it if missing at the project root) and add:

```
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/airwave?retryWrites=true&w=majority
```

For local dev you can use:
```
MONGODB_URI=mongodb://localhost:27017/airwave
```

- [ ] **Step 2: Install the MongoDB driver**

```bash
yarn add mongodb
```

Expected: `mongodb` appears in `package.json` dependencies.

- [ ] **Step 3: Create `lib/mongodb.ts`**

```typescript
import { MongoClient, Collection, Db } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is not set');
}

const uri = process.env.MONGODB_URI;

// Singleton pattern for Next.js hot-reload safety
const globalWithMongo = global as typeof globalThis & {
  _mongoClient?: MongoClient;
};

let client: MongoClient;

if (process.env.NODE_ENV === 'development') {
  if (!globalWithMongo._mongoClient) {
    globalWithMongo._mongoClient = new MongoClient(uri);
  }
  client = globalWithMongo._mongoClient;
} else {
  client = new MongoClient(uri);
}

export async function getDb(): Promise<Db> {
  await client.connect();
  return client.db();
}

export async function getPlaysCollection(): Promise<Collection<PlayDocument>> {
  const db = await getDb();
  return db.collection<PlayDocument>('plays');
}

export async function getSnapshotsCollection(): Promise<Collection<SnapshotDocument>> {
  const db = await getDb();
  return db.collection<SnapshotDocument>('stationSnapshots');
}

// ── Document types ─────────────────────────────────────────────────────────

export interface PlayDocument {
  _id?: import('mongodb').ObjectId;
  // Station context
  stationId: number;
  stationName: string;
  stationGenre: string | null;
  stationRegion: string | null;
  stationFrequency: string | null;
  // Track info
  title: string;
  artist: string | null;
  song: string | null;
  duration: string | null;
  durationSeconds: number | null;
  category: string | null;
  // Stream health snapshot
  source: 'zetta' | 'icecast' | 'icy' | null;
  bitrate: number | null;
  listeners: number | null;
  // Timing
  detectedAt: Date;
  endedAt: Date | null;
  playDuration: number | null; // seconds, filled when endedAt set
}

export interface SnapshotDocument {
  _id?: import('mongodb').ObjectId;
  stationId: number;
  stationName: string;
  listeners: number | null;
  isOnline: boolean;
  lastMetaSource: 'zetta' | 'icecast' | 'icy' | null;
  snapshotAt: Date;
}
```

- [ ] **Step 4: Create TTL + performance indexes**

Add an `ensureIndexes` function at the bottom of `lib/mongodb.ts`:

```typescript
export async function ensureIndexes(): Promise<void> {
  const plays = await getPlaysCollection();
  const snapshots = await getSnapshotsCollection();

  // TTL: auto-delete plays older than 90 days
  await plays.createIndex({ detectedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90, name: 'ttl_90d' });

  // Query performance
  await plays.createIndex({ stationId: 1, detectedAt: -1 }, { name: 'station_time' });
  await plays.createIndex({ title: 1, detectedAt: -1 }, { name: 'title_time' });
  await plays.createIndex({ stationGenre: 1, detectedAt: -1 }, { name: 'genre_time' });
  await plays.createIndex({ endedAt: 1 }, { name: 'open_plays', sparse: true });

  await snapshots.createIndex({ stationId: 1, snapshotAt: -1 }, { name: 'snapshot_station_time' });
  await snapshots.createIndex({ snapshotAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30, name: 'snapshot_ttl_30d' });
}
```

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add lib/mongodb.ts .env.local package.json yarn.lock
git commit -m "feat: add MongoDB singleton client with play/snapshot document types and TTL indexes"
```

---

## Task 2: Analytics Library Functions

**Files:**
- Create: `lib/analytics.ts`

- [ ] **Step 1: Create `lib/analytics.ts`**

```typescript
import { ObjectId } from 'mongodb';
import {
  getPlaysCollection,
  getSnapshotsCollection,
  PlayDocument,
  SnapshotDocument,
} from './mongodb';
import type { Station } from '@/types/Station';

// ── Writes ─────────────────────────────────────────────────────────────────

export interface TrackInfo {
  title: string;
  artist: string | null;
  song: string | null;
  duration: string | null;
  durationSeconds: number | null;
  category: string | null;
  source: 'zetta' | 'icecast' | 'icy' | null;
  bitrate: number | null;
  listeners: number | null;
}

/** Insert a new play event. Returns the inserted document's _id as a string. */
export async function insertPlay(station: Station, track: TrackInfo): Promise<string> {
  const plays = await getPlaysCollection();
  const doc: PlayDocument = {
    stationId: station.id,
    stationName: station.name,
    stationGenre: station.genre ?? null,
    stationRegion: station.region ?? null,
    stationFrequency: station.frequency ?? null,
    title: track.title,
    artist: track.artist,
    song: track.song,
    duration: track.duration,
    durationSeconds: track.durationSeconds,
    category: track.category,
    source: track.source,
    bitrate: track.bitrate,
    listeners: track.listeners,
    detectedAt: new Date(),
    endedAt: null,
    playDuration: null,
  };
  const result = await plays.insertOne(doc);
  return result.insertedId.toString();
}

/** Close a previous play by setting endedAt and computing playDuration. */
export async function closePlay(playId: string): Promise<void> {
  const plays = await getPlaysCollection();
  const endedAt = new Date();
  await plays.updateOne(
    { _id: new ObjectId(playId) },
    [
      {
        $set: {
          endedAt,
          playDuration: {
            $divide: [{ $subtract: [endedAt, '$detectedAt'] }, 1000],
          },
        },
      },
    ]
  );
}

/** Write a station health snapshot. */
export async function insertSnapshot(
  station: Station,
  isOnline: boolean,
  lastMetaSource: 'zetta' | 'icecast' | 'icy' | null,
  listeners: number | null
): Promise<void> {
  const snapshots = await getSnapshotsCollection();
  const doc: SnapshotDocument = {
    stationId: station.id,
    stationName: station.name,
    listeners,
    isOnline,
    lastMetaSource,
    snapshotAt: new Date(),
  };
  await snapshots.insertOne(doc);
}

// ── Reads ──────────────────────────────────────────────────────────────────

export interface TrendingEntry {
  title: string;
  artist: string | null;
  playCount: number;
  stations: string[];
  lastSeen: Date;
}

/** Top N songs by play count in the last `hours` hours. */
export async function getTrending(hours: number = 24, limit: number = 10): Promise<TrendingEntry[]> {
  const plays = await getPlaysCollection();
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  return plays.aggregate<TrendingEntry>([
    { $match: { detectedAt: { $gte: since }, title: { $exists: true } } },
    {
      $group: {
        _id: '$title',
        artist:    { $first: '$artist' },
        playCount: { $sum: 1 },
        stations:  { $addToSet: '$stationName' },
        lastSeen:  { $max: '$detectedAt' },
      },
    },
    { $sort: { playCount: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        title:     '$_id',
        artist:    1,
        playCount: 1,
        stations:  1,
        lastSeen:  1,
      },
    },
  ]).toArray();
}

export interface StationPlayEntry {
  _id: string;
  title: string;
  artist: string | null;
  detectedAt: Date;
  endedAt: Date | null;
  playDuration: number | null;
  source: string | null;
}

/** Most recent plays for a station, newest first. */
export async function getStationHistory(stationId: number, limit: number = 50): Promise<StationPlayEntry[]> {
  const plays = await getPlaysCollection();
  return plays
    .find({ stationId })
    .sort({ detectedAt: -1 })
    .limit(limit)
    .project<StationPlayEntry>({
      _id: { $toString: '$_id' },
      title: 1,
      artist: 1,
      detectedAt: 1,
      endedAt: 1,
      playDuration: 1,
      source: 1,
    })
    .toArray();
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/analytics.ts
git commit -m "feat: add analytics library (insertPlay, closePlay, insertSnapshot, getTrending, getStationHistory)"
```

---

## Task 3: Play Event API Route (POST + PATCH)

**Files:**
- Create: `app/api/analytics/play-event/route.ts`

- [ ] **Step 1: Create `app/api/analytics/play-event/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { insertPlay, closePlay } from '@/lib/analytics';
import { ensureIndexes } from '@/lib/mongodb';
import type { Station } from '@/types/Station';
import type { TrackInfo } from '@/lib/analytics';

let indexesEnsured = false;

async function ensureOnce() {
  if (!indexesEnsured) {
    await ensureIndexes();
    indexesEnsured = true;
  }
}

/** POST /api/analytics/play-event
 *  Body: { station: Station, track: TrackInfo }
 *  Returns: { playId: string }
 */
export async function POST(req: NextRequest) {
  try {
    await ensureOnce();
    const body = await req.json() as { station: Station; track: TrackInfo };
    const { station, track } = body;

    if (!station?.id || !track?.title) {
      return NextResponse.json({ error: 'Missing station.id or track.title' }, { status: 400 });
    }

    const playId = await insertPlay(station, track);
    return NextResponse.json({ playId });
  } catch (err) {
    console.error('[play-event POST]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/** PATCH /api/analytics/play-event
 *  Body: { playId: string }
 *  Closes the play (sets endedAt, computes playDuration).
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json() as { playId: string };
    const { playId } = body;

    if (!playId) {
      return NextResponse.json({ error: 'Missing playId' }, { status: 400 });
    }

    await closePlay(playId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[play-event PATCH]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Manually test the POST endpoint**

Start the dev server: `yarn dev`

In another terminal:
```bash
curl -X POST http://localhost:3000/api/analytics/play-event \
  -H "Content-Type: application/json" \
  -d '{
    "station": { "id": 1, "name": "Capital FM", "genre": "Pop", "region": "Nairobi", "frequency": "98.4 FM", "url": "https://...", "is_live": true },
    "track": { "title": "Blinding Lights", "artist": "The Weeknd", "song": "Blinding Lights", "duration": "3:20", "durationSeconds": 200, "category": null, "source": "icy", "bitrate": 128, "listeners": null }
  }'
```

Expected response: `{ "playId": "<24-char-hex-string>" }`

- [ ] **Step 3: Manually test the PATCH endpoint using the returned playId**

```bash
curl -X PATCH http://localhost:3000/api/analytics/play-event \
  -H "Content-Type: application/json" \
  -d '{ "playId": "<playId from above>" }'
```

Expected response: `{ "ok": true }`

Verify in MongoDB that the document now has `endedAt` and `playDuration` set.

- [ ] **Step 4: Commit**

```bash
git add app/api/analytics/play-event/route.ts
git commit -m "feat: add POST/PATCH /api/analytics/play-event route"
```

---

## Task 4: Trending API Route

**Files:**
- Create: `app/api/analytics/trending/route.ts`

- [ ] **Step 1: Create `app/api/analytics/trending/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getTrending } from '@/lib/analytics';

/**
 * GET /api/analytics/trending?hours=24&limit=10
 * Returns top songs by play count across all stations in the last N hours.
 */
export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const hours  = Math.min(parseInt(params.get('hours')  ?? '24'), 168); // cap at 7 days
    const limit  = Math.min(parseInt(params.get('limit')  ?? '10'), 50);

    const trending = await getTrending(hours, limit);

    return NextResponse.json({ hours, limit, results: trending }, {
      headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' },
    });
  } catch (err) {
    console.error('[trending GET]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Test the trending endpoint**

First insert a few play events via curl (see Task 3 Step 2), then:

```bash
curl "http://localhost:3000/api/analytics/trending?hours=24&limit=5"
```

Expected: `{ "hours": 24, "limit": 5, "results": [ { "title": "Blinding Lights", "artist": "The Weeknd", "playCount": 1, "stations": ["Capital FM"], "lastSeen": "..." } ] }`

- [ ] **Step 3: Commit**

```bash
git add app/api/analytics/trending/route.ts
git commit -m "feat: add GET /api/analytics/trending route"
```

---

## Task 5: Station History API Route

**Files:**
- Create: `app/api/analytics/station/[id]/route.ts`

- [ ] **Step 1: Create directory and file**

```bash
mkdir -p app/api/analytics/station/\[id\]
```

- [ ] **Step 2: Create `app/api/analytics/station/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getStationHistory } from '@/lib/analytics';

/**
 * GET /api/analytics/station/[id]?limit=50
 * Returns the most recent plays for a station, newest first.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const stationId = parseInt(params.id);
    if (isNaN(stationId)) {
      return NextResponse.json({ error: 'Invalid station id' }, { status: 400 });
    }

    const limit = Math.min(
      parseInt(req.nextUrl.searchParams.get('limit') ?? '50'),
      200
    );

    const history = await getStationHistory(stationId, limit);

    return NextResponse.json({ stationId, history }, {
      headers: { 'Cache-Control': 's-maxage=15, stale-while-revalidate=30' },
    });
  } catch (err) {
    console.error('[station history GET]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Test the station history endpoint**

```bash
curl "http://localhost:3000/api/analytics/station/1?limit=10"
```

Expected: `{ "stationId": 1, "history": [ { "_id": "...", "title": "Blinding Lights", "artist": "The Weeknd", "detectedAt": "...", "endedAt": "...", "playDuration": 45.2, "source": "icy" } ] }`

- [ ] **Step 4: Commit**

```bash
git add "app/api/analytics/station/[id]/route.ts"
git commit -m "feat: add GET /api/analytics/station/[id] route"
```

---

## Task 6: Wire `useStreamMetadata` to Fire Play Events

**Files:**
- Modify: `hooks/useStreamMetadata.ts`

The hook currently polls every 15s and sets state. We extend it to:
1. Track the previous title in a ref
2. When `title` changes to a non-null value → POST a new play event (save returned `playId`)
3. When a new title arrives → PATCH to close the previous play before opening the new one
4. When `streamUrl` is cleared (station stopped) → PATCH to close the last open play

- [ ] **Step 1: Replace `hooks/useStreamMetadata.ts` with the extended version**

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
  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevTitleRef   = useRef<string | null>(null);
  const openPlayIdRef  = useRef<string | null>(null);

  const closeOpenPlay = useCallback(async () => {
    if (openPlayIdRef.current) {
      await patchClosePlay(openPlayIdRef.current);
      openPlayIdRef.current = null;
    }
  }, []);

  const fetchMetadata = useCallback(async (url: string) => {
    try {
      const res  = await fetch(`/api/stream-metadata?url=${encodeURIComponent(url)}`);
      const data: StreamMetadata = await res.json();

      setMeta({ ...EMPTY_META, ...data, loading: false });

      // Detect title change — only record if we have a real title and station
      if (data.title && data.title !== prevTitleRef.current && station) {
        // Close previous play before opening a new one
        await closeOpenPlay();
        prevTitleRef.current = data.title;
        const playId = await postPlayEvent(station, { ...EMPTY_META, ...data, loading: false });
        openPlayIdRef.current = playId;
      }
    } catch {
      setMeta(prev => ({ ...prev, loading: false }));
    }
  }, [station, closeOpenPlay]);

  useEffect(() => {
    if (!streamUrl) {
      setMeta(EMPTY_META);
      prevTitleRef.current = null;
      closeOpenPlay(); // close any open play when station stops
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    setMeta(prev => ({ ...prev, loading: true }));
    fetchMetadata(streamUrl);

    timerRef.current = setInterval(() => fetchMetadata(streamUrl), pollInterval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [streamUrl, pollInterval, fetchMetadata, closeOpenPlay]);

  // Close open play on unmount
  useEffect(() => {
    return () => { closeOpenPlay(); };
  }, [closeOpenPlay]);

  return meta;
}
```

- [ ] **Step 2: Update `MordernAirwave.tsx` — pass `currentStation` to `useStreamMetadata`**

In `components/MordernAirwave.tsx`, find:

```typescript
const { title: nowPlaying } = useStreamMetadata(
    isPlaying && currentStation ? currentStation.url : null
);
```

Replace with:

```typescript
const { title: nowPlaying } = useStreamMetadata(
    isPlaying && currentStation ? currentStation.url : null,
    currentStation
);
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Smoke test in browser**

1. Start `yarn dev`
2. Play Capital FM
3. Wait for a song to be detected (check network tab for `POST /api/analytics/play-event`)
4. Switch to a different station — verify `PATCH /api/analytics/play-event` fires first
5. Query `GET /api/analytics/station/1` — verify the play record exists with `endedAt` set

- [ ] **Step 5: Commit**

```bash
git add hooks/useStreamMetadata.ts components/MordernAirwave.tsx
git commit -m "feat: detect title changes in useStreamMetadata and persist play events to MongoDB"
```

---

## Task 7: Station Snapshot Endpoint (Health Monitoring)

**Files:**
- Create: `app/api/analytics/snapshot/route.ts`

This route is called server-side on a schedule (or on each metadata poll). For now, trigger it from the existing `GET /api/stream-metadata` route as a side-effect: after fetching metadata, fire-and-forget a snapshot write.

- [ ] **Step 1: Create `app/api/analytics/snapshot/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { insertSnapshot } from '@/lib/analytics';
import type { Station } from '@/types/Station';

/**
 * POST /api/analytics/snapshot
 * Body: { station: Station, isOnline: boolean, lastMetaSource: string | null, listeners: number | null }
 * Fire-and-forget health snapshot. Called from the metadata hook after each poll.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      station: Station;
      isOnline: boolean;
      lastMetaSource: 'zetta' | 'icecast' | 'icy' | null;
      listeners: number | null;
    };
    const { station, isOnline, lastMetaSource, listeners } = body;

    if (!station?.id) {
      return NextResponse.json({ error: 'Missing station.id' }, { status: 400 });
    }

    await insertSnapshot(station, isOnline, lastMetaSource, listeners);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[snapshot POST]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Fire snapshot from `useStreamMetadata` after each poll**

In `hooks/useStreamMetadata.ts`, inside `fetchMetadata`, after `setMeta(...)` add a fire-and-forget snapshot POST:

```typescript
// Fire-and-forget health snapshot
if (station) {
  fetch('/api/analytics/snapshot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      station,
      isOnline: true,
      lastMetaSource: data.source ?? null,
      listeners: data.listeners ?? null,
    }),
  }).catch(() => {});
}
```

Add the corresponding `catch` block for failed fetches (stream offline):

```typescript
// In the catch block of fetchMetadata:
if (station) {
  fetch('/api/analytics/snapshot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ station, isOnline: false, lastMetaSource: null, listeners: null }),
  }).catch(() => {});
}
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/analytics/snapshot/route.ts hooks/useStreamMetadata.ts
git commit -m "feat: add station health snapshot collection via POST /api/analytics/snapshot"
```

---

## Self-Review

### Spec Coverage

| Requirement | Task |
|---|---|
| Song play history per station | Task 3, 5, 6 |
| Listener analytics | Task 2 (`listeners` field in PlayDocument), Task 7 (snapshots) |
| Genre/time-of-day heatmap data | Task 1 (`stationGenre`, `detectedAt` indexed), Task 2 (`getTrending`) |
| "Now trending" across all stations | Task 4 (`/api/analytics/trending`) |
| Station uptime / metadata health | Task 7 (`stationSnapshots` collection) |
| `endedAt` / `playDuration` computation | Task 2 (`closePlay`), Task 3 (PATCH), Task 6 (hook fires PATCH on title change) |
| TTL index (90 days) | Task 1 (`ensureIndexes`) |
| Singleton MongoDB connection | Task 1 (`lib/mongodb.ts`) |

### Placeholder Scan

No TBDs, no "handle edge cases", no "implement later". All code is complete in every step.

### Type Consistency

- `TrackInfo` defined in `lib/analytics.ts`, used in `app/api/analytics/play-event/route.ts` and `hooks/useStreamMetadata.ts` — consistent.
- `PlayDocument` / `SnapshotDocument` defined in `lib/mongodb.ts`, used in `lib/analytics.ts` — consistent.
- `closePlay(playId: string)` used in both `lib/analytics.ts` and `hooks/useStreamMetadata.ts` — consistent.
- `useStreamMetadata(url, station, pollInterval)` — new signature; `MordernAirwave.tsx` updated in Task 6 Step 2.
