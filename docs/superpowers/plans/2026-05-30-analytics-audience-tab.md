# Analytics Audience Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new "Audience" tab to `/admin/analytics` that surfaces broadcast stream metrics from the `plays` collection alongside an app engagement rate cross-referencing `stationPlays`.

**Architecture:** Add `get_plays_col()` to `db.py`, add a new Flask route `/api/analytics/audience` that aggregates against `plays`, add the `AudienceResponse` type + `fetchAudience()` fetcher to `lib/analyticsApi.ts`, create `AudienceTab.tsx`, and wire it into the analytics page as the second tab.

**Tech Stack:** Python/Flask, PyMongo aggregation pipeline, Next.js App Router, TypeScript, Recharts v2 (via existing `LineChart` and `HBarChart` components).

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Modify | `backend/app/db.py` | Add `get_plays_col()` helper |
| Modify | `backend/app/analytics_bp.py` | Add `GET /audience` route |
| Modify | `lib/analyticsApi.ts` | Add `AudienceResponse` interfaces + `fetchAudience()` |
| Create | `components/analytics/tabs/AudienceTab.tsx` | New tab component |
| Modify | `app/admin/analytics/page.tsx` | Wire tab into nav + content |

---

## Task 1: Expose `plays` collection from `db.py`

**Files:**
- Modify: `backend/app/db.py`

The `plays` collection is written by Next.js song-detection (`lib/analytics.ts`). Flask currently only knows about `stationPlays`. This task makes it accessible to Flask analytics routes.

- [ ] **Step 1: Add `get_plays_col()` to `backend/app/db.py`**

Open `backend/app/db.py`. After the `get_station_plays_col` function (line 28), add:

```python
def get_plays_col() -> Collection:
    return get_db()['plays']
```

- [ ] **Step 2: Verify the import is available**

```bash
cd backend
python -c "from app.db import get_plays_col; col = get_plays_col(); print('plays collection:', col.name)"
```

Expected output:
```
plays collection: plays
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/db.py
git commit -m "feat: expose plays collection from db.py"
```

---

## Task 2: Add Flask `/audience` analytics route

**Files:**
- Modify: `backend/app/analytics_bp.py`

This route queries the `plays` collection for KPIs, time-series data, top stations by broadcast reach, and top songs by avg stream listeners. It also cross-references `stationPlays` for the app engagement rate.

The `plays` documents use camelCase field names (written by Next.js): `stationId`, `stationName`, `title`, `artist`, `listeners`, `detectedAt`.

- [ ] **Step 1: Update the import line at the top of `analytics_bp.py`**

Find the line (line 4):
```python
from app.db import get_stations_col, get_station_plays_col, get_users_col
```

Replace it with:
```python
from app.db import get_stations_col, get_station_plays_col, get_users_col, get_plays_col
```

- [ ] **Step 2: Add the `/audience` route at the end of `analytics_bp.py` (before `register_analytics_commands`)**

Insert before `def register_analytics_commands(app):`:

