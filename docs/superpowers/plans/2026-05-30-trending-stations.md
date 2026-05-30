# Trending Stations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "🔥 Trending Now" horizontal strip above the station grid showing the top 5 stations ranked by a composite of live listeners, growth %, and plays today — all from existing collections, no schema changes.

**Architecture:** A new public `GET /api/analytics/trending-now` Flask route aggregates three signals (live listeners from `plays`, plays-today and plays-yesterday from `stationPlays`) into a composite score and returns the top 5. A `TrendingStrip` React component fetches this every 30 seconds and renders a horizontally-scrollable row of cards above the search filters. Clicking a card plays the station immediately.

**Tech Stack:** Flask + PyMongo (backend), React `'use client'` component + `analyticsApi.ts` fetcher (frontend), existing `SkeletonCard`, CSS custom properties design system.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `backend/app/analytics_bp.py` | Modify | Add `GET /trending-now` route |
| `backend/tests/test_trending.py` | Create | Tests for the new route |
| `lib/analyticsApi.ts` | Modify | Add types + `fetchTrendingNow()` |
| `components/station/TrendingStrip.tsx` | Create | Trending strip UI component |
| `components/MordernAirwave.tsx` | Modify | Mount TrendingStrip above SearchAndFilters |

---

## Task 1: Backend route `GET /api/analytics/trending-now`

**Files:**
- Modify: `backend/app/analytics_bp.py`
- Create: `backend/tests/test_trending.py`

**Context:** `analytics_bp` is a Flask Blueprint mounted at `/api/analytics` in `app/__init__.py`. The `get_plays_col()` collection has camelCase fields (`stationId`, `detectedAt`, `listeners`). The `get_station_plays_col()` collection has snake_case fields (`station_id`, `played_at`). The existing `admin_required` decorator requires JWT — the new route is **public** (no decorator). Rate limit: `@limiter.limit("60 per minute")`.

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/test_trending.py`:

```python
import pytest
from unittest.mock import patch


@pytest.fixture(scope='function')
def app():
    from app import create_app
    application = create_app(test_config={
        'TESTING': True,
        'JWT_COOKIE_SECURE': False,
        'RATELIMIT_ENABLED': False,
        'RATELIMIT_STORAGE_URI': 'memory://',
    })
    yield application


@pytest.fixture(scope='function')
def client(app):
    return app.test_client(use_cookies=True)


def test_trending_now_empty(client):
    """Returns empty list and 200 when no recent plays data."""
    with patch('app.analytics_bp.get_plays_col') as mock_plays, \
         patch('app.analytics_bp.get_station_plays_col') as mock_sp, \
         patch('app.analytics_bp.get_stations_col') as _mock_stations:

        mock_plays.return_value.aggregate.return_value = iter([])
        mock_sp.return_value.aggregate.side_effect = [iter([]), iter([])]

        response = client.get('/api/analytics/trending-now')
        assert response.status_code == 200
        data = response.get_json()
        assert data['stations'] == []
        assert 'updated_at' in data


def test_trending_now_returns_ranked_stations(client):
    """Returns up to 5 stations; station with most listeners ranks first."""
    live_data = [
        {'_id': 1, 'live_listeners': 1000},
        {'_id': 2, 'live_listeners': 500},
        {'_id': 3, 'live_listeners': 200},
    ]
    today_data = [
        {'_id': 1, 'plays_today': 100},
        {'_id': 2, 'plays_today': 80},
        {'_id': 3, 'plays_today': 40},
    ]
    yesterday_data = [
        {'_id': 1, 'plays_yesterday': 50},
        {'_id': 2, 'plays_yesterday': 80},
    ]
    station_docs = {
        1: {'name': 'Capital FM', 'genre': 'Pop'},
        2: {'name': 'Kiss FM',    'genre': 'Pop'},
        3: {'name': 'Jambo FM',   'genre': 'Swahili'},
    }

    with patch('app.analytics_bp.get_plays_col') as mock_plays, \
         patch('app.analytics_bp.get_station_plays_col') as mock_sp, \
         patch('app.analytics_bp.get_stations_col') as mock_stations:

        mock_plays.return_value.aggregate.return_value = iter(live_data)
        mock_sp.return_value.aggregate.side_effect = [iter(today_data), iter(yesterday_data)]
        mock_stations.return_value.find_one.side_effect = lambda q, proj=None: (
            {'name': station_docs[q['id']]['name'], 'genre': station_docs[q['id']]['genre']}
            if q.get('id') in station_docs else None
        )

        response = client.get('/api/analytics/trending-now')
        assert response.status_code == 200
        data = response.get_json()
        stations = data['stations']
        assert len(stations) == 3
        assert stations[0]['id'] == 1
        assert stations[0]['name'] == 'Capital FM'
        assert stations[0]['live_listeners'] == 1000
        assert 'growth_pct' in stations[0]


