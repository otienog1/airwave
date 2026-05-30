# Trending Stations Implementation Design

## Goal

Add a "Trending Now" horizontal strip above the main station grid that shows the top 5 stations ranked by a composite score of live listeners, growth, and plays today — giving users an immediate signal of what's hot right now.

## Architecture

A new public `GET /api/trending` backend endpoint aggregates three signals from existing collections into a single ranked response. A new `TrendingStrip` frontend component fetches that endpoint on mount and polls every 30 seconds, rendering a horizontally scrollable row of station cards above the search filters. No new collections, no schema changes, no new indexes.

## Tech Stack

- **Backend:** Flask, PyMongo, existing `plays` and `stationPlays` collections
- **Frontend:** React (`'use client'`), existing `Station` type, existing `SkeletonCard`, CSS custom properties design system

---

## Backend

### Endpoint: `GET /api/trending`

- No authentication required — trending data is public
- Rate limited: 60 requests per minute (via existing `limiter`)
- Registered in `analytics_bp.py` alongside existing analytics routes

### Data Sources

| Signal | Collection | Field | Window |
|--------|-----------|-------|--------|
| Live listeners | `plays` | `listeners` (max per station) | Last 30 minutes |
| Plays today | `stationPlays` | count of documents | Since midnight UTC |
| Plays yesterday | `stationPlays` | count of documents | Previous calendar day UTC |

### Aggregation Logic

**Step 1 — Live listeners per station:**
```python
pipeline = [
    {"$match": {"detectedAt": {"$gte": thirty_min_ago}}},
    {"$group": {"_id": "$stationId", "live_listeners": {"$max": "$listeners"}}},
]
```

**Step 2 — Plays today per station:**
```python
pipeline = [
    {"$match": {"played_at": {"$gte": today_start, "$lt": now}}},
    {"$group": {"_id": "$station_id", "plays_today": {"$sum": 1}}},
]
```

**Step 3 — Plays yesterday per station:**
```python
pipeline = [
    {"$match": {"played_at": {"$gte": yesterday_start, "$lt": today_start}}},
    {"$group": {"_id": "$station_id", "plays_yesterday": {"$sum": 1}}},
]
```

**Step 4 — Composite score:**

Merge results by station ID. For each station:
- `listener_norm = live_listeners / max_live_listeners` (0 if max is 0)
- `growth_norm = min(growth_pct / 100, 1.0)` where `growth_pct = (today - yesterday) / yesterday * 100`. If `plays_yesterday == 0`, `growth_norm = 0` and `growth_pct` is omitted from response.
- `plays_norm = plays_today / max_plays_today` (0 if max is 0)
- `score = 0.5 * listener_norm + 0.3 * growth_norm + 0.2 * plays_norm`

Sort descending by score, take top 5. Join with `stations` collection for name and genre.

### Response Shape

```json
{
  "stations": [
    {
      "id": 3,
      "name": "Capital FM",
      "genre": "Pop",
      "live_listeners": 1240,
      "plays_today": 2100,
      "growth_pct": 38.2
    }
  ],
  "updated_at": "2026-05-30T14:23:00Z"
}
```

`growth_pct` is omitted for stations where `plays_yesterday == 0` to avoid misleading infinity values.

If no stations have data in the relevant windows, `stations` is an empty array with HTTP 200.

---

## Frontend

### New file: `components/station/TrendingStrip.tsx`

**Props:**
```typescript
interface TrendingStripProps {
  stations: Station[];           // already-fetched full station list from MordernAirwave
  currentStation: Station | null;
  onPlay: (station: Station) => void;
}
```

**Behaviour:**
- Fetches `fetchTrendingNow()` on mount
- Polls every 30 seconds via `setInterval`, cleared on unmount
- Matches trending station IDs against the `stations` prop to retrieve full `Station` objects (including stream URL) for playback — no second station fetch needed
- Renders `null` on error or empty response — strip disappears cleanly, no broken UI
- Clicking a card calls `onPlay(station)` immediately

**Loading state:** 3 inline skeleton pill-cards (width ~160px, height ~80px) using the existing skeleton animation pattern.

**Card contents (per station):**
- Station name (bold, truncated with ellipsis)
- `● 1,240` — green, live listener count
- `↑ +38%` — amber, growth percentage (hidden if `growth_pct` absent)
- `2.1k plays` — muted, today's play count formatted with `toLocaleString()`

**Active state:** If `currentStation?.id === station.id`, the card gets an indigo border (`rgba(99,102,241,0.5)`) matching the grid's active card treatment.

**Container:** Horizontal flex with `overflow-x: auto`, `scroll-snap-type: x mandatory` on mobile, `-webkit-overflow-scrolling: touch`. Cards have `scroll-snap-align: start`.

### New API types and fetcher: `lib/analyticsApi.ts`

```typescript
export interface TrendingNowStation {
  id: number;
  name: string;
  genre: string | null;
  live_listeners: number;
  plays_today: number;
  growth_pct?: number;  // absent when plays_yesterday === 0
}

export interface TrendingNowResponse {
  stations: TrendingNowStation[];
  updated_at: string;
}

export function fetchTrendingNow(): Promise<TrendingNowResponse> {
  return get('/analytics/trending');
}
```

Named `fetchTrendingNow` to distinguish from the existing `fetchTrending(hours, limit)` which returns top songs.

---

## Integration

### `components/MordernAirwave.tsx`

Add `<TrendingStrip>` between the page header area and `<SearchAndFilters>`:

```tsx
<TrendingStrip
  stations={stations}
  currentStation={currentStation}
  onPlay={playStation}
/>
<SearchAndFilters ... />
```

No new state — reuses `stations` (from `useStations`), `currentStation` and `playStation` (from `usePlayer`) already present in the component.

---

## Error Handling

| Scenario | Behaviour |
|----------|-----------|
| Backend aggregation returns 0 results | Returns `{ stations: [] }` with HTTP 200 |
| All stations offline (no recent `plays` docs) | `live_listeners` shows 0 for affected stations; they may still rank by plays/growth |
| Frontend fetch error | Caught silently; strip renders `null`; polling continues and recovers automatically |
| `plays_yesterday == 0` for a station | `growth_pct` omitted; amber arrow hidden in UI |
| Station in trending response not found in `stations` prop | That station skipped — can't play without a stream URL |

---

## Files Changed

| File | Change |
|------|--------|
| `backend/app/analytics_bp.py` | Add `GET /trending` route |
| `lib/analyticsApi.ts` | Add `TrendingNowStation`, `TrendingNowResponse`, `fetchTrendingNow()` |
| `components/station/TrendingStrip.tsx` | Create new component |
| `components/MordernAirwave.tsx` | Mount `<TrendingStrip>` above `<SearchAndFilters>` |

No changes to `db.py`, no new indexes, no new collections.
