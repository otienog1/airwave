# Analytics Audience Tab — Design Spec

**Date:** 2026-05-30
**Status:** Approved

---

## Problem

The analytics dashboard is built on the `stationPlays` collection (user app click events), which was empty until recently. The `plays` collection — written by the song-detection pipeline — has 90 days of broadcast stream data: listener counts, song detections, genres, regions, and timing. These two collections represent different but complementary stories and both should be visible in the dashboard.

## Data Sources

Two MongoDB collections serve different purposes:

| | `plays` | `stationPlays` |
|---|---|---|
| Written by | Next.js song-detection (`lib/analytics.ts`) | Flask on user click |
| Represents | Stream broadcast events | App engagement events |
| Key fields | `stationId`, `stationName`, `listeners`, `title`, `artist`, `detectedAt`, `playDuration` | `station_id`, `user_id`, `played_at`, `duration` |
| Data age | 90-day TTL, historical data available | New, sparse |

## Approach

Add a dedicated **Audience** tab to the analytics dashboard powered exclusively by the `plays` collection. The existing tabs (Overview, Stations, Songs, Genres, Health) continue to use `stationPlays` and are not modified.

The Audience tab is the second tab in the nav bar: Overview → **Audience** → Stations → Songs & Artists → Genres & Regions → Station Health.

The tab respects the existing period filter (1d / 7d / 30d / 90d) already URL-synced via `?period=N`.

## Audience Tab Content

### KPI Row (4 cards)

1. **Peak Listeners** — `max(plays.listeners)` across all detections in the period. Answers: "What's the ceiling we've seen?"
2. **Avg Listeners per Song** — `avg(plays.listeners)` across all detections. Answers: "What's the typical reach per detection?"
3. **Song Detections** — `count(plays)` in the period. Answers: "How active was the broadcast pipeline?"
4. **App Engagement Rate** — `(stationPlays count ÷ plays.listeners sum) × 100`. The only card that crosses both collections. Answers: "What fraction of stream listeners also use the Airwave app?"

### Listener Trend Chart

Area chart: listeners summed per time bucket (hours for 1d, days for 7d/30d/90d). Each bucket sums `plays.listeners` across all detections in that window. Shows whether broadcast reach is growing, steady, or declining.

### Top Stations by Reach

Horizontal bar chart: stations ranked by average `plays.listeners` when on air. Answers: "Which stations pull the largest broadcast audiences?"

### Top Songs by Stream Listeners

Sortable table (default sort: avg listeners descending):

| # | Song | Artist | Avg Listeners | Detections | Best Station |
|---|---|---|---|---|---|

Columns are sortable. "Best Station" is the station where this song had the highest listener count in any single detection.

## Backend Changes

### `backend/app/db.py`

Add `get_plays_col()` helper returning the `plays` MongoDB collection, following the same pattern as `get_station_plays_col()`.

### New Flask route: `GET /api/analytics/audience`

Query parameter: `days` (int, default 7).

Runs four aggregations against the `plays` collection:

1. **KPI aggregation** — single `$group` over the date range:
   - `peak_listeners`: `$max(listeners)`
   - `avg_listeners`: `$avg(listeners)`
   - `total_detections`: `$sum(1)`
   - `total_listener_sum`: `$sum(listeners)` (denominator for engagement rate)

2. **App engagement** — count of `stationPlays` documents in the same date range divided by `total_listener_sum`.

3. **Time series** — `$group` by time bucket (hour bucket for 1d, day bucket otherwise), summing `listeners` per bucket. Returns `[{bucket: ISODate, listeners: int}]`.

4. **Top stations** — `$group` by `stationId`, compute `avg_listeners: $avg(listeners)`, sort descending, limit 10.

5. **Top songs** — `$group` by `{title, artist}`, compute `avg_listeners: $avg(listeners)` and `count: $sum(1)` and `best_station` (station with max listeners via `$push` + client-side pick), sort descending, limit 20.

Response shape:
```json
{
  "peak_listeners": 2847,
  "avg_listeners": 1103.4,
  "total_detections": 4218,
  "app_engagement_rate": 6.2,
  "time_series": [{"bucket": "2026-05-23T00:00:00Z", "listeners": 12400}],
  "top_stations": [{"station_id": "...", "station_name": "Capital FM", "avg_listeners": 1847}],
  "top_songs": [{"title": "Wamlambez", "artist": "Sailors Gang", "avg_listeners": 2104, "count": 38, "best_station": "Capital FM"}]
}
```

## Frontend Changes

### `lib/analyticsApi.ts`

Add interface `AudienceResponse` matching the response shape above. Add `fetchAudience(days: number): Promise<AudienceResponse>` using `apiFetch('/api/analytics/audience', { days })`.

### `components/analytics/tabs/AudienceTab.tsx`

New component. Props: `{ period: number }`. Fetches via `fetchAudience(period)` on mount and on period change. Renders:
- 4 `KpiCard` components
- `LineChart` (area variant) for time series
- `HBarChart` for top stations
- Sortable table (local sort state) for top songs

Uses the same `KpiCard`, `HBarChart`, and `LineChart` components already built for other tabs. No new chart primitives needed.

### `app/admin/analytics/page.tsx`

- Add `'audience'` to the `Tab` union type
- Add `{ id: 'audience', label: 'Audience' }` as the second entry in `TABS` array
- Add `{tab === 'audience' && <AudienceTab period={period} />}` to the tab content block
- Import `AudienceTab`

## What Stays the Same

- All existing tabs (Overview, Stations, Songs, Genres, Health) are untouched
- The period filter, tab navigation, and URL-sync logic are unchanged
- The `LiveStatusBar` is unchanged
- No changes to `stationPlays`-based endpoints

## Out of Scope

- Per-station audience detail drill-down (can be added to StationsTab later)
- Genre-level stream audience breakdown (GenresTab already handles genre from stationPlays)
- Real-time listener chart (LiveStatusBar already shows live count)