def test_trending_now_omits_growth_when_no_yesterday(client):
    """growth_pct is absent from response when plays_yesterday is 0."""
    live_data = [{'_id': 1, 'live_listeners': 500}]
    today_data = [{'_id': 1, 'plays_today': 10}]

    with patch('app.analytics_bp.get_plays_col') as mock_plays, \
         patch('app.analytics_bp.get_station_plays_col') as mock_sp, \
         patch('app.analytics_bp.get_stations_col') as mock_stations:

        mock_plays.return_value.aggregate.return_value = iter(live_data)
        mock_sp.return_value.aggregate.side_effect = [iter(today_data), iter([])]
        mock_stations.return_value.find_one.return_value = {'name': 'Test FM', 'genre': 'Pop'}

        response = client.get('/api/analytics/trending-now')
        assert response.status_code == 200
        data = response.get_json()
        assert len(data['stations']) == 1
        assert 'growth_pct' not in data['stations'][0]
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend
pytest tests/test_trending.py -v
```

Expected: 3 failures — `404 NOT FOUND` or `ImportError` because the route doesn't exist yet.

- [ ] **Step 3: Add the route to `analytics_bp.py`**

Add this block immediately before the `register_analytics_commands` function at the bottom of `backend/app/analytics_bp.py`:

```python
@analytics_bp.route('/trending-now', methods=['GET'])
@limiter.limit("60 per minute")
def get_trending_now():
    try:
        now = datetime.utcnow()
        thirty_min_ago = now - timedelta(minutes=30)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        yesterday_start = today_start - timedelta(days=1)

        plays_col = get_plays_col()
        station_plays_col = get_station_plays_col()
        stations_col = get_stations_col()

        # Live listeners: max listeners per station in last 30 min (plays collection)
        live_agg = list(plays_col.aggregate([
            {'$match': {'detectedAt': {'$gte': thirty_min_ago}}},
            {'$group': {'_id': '$stationId', 'live_listeners': {'$max': '$listeners'}}},
        ]))
        live_map = {r['_id']: int(r['live_listeners'] or 0) for r in live_agg}

        # Plays today per station (stationPlays collection)
        today_agg = list(station_plays_col.aggregate([
            {'$match': {'played_at': {'$gte': today_start, '$lt': now}}},
            {'$group': {'_id': '$station_id', 'plays_today': {'$sum': 1}}},
        ]))
        today_map = {r['_id']: r['plays_today'] for r in today_agg}

        # Plays yesterday per station
        yesterday_agg = list(station_plays_col.aggregate([
            {'$match': {'played_at': {'$gte': yesterday_start, '$lt': today_start}}},
            {'$group': {'_id': '$station_id', 'plays_yesterday': {'$sum': 1}}},
        ]))
        yesterday_map = {r['_id']: r['plays_yesterday'] for r in yesterday_agg}

        all_ids = set(live_map) | set(today_map)
        if not all_ids:
            return jsonify({'stations': [], 'updated_at': now.strftime('%Y-%m-%dT%H:%M:%SZ')})

        max_listeners = max((live_map.get(sid, 0) for sid in all_ids), default=1) or 1
        max_plays = max((today_map.get(sid, 0) for sid in all_ids), default=1) or 1

        scored = []
        for sid in all_ids:
            listeners = live_map.get(sid, 0)
            plays_today = today_map.get(sid, 0)
            plays_yesterday = yesterday_map.get(sid, 0)

            listener_norm = listeners / max_listeners
            plays_norm = plays_today / max_plays

            if plays_yesterday > 0:
                growth_pct = (plays_today - plays_yesterday) / plays_yesterday * 100
                growth_norm = min(growth_pct / 100, 1.0)
            else:
                growth_pct = None
                growth_norm = 0.0

            score = 0.5 * listener_norm + 0.3 * growth_norm + 0.2 * plays_norm
            scored.append({
                'id': sid,
                'live_listeners': listeners,
                'plays_today': plays_today,
                'growth_pct': growth_pct,
                'score': score,
            })

        scored.sort(key=lambda x: x['score'], reverse=True)

        result = []
        for row in scored[:5]:
            station = stations_col.find_one({'id': row['id'], 'is_active': True}, {'name': 1, 'genre': 1})
            if not station:
                continue
            entry = {
                'id': row['id'],
                'name': station['name'],
                'genre': station.get('genre'),
                'live_listeners': row['live_listeners'],
                'plays_today': row['plays_today'],
            }
            if row['growth_pct'] is not None:
                entry['growth_pct'] = round(row['growth_pct'], 1)
            result.append(entry)

        return jsonify({
            'stations': result,
            'updated_at': now.strftime('%Y-%m-%dT%H:%M:%SZ'),
        })

    except Exception as e:
        logging.error(f"Error fetching trending now: {e}")
        return jsonify({'error': 'Failed to fetch trending stations'}), 500
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend
pytest tests/test_trending.py -v
```

Expected output:
```
PASSED tests/test_trending.py::test_trending_now_empty
PASSED tests/test_trending.py::test_trending_now_returns_ranked_stations
PASSED tests/test_trending.py::test_trending_now_omits_growth_when_no_yesterday
3 passed
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/analytics_bp.py backend/tests/test_trending.py
git commit -m "feat: add GET /api/analytics/trending-now endpoint"
```

---

## Task 2: Frontend API types and fetcher

**Files:**
- Modify: `lib/analyticsApi.ts`

**Context:** `analyticsApi.ts` has a `get<T>(path)` helper that prepends `BACKEND` (`http://localhost:5000/api` by default). All other fetchers use `get('/analytics/...')`. The existing `fetchTrending(hours, limit)` fetches top **songs** — not stations — from a different route. The new fetcher is named `fetchTrendingNow` to avoid any confusion.