```python
@analytics_bp.route('/audience', methods=['GET'])
@admin_required
@limiter.limit("30 per minute")
def get_audience_stats():
    try:
        days = request.args.get('days', 7, type=int)
        start, end = _date_range(days)
        plays_col = get_plays_col()
        plays_match = {'detectedAt': {'$gte': start, '$lte': end}}

        # KPI aggregation
        kpi_agg = list(plays_col.aggregate([
            {'$match': plays_match},
            {'$group': {
                '_id': None,
                'peak_listeners': {'$max': '$listeners'},
                'avg_listeners': {'$avg': '$listeners'},
                'total_detections': {'$sum': 1},
                'total_listener_sum': {'$sum': '$listeners'},
            }},
        ]))
        kpi = kpi_agg[0] if kpi_agg else {}
        peak_listeners = int(kpi.get('peak_listeners') or 0)
        avg_listeners = round(float(kpi.get('avg_listeners') or 0), 1)
        total_detections = int(kpi.get('total_detections') or 0)
        total_listener_sum = int(kpi.get('total_listener_sum') or 0)

        # App engagement rate: stationPlays clicks ÷ total stream listeners × 100
        station_plays_col = get_station_plays_col()
        app_plays_count = station_plays_col.count_documents({'played_at': {'$gte': start, '$lte': end}})
        app_engagement_rate = round(app_plays_count / total_listener_sum * 100, 2) if total_listener_sum > 0 else 0.0

        # Time series — hour buckets for 1d, day buckets otherwise
        if days <= 1:
            fmt = '%Y-%m-%dT%H:00:00Z'
        else:
            fmt = '%Y-%m-%d'
        ts_agg = list(plays_col.aggregate([
            {'$match': plays_match},
            {'$group': {
                '_id': {'$dateToString': {'format': fmt, 'date': '$detectedAt'}},
                'listeners': {'$sum': '$listeners'},
            }},
            {'$sort': {'_id': 1}},
        ]))
        time_series = [{'bucket': r['_id'], 'listeners': r['listeners']} for r in ts_agg]

        # Top stations by avg stream listeners
        top_stations_agg = list(plays_col.aggregate([
            {'$match': plays_match},
            {'$group': {
                '_id': '$stationId',
                'station_name': {'$first': '$stationName'},
                'avg_listeners': {'$avg': '$listeners'},
            }},
            {'$sort': {'avg_listeners': -1}},
            {'$limit': 10},
        ]))
        top_stations = [
            {
                'station_id': r['_id'],
                'station_name': r['station_name'],
                'avg_listeners': round(float(r['avg_listeners']), 1),
            }
            for r in top_stations_agg
        ]

        # Top songs by avg stream listeners
        top_songs_agg = list(plays_col.aggregate([
            {'$match': plays_match},
            {'$group': {
                '_id': {'title': '$title', 'artist': '$artist'},
                'avg_listeners': {'$avg': '$listeners'},
                'count': {'$sum': 1},
                'station_entries': {'$push': {'station': '$stationName', 'listeners': '$listeners'}},
            }},
            {'$sort': {'avg_listeners': -1}},
            {'$limit': 20},
        ]))
        top_songs = []
        for r in top_songs_agg:
            entries = r.get('station_entries', [])
            best = max(entries, key=lambda x: x.get('listeners', 0), default={})
            top_songs.append({
                'title': r['_id']['title'],
                'artist': r['_id'].get('artist'),
                'avg_listeners': round(float(r['avg_listeners']), 1),
                'count': r['count'],
                'best_station': best.get('station'),
            })

        return jsonify({
            'peak_listeners': peak_listeners,
            'avg_listeners': avg_listeners,
            'total_detections': total_detections,
            'app_engagement_rate': app_engagement_rate,
            'time_series': time_series,
            'top_stations': top_stations,
            'top_songs': top_songs,
            'period': {'start_date': start.date().isoformat(), 'end_date': end.date().isoformat(), 'days': days},
        })

    except Exception as e:
        logging.error(f"Error fetching audience stats: {e}")
        return jsonify({'error': 'Failed to fetch audience statistics'}), 500
```

- [ ] **Step 3: Verify the endpoint responds (Flask server must be running)**

```bash
curl -s "http://localhost:5000/api/analytics/audience?days=7" \
  -H "Cookie: $(cat /tmp/admin_cookie 2>/dev/null || echo '')" | python -m json.tool | head -20
```

If you don't have an admin cookie saved, log in first:
```bash
curl -s -c /tmp/admin_cookie -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"YOUR_ADMIN_PASSWORD"}'
```

Expected: JSON response with `peak_listeners`, `avg_listeners`, `total_detections`, `time_series`, `top_stations`, `top_songs` keys. Values may be 0 or empty arrays if `plays` collection is empty in dev.

- [ ] **Step 4: Commit**

```bash
git add backend/app/analytics_bp.py
git commit -m "feat: add /audience analytics route querying plays collection"
```

---

## Task 3: Add TypeScript types and fetcher for the audience endpoint

**Files:**
- Modify: `lib/analyticsApi.ts`

The `get<T>()` helper already handles auth cookies and error throwing. This task adds the `AudienceResponse` interface family and a `fetchAudience(days)` function following the exact pattern of existing fetchers like `fetchDashboard`.

- [ ] **Step 1: Add interfaces to `lib/analyticsApi.ts`**

