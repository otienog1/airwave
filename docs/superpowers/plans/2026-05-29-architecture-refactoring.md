# Architecture Refactoring — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 3 concrete architectural problems — broken prototype component, duplicate Station type, hardcoded station data bypassing the backend API.

**Architecture:** Single source of truth for Station type in `types/Station.ts`. `MordernAirwave` fetches real stations via `useStations` hook. Hardcoded mock data and broken prototype deleted.

**Tech Stack:** Next.js 14, TypeScript, existing `useStations` hook, Flask backend API.

---

## Task 1: Delete broken prototype and clean up legacy type fields

**Files:**
- Delete: `components/Airwave.tsx`
- Modify: `types/Station.ts`

- [ ] **Step 1: Delete `components/Airwave.tsx`**

```bash
git rm components/Airwave.tsx
```

- [ ] **Step 2: Verify it is not imported anywhere**

```bash
npx tsc --noEmit 2>&1 | grep -i airwave
```

Expected: no errors referencing `Airwave.tsx`. The existing TS errors for `AudioPlayer` module and `WritingMode` should now be gone.

- [ ] **Step 3: Remove legacy camelCase fields from `types/Station.ts`**

Current file has these legacy fields at the bottom — remove them:
```ts
// Remove these three lines:
listeners?: number;
isLive?: boolean;
logo?: string;
```

The cleaned-up `types/Station.ts` should be:
```ts
export interface Station {
  id: number;
  name: string;
  description?: string;
  url: string;
  logo_url?: string;
  website?: string;
  genre: string;
  region: string;
  language?: string;
  frequency?: string;
  is_active?: boolean;
  is_live?: boolean;
  current_listeners?: number;
  total_plays?: number;
  rating?: number;
  favorites_count?: number;
  created_at?: string;
  updated_at?: string;
}
```

- [ ] **Step 4: TypeScript check**

Run: `npx tsc --noEmit 2>&1`

Expected: if any file references the removed fields, fix those references now (use `is_live`, `logo_url`, `current_listeners` instead).

- [ ] **Step 5: Commit**

```bash
git add types/Station.ts
git commit -m "refactor: delete broken Airwave prototype, remove legacy Station type fields"
```

---

## Task 2: Consolidate duplicate Station type

**Files:**
- Modify: `lib/api.ts`

The `lib/api.ts` file defines its own `Station` interface that duplicates `types/Station.ts`. Replace it with a re-export.

- [ ] **Step 1: Read the current `Station` interface in `lib/api.ts`**

It starts at line 3 and ends around line 22. Remove the entire block:

```ts
// Remove this entire block from lib/api.ts:
export interface Station {
  id: number;
  name: string;
  description: string;
  url: string;
  logo_url?: string;
  website?: string;
  genre: string;
  region: string;
  language: string;
  frequency?: string;
  is_active: boolean;
  is_live: boolean;
  current_listeners?: number;
  total_plays?: number;
  rating?: number;
  favorites_count?: number;
  created_at: string;
  updated_at: string;
}
```

Replace with a single re-export at the top of the file:

```ts
export type { Station } from '@/types/Station';
```

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit 2>&1`

Expected: no new errors. The `Station` type is still exported from `lib/api.ts` so all callers continue to work.

- [ ] **Step 3: Commit**

```bash
git add lib/api.ts
git commit -m "refactor: consolidate Station type — single source in types/Station.ts"
```

---

## Task 3: Wire `MordernAirwave` to `useStations` — replace hardcoded data

**Files:**
- Modify: `components/MordernAirwave.tsx`
- Delete: `lib/stations.ts`

- [ ] **Step 1: Update `MordernAirwave.tsx`**

Replace:
```ts
import { stations as mockStations } from '@/lib/stations';
```

With:
```ts
import { useStations } from '@/hooks/useStations';
```

Inside the component body, add the `useStations` call after the existing `useAuth()` call:

```tsx
const { stations, loading: stationsLoading, error: stationsError } = useStations({ autoFetch: true });
```

Update the `useStationFilter` call to use live data:
```tsx
// Replace:
const { filteredStations, ... } = useStationFilter(mockStations);

// With:
const { filteredStations, ... } = useStationFilter(stations);
```

Update `StationGrid` props — replace hardcoded `loading={false} error={null}` with real values:
```tsx
<StationGrid
  stations={filteredStations}
  loading={stationsLoading}
  error={stationsError}
  currentStation={currentStation}
  isPlaying={isPlaying}
  isAudioLoading={isLoading}
  favorites={favorites}
  onPlay={playStation}
  onFavorite={toggleFavorite}
  onRetry={() => {}}
  nowPlaying={nowPlaying}
/>
```

- [ ] **Step 2: Delete `lib/stations.ts`**

```bash
git rm lib/stations.ts
```

- [ ] **Step 3: TypeScript check**

Run: `npx tsc --noEmit 2>&1`

Expected: no errors.

- [ ] **Step 4: Verify the app loads with backend running**

Start the backend: `cd backend && flask run`
Start the frontend: `yarn dev`

Open `http://localhost:3000`. The station grid should show the loading skeleton briefly, then render stations from the Flask API. If the backend is not running, the grid should show an error state (not a blank screen).

- [ ] **Step 5: Commit**

```bash
git add components/MordernAirwave.tsx
git commit -m "feat: wire MordernAirwave to useStations — replace hardcoded mock data with live API"
```