- [ ] **Step 1: Add types and fetcher to `lib/analyticsApi.ts`**

Add the following block immediately before the `export const PERIOD_HOURS` line at the bottom of `lib/analyticsApi.ts`:

```typescript
export interface TrendingNowStation {
  id: number;
  name: string;
  genre: string | null;
  live_listeners: number;
  plays_today: number;
  growth_pct?: number;
}

export interface TrendingNowResponse {
  stations: TrendingNowStation[];
  updated_at: string;
}

export function fetchTrendingNow(): Promise<TrendingNowResponse> {
  return get('/analytics/trending-now');
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no output (zero errors).

- [ ] **Step 3: Commit**

```bash
git add lib/analyticsApi.ts
git commit -m "feat: add TrendingNowStation types and fetchTrendingNow fetcher"
```

---

## Task 3: TrendingStrip component

**Files:**
- Create: `components/station/TrendingStrip.tsx`

**Context:** Existing components to follow — `StationCard.tsx` uses inline `style` with CSS custom properties (`var(--color-surface-raised)`, `var(--color-border)`, `var(--color-text-primary)`, `var(--color-text-muted)`). `SkeletonCard` lives at `components/analytics/SkeletonCard.tsx` and takes `{ height?: number; className?: string }`. The `Station` type is at `@/types/Station`. The component receives the already-fetched `stations: Station[]` from `MordernAirwave` to avoid a redundant fetch — it matches trending IDs to full Station objects for playback.

- [ ] **Step 1: Create `components/station/TrendingStrip.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { fetchTrendingNow, type TrendingNowStation } from '@/lib/analyticsApi';
import { SkeletonCard } from '@/components/analytics/SkeletonCard';
import type { Station } from '@/types/Station';

interface Props {
  stations: Station[];
  currentStation: Station | null;
  onPlay: (station: Station) => void;
}

function fmt(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toLocaleString();
}