Open `lib/analyticsApi.ts`. Find the line (line 145):
```typescript
export const PERIOD_HOURS: Record<number, number> = { 1: 24, 7: 168, 30: 720, 90: 2160 };
```

Insert before that line:

```typescript
export interface AudienceTimeBucket {
  bucket: string;
  listeners: number;
}

export interface AudienceStation {
  station_id: number;
  station_name: string;
  avg_listeners: number;
}

export interface AudienceSong {
  title: string;
  artist: string | null;
  avg_listeners: number;
  count: number;
  best_station: string | null;
}

export interface AudienceResponse {
  peak_listeners: number;
  avg_listeners: number;
  total_detections: number;
  app_engagement_rate: number;
  time_series: AudienceTimeBucket[];
  top_stations: AudienceStation[];
  top_songs: AudienceSong[];
  period: { start_date: string; end_date: string; days: number };
}
```

- [ ] **Step 2: Add `fetchAudience` function**

Find the line (now after the interfaces, before `PERIOD_HOURS`):
```typescript
export function fetchTrending(hours: number, limit: number): Promise<TrendingResponse> {
```

Insert after `fetchTrending` (before `PERIOD_HOURS`):
```typescript
export function fetchAudience(days: number): Promise<AudienceResponse> {
  return get(`/analytics/audience?days=${days}`);
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/analyticsApi.ts
git commit -m "feat: add AudienceResponse types and fetchAudience fetcher"
```

---

## Task 4: Create `AudienceTab` component

**Files:**
- Create: `components/analytics/tabs/AudienceTab.tsx`

This component follows the same structure as `OverviewTab.tsx`:
- `useEffect` on `period` change triggers data fetch
- Loading/error/empty states for each section
- Uses `KpiCard`, `LineChart` (area chart), `HBarChart`, and a sortable table
- No new chart primitives needed

The `LineChart` component accepts `{ date: string; plays: number }[]`. We map the audience time series (`bucket`, `listeners`) onto those field names.

The `HBarChart` component accepts `{ name: string; value: number }[]`. We map `station_name` → `name`, `avg_listeners` → `value`.

- [ ] **Step 1: Create `components/analytics/tabs/AudienceTab.tsx`**

