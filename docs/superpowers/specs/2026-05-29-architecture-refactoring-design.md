# Architecture Refactoring — Design Spec
**Date:** 2026-05-29

## Overview

Three concrete architectural problems are blocking the app from working correctly end-to-end:

1. **Broken prototype component** — `components/Airwave.tsx` imports a non-existent `./AudioPlayer` path, causing a TypeScript error on every build. It is an abandoned prototype never used in production routing.
2. **Duplicate Station type** — `types/Station.ts` and `lib/api.ts` both define `Station`. The types have diverged (legacy camelCase fields `isLive`, `listeners`, `logo` in `types/Station.ts` vs snake_case in `lib/api.ts`). Consumers import from both, causing silent type unsafety.
3. **Hardcoded station data** — `MordernAirwave.tsx` imports from `lib/stations.ts` (18 hardcoded stations) and passes `loading={false}` to `StationGrid`. The `useStations` hook that fetches from the Flask backend exists but is completely bypassed. The UI never shows real backend data.

---

## Changes

### 1. Delete `components/Airwave.tsx`

Unconditional deletion. The file is not imported anywhere in the routed app. The TS error it causes (`Cannot find module './AudioPlayer'`) appears on every `tsc --noEmit` run.

### 2. Consolidate the `Station` type

**Single source of truth:** `types/Station.ts`

Keep `types/Station.ts` as the canonical definition. Remove the duplicate `Station` interface from `lib/api.ts` and replace it with a re-export:

```ts
// lib/api.ts — remove the Station interface block, add:
export type { Station } from '@/types/Station';
```

Remove legacy fields (`listeners`, `isLive`, `logo`) from `types/Station.ts` — they are unused in the current codebase. Any references to them will surface as TS errors and can be fixed in the same pass.

### 3. Wire `MordernAirwave` to `useStations`

Replace the hardcoded import:

```ts
// Remove:
import { stations as mockStations } from '@/lib/stations';

// Add:
import { useStations } from '@/hooks/useStations';
```

Inside the component, replace the static mock data source:

```tsx
// Remove:
const { filteredStations, ... } = useStationFilter(mockStations);

// Add:
const { stations, loading: stationsLoading, error: stationsError } = useStations({ autoFetch: true });
const { filteredStations, ... } = useStationFilter(stations);
```

Pass real loading/error state to `StationGrid`:

```tsx
<StationGrid
  stations={filteredStations}
  loading={stationsLoading}
  error={stationsError}
  ...
/>
```

The `lib/stations.ts` file is deleted after the migration since it is no longer imported anywhere.

---

## Files

| Action | File |
|--------|------|
| Delete | `components/Airwave.tsx` |
| Delete | `lib/stations.ts` |
| Modify | `types/Station.ts` — remove legacy fields |
| Modify | `lib/api.ts` — remove duplicate `Station` interface, re-export from types |
| Modify | `components/MordernAirwave.tsx` — use `useStations`, pass real loading/error |

---

## Edge Cases

- **Backend offline in dev:** `useStations` returns `error` state. `StationGrid` already accepts `error: string | null` and renders an error message. No new UI needed.
- **Empty stations list on first load:** `StationGrid` already handles `loading={true}` with a skeleton. No new UI needed.
- **`lib/stations.ts` hardcoded IDs match backend IDs:** The hardcoded stations use IDs 1–18. If the backend has different IDs the favorites stored by ID in localStorage will silently show no hearts — acceptable behaviour for migration.