export function TrendingStrip({ stations, currentStation, onPlay }: Props) {
  const [trending, setTrending] = useState<TrendingNowStation[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetchTrendingNow()
        .then(d => { if (!cancelled) setTrending(d.stations); })
        .catch(() => { if (!cancelled) setTrending([]); });
    };
    load();
    const id = setInterval(load, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  if (trending === null) {
    return (
      <div className="mb-5">
        <div className="h-4 w-24 rounded mb-2 animate-pulse" style={{ background: 'var(--color-surface-raised)' }} />
        <div className="flex gap-3 overflow-x-auto pb-1">
          {[0, 1, 2].map(i => (
            <div key={i} className="shrink-0" style={{ width: 164 }}>
              <SkeletonCard height={88} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (trending.length === 0) return null;

  return (
    <div className="mb-5">
      <p
        className="text-xs font-semibold mb-2 uppercase"
        style={{ color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}
      >
        🔥 Trending Now
      </p>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {trending.map(t => {
          const station = stations.find(s => s.id === t.id);
          const isActive = currentStation?.id === t.id;
          return (
            <button
              key={t.id}
              onClick={() => station && onPlay(station)}
              disabled={!station}
              className="shrink-0 rounded-xl px-3 py-2.5 text-left transition-colors duration-150"
              style={{
                width: 164,
                background: isActive ? 'rgba(99,102,241,0.15)' : 'var(--color-surface-raised)',
                border: `1px solid ${isActive ? 'rgba(99,102,241,0.5)' : 'var(--color-border)'}`,
                cursor: station ? 'pointer' : 'default',
              }}
              onMouseEnter={e => {
                if (!isActive) e.currentTarget.style.background = 'rgba(99,102,241,0.08)';
              }}
              onMouseLeave={e => {
                if (!isActive) e.currentTarget.style.background = 'var(--color-surface-raised)';
              }}
            >
              <p
                className="text-xs font-semibold truncate mb-1.5"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {t.name}
              </p>
              <p className="text-xs" style={{ color: '#22c55e' }}>
                ● {fmt(t.live_listeners)} live
              </p>
              {t.growth_pct !== undefined && (
                <p className="text-xs" style={{ color: '#f59e0b' }}>
                  ↑ +{t.growth_pct.toFixed(0)}%
                </p>
              )}
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                {fmt(t.plays_today)} plays
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no output (zero errors).

- [ ] **Step 3: Commit**

```bash
git add components/station/TrendingStrip.tsx
git commit -m "feat: add TrendingStrip component"
```

---

## Task 4: Mount TrendingStrip in MordernAirwave

**Files:**
- Modify: `components/MordernAirwave.tsx`

**Context:** `MordernAirwave.tsx` already has `stations` (from `useStations`), `currentStation` and `playStation` (from `usePlayer`) — all three props TrendingStrip needs. The strip goes above `<SearchAndFilters>` so it's the first thing the user sees. The `stations` array is available even during loading (it's empty, so TrendingStrip will just show its loading skeleton independently).

- [ ] **Step 1: Add the import**

At the top of `components/MordernAirwave.tsx`, add the TrendingStrip import after the existing station imports:

```tsx
import { TrendingStrip } from '@/components/station/TrendingStrip';
```

- [ ] **Step 2: Mount TrendingStrip in the return block**

In the `return` block of `MordernAirwave.tsx`, insert `<TrendingStrip>` between `{showHeart && <HeartBurst />}` and `<SearchAndFilters>`. The result should look like this (existing `<SearchAndFilters>` props and everything below are unchanged):

```tsx
return (
  <>
    {showHeart && <HeartBurst />}

    <TrendingStrip
      stations={stations}
      currentStation={currentStation}
      onPlay={playStation}
    />

    <SearchAndFilters
      ref={searchInputRef}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      selectedGenre={selectedGenre}
      onGenreChange={setSelectedGenre}
      selectedRegion={selectedRegion}
      onRegionChange={setSelectedRegion}
      genres={genres}
      regions={regions}
      stationCount={displayedStations.length}
      loading={stationsLoading}
    />
    {/* showFavoritesOnly banner, audioError banner, StationGrid — all unchanged below */}
  </>
);
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no output (zero errors).

- [ ] **Step 4: Manual smoke test**

1. Start the Flask backend: `cd backend && python run.py`
2. Start the Next.js dev server: `yarn dev`
3. Open `http://localhost:3000`
4. Verify: a "🔥 Trending Now" strip appears above the search bar
5. Verify: cards show station name, green listener count, and amber growth % (if stations have plays)
6. Verify: clicking a trending card starts playing that station
7. Verify: the active station card shows an indigo border
8. Open browser DevTools → Network tab → wait 30 seconds → confirm `/api/analytics/trending-now` is polled again

Edge cases to check:
- If no stations are trending (empty response), the strip disappears cleanly — no blank space
- If Flask is down, the strip disappears silently — no error shown to user

- [ ] **Step 5: Commit**

```bash
git add components/MordernAirwave.tsx
git commit -m "feat: mount TrendingStrip above station grid"
```