```tsx
'use client';
import { useEffect, useState } from 'react';
import {
  fetchAudience,
  type AudienceResponse,
  type AudienceSong,
} from '@/lib/analyticsApi';
import { KpiCard } from '../KpiCard';
import { SkeletonCard } from '../SkeletonCard';
import { LineChart } from '../charts/LineChart';
import { HBarChart } from '../charts/HBarChart';

type SortKey = 'avg_listeners' | 'count';

interface Props {
  period: number;
}

export function AudienceTab({ period }: Props) {
  const [data, setData] = useState<AudienceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('avg_listeners');

  const load = () => {
    setLoading(true);
    setError(null);
    fetchAudience(period)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError('Failed to load audience data.'); setLoading(false); });
  };

  useEffect(() => { load(); }, [period]); // eslint-disable-line react-hooks/exhaustive-deps

  const cardStyle = {
    background: 'var(--color-surface-raised)',
    border: '1px solid var(--color-border)',
  } as const;

  const sectionLabel = {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    color: 'var(--color-text-muted)',
    marginBottom: 12,
  };

  if (error) {
    return (
      <div className="rounded-xl p-6 text-center" style={cardStyle}>
        <p className="text-sm mb-3" style={{ color: '#f87171' }}>{error}</p>
        <button
          onClick={load}
          className="text-xs px-3 py-1.5 rounded-lg"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', cursor: 'pointer' }}
        >
          Retry
        </button>
      </div>
    );
  }

  const lineData = (data?.time_series ?? []).map(b => ({ date: b.bucket, plays: b.listeners }));
  const barData = (data?.top_stations ?? []).map(s => ({ name: s.station_name, value: s.avg_listeners }));

  const sortedSongs: AudienceSong[] = [...(data?.top_songs ?? [])].sort((a, b) =>
    sortKey === 'avg_listeners' ? b.avg_listeners - a.avg_listeners : b.count - a.count
  );

  const thStyle = (key: SortKey) => ({
    textAlign: 'right' as const,
    paddingBottom: 8,
    fontWeight: 600,
    cursor: 'pointer',
    color: sortKey === key ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
    userSelect: 'none' as const,
  });

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Peak Listeners"
          value={data?.peak_listeners ?? 0}
          loading={loading}
        />
        <KpiCard
          label="Avg per Song"
          value={data ? data.avg_listeners.toLocaleString() : '—'}
          loading={loading}
        />
        <KpiCard
          label="Song Detections"
          value={data?.total_detections ?? 0}
          loading={loading}
        />
        <KpiCard
          label="App Engagement"
          value={data ? `${data.app_engagement_rate.toFixed(1)}%` : '—'}
          loading={loading}
        />
      </div>

      {/* Listener trend + top stations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl p-4" style={cardStyle}>
          <p style={sectionLabel}>Stream Listeners Over Time</p>
          {loading ? (
            <SkeletonCard height={140} />
          ) : lineData.length === 0 ? (
            <p className="text-xs text-center py-12" style={{ color: 'var(--color-text-muted)' }}>
              No listener data for this period
            </p>
          ) : (
            <LineChart data={lineData} ariaLabel="Area chart: stream listeners over time" />
          )}
        </div>

        <div className="rounded-xl p-4" style={cardStyle}>
          <p style={sectionLabel}>Top Stations by Reach</p>
          {loading ? (
            <SkeletonCard height={200} />
          ) : barData.length === 0 ? (
            <p className="text-xs text-center py-12" style={{ color: 'var(--color-text-muted)' }}>
              No station data
            </p>
          ) : (
            <HBarChart data={barData} ariaLabel="Bar chart: top stations by avg stream listeners" />
          )}
        </div>
      </div>

      {/* Top songs table */}
      <div className="rounded-xl p-4 overflow-auto" style={cardStyle}>
        <p style={sectionLabel}>Top Songs by Stream Listeners</p>
        {loading ? (
          <SkeletonCard height={200} />
        ) : sortedSongs.length === 0 ? (
          <p className="text-xs text-center py-10" style={{ color: 'var(--color-text-muted)' }}>
            No song data for this period
          </p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr style={{ color: 'var(--color-text-muted)' }}>
                <th className="text-left pb-2 font-medium">#</th>
                <th className="text-left pb-2 font-medium">Song</th>
                <th className="text-left pb-2 font-medium">Artist</th>
                <th
                  className="pr-4"
                  style={thStyle('avg_listeners')}
                  onClick={() => setSortKey('avg_listeners')}
                >
                  Avg Listeners {sortKey === 'avg_listeners' ? '↓' : ''}
                </th>
                <th
                  style={thStyle('count')}
                  onClick={() => setSortKey('count')}
                >
                  Detections {sortKey === 'count' ? '↓' : ''}
                </th>
                <th className="text-right pb-2 font-medium">Best Station</th>
              </tr>
            </thead>
            <tbody>
              {sortedSongs.map((song, i) => (
                <tr
                  key={`${song.title}-${song.artist}`}
                  style={{ borderTop: '1px solid var(--color-border)' }}
                >
                  <td className="py-1.5 pr-2 tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
                    {i + 1}
                  </td>
                  <td className="py-1.5 pr-4 max-w-[160px]">
                    <p className="truncate font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {song.title}
                    </p>
                  </td>
                  <td className="py-1.5 pr-4 max-w-[120px]">
                    <p className="truncate" style={{ color: 'var(--color-text-muted)' }}>
                      {song.artist ?? 'Unknown'}
                    </p>
                  </td>
                  <td className="py-1.5 text-right tabular-nums pr-4" style={{ color: 'var(--color-text-primary)' }}>
                    {song.avg_listeners.toLocaleString()}
                  </td>
                  <td className="py-1.5 text-right tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
                    {song.count}
                  </td>
                  <td className="py-1.5 text-right" style={{ color: '#6366f1' }}>
                    {song.best_station ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/analytics/tabs/AudienceTab.tsx
git commit -m "feat: add AudienceTab component for stream broadcast analytics"
```

---

## Task 5: Wire the Audience tab into the analytics page

**Files:**
- Modify: `app/admin/analytics/page.tsx`

Three changes: add `'audience'` to the `Tab` union type, insert it as the second entry in the `TABS` array, import `AudienceTab`, and render it in the tab content block.

- [ ] **Step 1: Update `app/admin/analytics/page.tsx`**

Find (line 17):
```typescript
type Tab = 'overview' | 'stations' | 'songs' | 'genres' | 'health';
```

Replace with:
```typescript
type Tab = 'overview' | 'audience' | 'stations' | 'songs' | 'genres' | 'health';
```

Find (line 19–25):
```typescript
const TABS: { id: Tab; label: string }[] = [
  { id: 'overview',  label: 'Overview' },
  { id: 'stations',  label: 'Stations' },
  { id: 'songs',     label: 'Songs & Artists' },
  { id: 'genres',    label: 'Genres & Regions' },
  { id: 'health',    label: 'Station Health' },
];
```

Replace with:
```typescript
const TABS: { id: Tab; label: string }[] = [
  { id: 'overview',  label: 'Overview' },
  { id: 'audience',  label: 'Audience' },
  { id: 'stations',  label: 'Stations' },
  { id: 'songs',     label: 'Songs & Artists' },
  { id: 'genres',    label: 'Genres & Regions' },
  { id: 'health',    label: 'Station Health' },
];
```

Find the import block at the top. After:
```typescript
import { HealthTab } from '@/components/analytics/tabs/HealthTab';
```

Add:
```typescript
import { AudienceTab } from '@/components/analytics/tabs/AudienceTab';
```

Find (line 123–128):
```typescript
          {/* Tab content */}
          <div role="tabpanel">
            {tab === 'overview'  && <OverviewTab period={period} realtime={realtime} />}
            {tab === 'stations'  && <StationsTab period={period} realtime={realtime} />}
            {tab === 'songs'     && <SongsTab period={period} />}
            {tab === 'genres'    && <GenresTab period={period} />}
            {tab === 'health'    && <HealthTab period={period} realtime={realtime} />}
          </div>
```

Replace with:
```typescript
          {/* Tab content */}
          <div role="tabpanel">
            {tab === 'overview'  && <OverviewTab period={period} realtime={realtime} />}
            {tab === 'audience'  && <AudienceTab period={period} />}
            {tab === 'stations'  && <StationsTab period={period} realtime={realtime} />}
            {tab === 'songs'     && <SongsTab period={period} />}
            {tab === 'genres'    && <GenresTab period={period} />}
            {tab === 'health'    && <HealthTab period={period} realtime={realtime} />}
          </div>
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/admin/analytics/page.tsx
git commit -m "feat: wire Audience tab into analytics page nav"
```

---

## Task 6: Manual verification

**Files:** none (verification only)

- [ ] **Step 1: Start the Flask backend**

```bash
cd backend && python run.py
```

Or however the Flask dev server is started in this project. Confirm it's at `http://localhost:5000`.

- [ ] **Step 2: Start the Next.js dev server**

```bash
cd .. && yarn dev
```

Confirm it's at `http://localhost:3000`.

- [ ] **Step 3: Navigate to the analytics dashboard**

Open `http://localhost:3000/admin/analytics` and log in as an admin if prompted.

- [ ] **Step 4: Verify the Audience tab appears**

The tab bar should show: Overview | **Audience** | Stations | Songs & Artists | Genres & Regions | Station Health

Click **Audience**.

- [ ] **Step 5: Verify KPI cards load**

With data in the `plays` collection the four KPI cards should show real numbers. With no data they should show `0` — not crash, not show `—` for numbers, not show blank.

- [ ] **Step 6: Verify period filter changes data**

Switch between 7d and 30d. Verify the tab re-fetches (you'll see a brief loading skeleton) and numbers change (or stay the same if data range is the same).

- [ ] **Step 7: Verify song table sorting**

Click the **Avg Listeners** and **Detections** column headers. Verify the table re-sorts without a page reload.

- [ ] **Step 8: Verify URL deep-linking**

Navigate directly to `http://localhost:3000/admin/analytics?tab=audience&period=30`. The Audience tab should be active with the 30-day period selected.

- [ ] **Step 9: Final commit if any fixes were made**

```bash
git add -p
git commit -m "fix: audience tab verification fixes"
```

If no fixes were needed, skip this step.
