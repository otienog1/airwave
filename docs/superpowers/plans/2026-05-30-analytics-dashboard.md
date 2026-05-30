# Analytics Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an admin-only analytics dashboard at `/admin/analytics` with live status bar, period filter, and 5 tabs (Overview, Stations, Songs & Artists, Genres & Regions, Station Health).

**Architecture:** Separate Next.js `'use client'` page with URL-synced `?tab=` and `?period=` state. A persistent live status bar polls Flask `/analytics/real-time` every 15 s. Each tab fetches its data lazily via `lib/analyticsApi.ts`. Recharts v2 for all charts; custom SVG for the hourly heatmap.

**Tech Stack:** Next.js App Router, React, Tailwind CSS, Recharts v2, Lucide icons, CSS custom properties (`--color-surface`, `--color-border`, `--color-text-*`), indigo `#6366f1` accent.

---

## File Map

**New files:**
```
lib/analyticsApi.ts
components/analytics/LiveStatusBar.tsx
components/analytics/PeriodFilter.tsx
components/analytics/KpiCard.tsx
components/analytics/SkeletonCard.tsx
components/analytics/charts/LineChart.tsx
components/analytics/charts/DonutChart.tsx
components/analytics/charts/HBarChart.tsx
components/analytics/charts/HeatmapGrid.tsx
components/analytics/tabs/OverviewTab.tsx
components/analytics/tabs/StationsTab.tsx
components/analytics/tabs/SongsTab.tsx
components/analytics/tabs/GenresTab.tsx
components/analytics/tabs/HealthTab.tsx
app/admin/analytics/page.tsx
```

**Existing files to modify:**
```
lib/analytics.ts                        Add avgDuration to TrendingEntry + getTrending aggregation
backend/app/analytics_bp.py             Add heatmap_data (day×hour) to station stats endpoint
app/admin/page.tsx                      Add Analytics nav link
```

---

## Task 1: Install recharts

**Files:** `package.json`, `yarn.lock`

- [ ] **Step 1: Install recharts**

```
yarn add recharts
```

- [ ] **Step 2: Verify install**

```
yarn list recharts
```

Expected: recharts@2.x.x listed

- [ ] **Step 3: Commit**

```
git add package.json yarn.lock
git commit -m "feat: add recharts dependency for analytics dashboard"
```

---

## Task 2: Extend getTrending with avgDuration

**Files:**
- Modify: `lib/analytics.ts`

`playDuration` is stored in the plays collection (set when a play is closed). We add it to the trending aggregation so the Songs tab can display average listen time per song.

- [ ] **Step 1: Update `TrendingEntry` interface**

In `lib/analytics.ts`, change lines 96–102:

```ts
export interface TrendingEntry {
  title: string;
  artist: string | null;
  playCount: number;
  avgDuration: number | null;  // seconds, null if no completed plays
  stations: string[];
  lastSeen: Date;
}
```

- [ ] **Step 2: Update `getTrending` aggregation**

Replace the `$group` and `$project` stages in `getTrending` (lines 112–131):

```ts
    {
      $group: {
        _id: '$title',
        artist:      { $first: '$artist' },
        playCount:   { $sum: 1 },
        totalDur:    { $sum: { $ifNull: ['$playDuration', 0] } },
        completedCt: { $sum: { $cond: [{ $gt: ['$playDuration', 0] }, 1, 0] } },
        stations:    { $addToSet: '$stationName' },
        lastSeen:    { $max: '$detectedAt' },
      },
    },
    { $sort: { playCount: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        title:       '$_id',
        artist:      1,
        playCount:   1,
        avgDuration: {
          $cond: [
            { $gt: ['$completedCt', 0] },
            { $divide: ['$totalDur', '$completedCt'] },
            null,
          ],
        },
        stations:    1,
        lastSeen:    1,
      },
    },
```

- [ ] **Step 3: Verify TypeScript compiles**

```
npx tsc --noEmit
```

Expected: no errors related to `analytics.ts`

- [ ] **Step 4: Commit**

```
git add lib/analytics.ts
git commit -m "feat: add avgDuration to trending aggregation"
```

---

## Task 3: Extend Flask station stats with heatmap data

**Files:**
- Modify: `backend/app/analytics_bp.py` (function `get_station_stats`, around line 333)

The HeatmapGrid needs `{hour, day, count}` tuples. The current endpoint only returns per-hour totals. Add a day-of-week × hour aggregation.

- [ ] **Step 1: Add heatmap aggregation in `get_station_stats`**

After the `hourly_agg` block (after line 337), add:

```python
        heatmap_agg = list(plays_col.aggregate([
            {'$match': match},
            {'$group': {
                '_id': {
                    'hour': {'$hour': '$played_at'},
                    'day': {'$subtract': [{'$dayOfWeek': '$played_at'}, 1]},  # 0=Sun…6=Sat
                },
                'plays': {'$sum': 1},
            }},
        ]))
        heatmap_data = [
            {'hour': r['_id']['hour'], 'day': r['_id']['day'], 'count': r['plays']}
            for r in heatmap_agg
        ]
```

- [ ] **Step 2: Add `heatmap_data` to the return payload**

In the `return jsonify(...)` dict (around line 339), add `'heatmap_data': heatmap_data` alongside `'daily_stats'` and `'hourly_distribution'`.

The full return becomes:
```python
        return jsonify({
            'station': {'id': station.id, 'name': station.name, 'genre': station.genre, 'region': station.region},
            'stats': {
                'total_plays_all_time': station.total_plays,
                'period_plays': period_plays,
                'unique_listeners': unique_listeners,
                'total_listening_hours': round(total_duration / 3600, 2),
                'avg_session_minutes': round(avg_duration / 60, 2),
                'current_listeners': station.current_listeners,
            },
            'daily_stats': daily_data,
            'hourly_distribution': hourly_data,
            'heatmap_data': heatmap_data,
            'period': {'start_date': start.date().isoformat(), 'end_date': end.date().isoformat(), 'days': days},
        })
```

- [ ] **Step 3: Commit**

```
git add backend/app/analytics_bp.py
git commit -m "feat: add day×hour heatmap data to station stats endpoint"
```

---

## Task 4: Create `lib/analyticsApi.ts`

**Files:**
- Create: `lib/analyticsApi.ts`

Typed fetcher wrapper for all Flask analytics endpoints. Uses `credentials: 'include'` (same pattern as `lib/api.ts`).

- [ ] **Step 1: Create the file**

```ts
// lib/analyticsApi.ts
const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BACKEND}${path}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

// ── Response types ─────────────────────────────────────────────────────────

export interface RealTimeStation {
  id: number;
  name: string;
  genre: string | null;
  current_listeners: number;
}

export interface RealTimeResponse {
  real_time: {
    active_listeners: number;
    live_stations: number;
    current_stations: RealTimeStation[];
  };
  today: { total_plays: number; unique_listeners: number };
  timestamp: string;
}

export interface TopStation {
  id: number;
  name: string;
  genre: string | null;
  play_count: number;
  total_duration: number;
  avg_duration: number;
}

export interface DashboardOverview {
  total_stations: number;
  live_stations: number;
  total_users: number;
  total_plays: number;
  unique_listeners: number;
  total_listening_hours: number;
  avg_session_minutes: number;
  plays_growth_percent: number;
}

export interface DashboardResponse {
  overview: DashboardOverview;
  top_stations: TopStation[];
  period: { start_date: string; end_date: string; days: number };
}

export interface TrendingStation {
  id: number;
  name: string;
  genre: string | null;
  current_plays: number;
  prev_plays: number;
  growth_percent: number;
}

export interface TrendsResponse {
  trending_stations: TrendingStation[];
  trending_genres: unknown[];
  period: {
    current_start: string;
    current_end: string;
    previous_start: string;
    previous_end: string;
    days: number;
  };
}

export interface GenreEntry {
  genre: string;
  total_plays: number;
  unique_listeners: number;
  total_duration_hours: number;
  station_count: number;
  avg_plays_per_station: number;
}

export interface GenresResponse {
  genre_analytics: GenreEntry[];
  period: { start_date: string; end_date: string; days: number };
}

export interface RegionEntry {
  region: string;
  total_plays: number;
  unique_listeners: number;
  total_duration_hours: number;
  station_count: number;
  avg_plays_per_station: number;
}

export interface RegionsResponse {
  region_analytics: RegionEntry[];
  period: { start_date: string; end_date: string; days: number };
}

export interface DailyStatEntry {
  date: string;
  plays: number;
  unique_listeners: number;
  total_duration_minutes: number;
}

export interface HeatmapEntry {
  hour: number;
  day: number;
  count: number;
}

export interface StationStatsResponse {
  station: { id: number; name: string; genre: string | null; region: string | null };
  stats: {
    total_plays_all_time: number;
    period_plays: number;
    unique_listeners: number;
    total_listening_hours: number;
    avg_session_minutes: number;
    current_listeners: number;
  };
  daily_stats: DailyStatEntry[];
  hourly_distribution: { hour: number; plays: number }[];
  heatmap_data: HeatmapEntry[];
  period: { start_date: string; end_date: string; days: number };
}

export interface TrendingEntry {
  title: string;
  artist: string | null;
  playCount: number;
  avgDuration: number | null;
  stations: string[];
  lastSeen: string;
}

export interface TrendingResponse {
  hours: number;
  limit: number;
  results: TrendingEntry[];
}

// ── Fetchers ───────────────────────────────────────────────────────────────

export function fetchRealTime(): Promise<RealTimeResponse> {
  return get('/analytics/real-time');
}

export function fetchDashboard(days: number): Promise<DashboardResponse> {
  return get(`/analytics/dashboard?days=${days}`);
}

export function fetchTrends(days: number): Promise<TrendsResponse> {
  return get(`/analytics/trends?days=${days}`);
}

export function fetchGenres(days: number): Promise<GenresResponse> {
  return get(`/analytics/genres?days=${days}`);
}

export function fetchRegions(days: number): Promise<RegionsResponse> {
  return get(`/analytics/regions?days=${days}`);
}

export function fetchStationStats(stationId: number, days: number): Promise<StationStatsResponse> {
  return get(`/analytics/stations/${stationId}/stats?days=${days}`);
}

export function fetchTrending(hours: number, limit: number): Promise<TrendingResponse> {
  return fetch(`/api/analytics/trending?hours=${hours}&limit=${limit}`)
    .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); });
}

export const PERIOD_HOURS: Record<number, number> = { 1: 24, 7: 168, 30: 720, 90: 2160 };
```

- [ ] **Step 2: Verify TypeScript**

```
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```
git add lib/analyticsApi.ts
git commit -m "feat: add analyticsApi.ts with typed fetchers"
```

---

## Task 5: Create chart components

**Files:**
- Create: `components/analytics/charts/LineChart.tsx`
- Create: `components/analytics/charts/DonutChart.tsx`
- Create: `components/analytics/charts/HBarChart.tsx`
- Create: `components/analytics/charts/HeatmapGrid.tsx`

- [ ] **Step 1: Create `LineChart.tsx`**

```tsx
// components/analytics/charts/LineChart.tsx
'use client';
import {
  ResponsiveContainer, LineChart as ReLineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Area, AreaChart, defs, linearGradient, stop,
} from 'recharts';

interface Props {
  data: { date: string; plays: number }[];
  color?: string;
  height?: number;
  ariaLabel?: string;
}

export function LineChart({ data, color = '#6366f1', height = 140, ariaLabel }: Props) {
  return (
    <div aria-label={ariaLabel} role="img">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} width={40} />
          <Tooltip
            contentStyle={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: 'var(--color-text-secondary)' }}
            itemStyle={{ color: color }}
          />
          <Area type="monotone" dataKey="plays" stroke={color} strokeWidth={2} fill="url(#areaGrad)" dot={false} activeDot={{ r: 4 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Create `DonutChart.tsx`**

```tsx
// components/analytics/charts/DonutChart.tsx
'use client';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

const PALETTE = ['#6366f1', '#8b5cf6', '#d97706', '#22c55e', '#60a5fa'];

interface Props {
  data: { name: string; value: number }[];
  centerLabel?: string;
  height?: number;
  ariaLabel?: string;
}

export function DonutChart({ data, centerLabel, height = 220, ariaLabel }: Props) {
  const capped = data.length > 5
    ? [...data.slice(0, 4), { name: 'Other', value: data.slice(4).reduce((s, d) => s + d.value, 0) }]
    : data;

  return (
    <div aria-label={ariaLabel} role="img">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={capped}
            innerRadius="58%"
            outerRadius="78%"
            dataKey="value"
            paddingAngle={2}
          >
            {capped.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
            itemStyle={{ color: 'var(--color-text-primary)' }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, color: 'var(--color-text-secondary)', paddingTop: 8 }}
          />
        </PieChart>
      </ResponsiveContainer>
      {centerLabel && (
        <p className="text-center text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{centerLabel}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create `HBarChart.tsx`**

```tsx
// components/analytics/charts/HBarChart.tsx
'use client';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

interface Props {
  data: { name: string; value: number; value2?: number }[];
  color?: string;
  height?: number;
  ariaLabel?: string;
}

export function HBarChart({ data, color = '#6366f1', height = 200, ariaLabel }: Props) {
  return (
    <div aria-label={ariaLabel} role="img">
      <ResponsiveContainer width="100%" height={Math.max(height, data.length * 36)}>
        <BarChart layout="vertical" data={data} margin={{ left: 8, right: 32, top: 4, bottom: 4 }}>
          <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
            cursor={{ fill: 'rgba(99,102,241,0.06)' }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} fill={color} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 4: Create `HeatmapGrid.tsx`**

```tsx
// components/analytics/charts/HeatmapGrid.tsx
'use client';
import { useState } from 'react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CELL = 16;
const GAP = 2;

interface Props {
  data: { hour: number; day: number; count: number }[];
}

export function HeatmapGrid({ data }: Props) {
  const [tip, setTip] = useState<{ x: number; y: number; label: string } | null>(null);
  const maxCount = Math.max(1, ...data.map(d => d.count));

  const cellMap = new Map<string, number>();
  for (const d of data) cellMap.set(`${d.day}-${d.hour}`, d.count);

  const totalW = 24 * (CELL + GAP) - GAP + 36;
  const totalH = 7 * (CELL + GAP) - GAP + 24;

  return (
    <div className="relative overflow-x-auto">
      <svg width={totalW} height={totalH} aria-label="24-hour by 7-day listener heatmap">
        {/* Day labels */}
        {DAYS.map((d, row) => (
          <text
            key={row}
            x={0}
            y={row * (CELL + GAP) + CELL * 0.75}
            fontSize={9}
            fill="var(--color-text-muted)"
          >{d}</text>
        ))}
        {/* Hour labels */}
        {[0, 6, 12, 18, 23].map(h => (
          <text
            key={h}
            x={36 + h * (CELL + GAP)}
            y={totalH}
            fontSize={9}
            fill="var(--color-text-muted)"
          >{h}h</text>
        ))}
        {/* Cells */}
        {DAYS.map((dayLabel, row) =>
          Array.from({ length: 24 }, (_, col) => {
            const count = cellMap.get(`${row}-${col}`) ?? 0;
            const opacity = count === 0 ? 0 : 0.15 + 0.85 * (count / maxCount);
            const x = 36 + col * (CELL + GAP);
            const y = row * (CELL + GAP);
            return (
              <rect
                key={`${row}-${col}`}
                x={x} y={y}
                width={CELL} height={CELL}
                rx={3}
                fill={count === 0 ? 'var(--color-surface-raised)' : `rgba(99,102,241,${opacity})`}
                style={{ cursor: 'default' }}
                onMouseEnter={e => setTip({
                  x: e.clientX, y: e.clientY,
                  label: `${dayLabel} ${col}:00 — ${count} plays`,
                })}
                onMouseLeave={() => setTip(null)}
              />
            );
          })
        )}
      </svg>
      {tip && (
        <div
          className="fixed z-50 px-2 py-1 rounded text-xs pointer-events-none"
          style={{
            left: tip.x + 12, top: tip.y - 28,
            background: 'var(--color-surface-raised)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
        >{tip.label}</div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Verify TypeScript**

```
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```
git add components/analytics/charts/
git commit -m "feat: add LineChart, DonutChart, HBarChart, HeatmapGrid chart components"
```

---

## Task 6: Create shared UI components

**Files:**
- Create: `components/analytics/SkeletonCard.tsx`
- Create: `components/analytics/KpiCard.tsx`
- Create: `components/analytics/PeriodFilter.tsx`

- [ ] **Step 1: Create `SkeletonCard.tsx`**

```tsx
// components/analytics/SkeletonCard.tsx
interface Props { height?: number; className?: string }

export function SkeletonCard({ height = 80, className = '' }: Props) {
  return (
    <div
      className={`rounded-xl animate-pulse ${className}`}
      style={{ height, background: 'var(--color-surface-raised)' }}
    />
  );
}
```

- [ ] **Step 2: Create `KpiCard.tsx`**

```tsx
// components/analytics/KpiCard.tsx
interface Props {
  label: string;
  value: string | number;
  change?: number;
  changeSuffix?: string;
  isLive?: boolean;
  loading?: boolean;
}

export function KpiCard({ label, value, change, changeSuffix = '%', isLive, loading }: Props) {
  if (loading) {
    return (
      <div className="rounded-xl p-4 animate-pulse" style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}>
        <div className="h-3 rounded mb-3" style={{ background: 'var(--color-border)', width: '60%' }} />
        <div className="h-7 rounded" style={{ background: 'var(--color-border)', width: '45%' }} />
      </div>
    );
  }

  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-center gap-1.5 mb-2">
        {isLive && (
          <span className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ background: '#6366f1' }} />
        )}
        <p className="text-xs font-medium uppercase" style={{ color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}>{label}</p>
      </div>
      <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--color-text-primary)' }} role="status">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {!isLive && change !== undefined && (
        <p className="text-xs mt-1.5 font-medium tabular-nums" style={{
          color: change > 0 ? '#22c55e' : change < 0 ? '#ef4444' : 'var(--color-text-muted)',
        }}>
          {change > 0 ? `▲ +${change.toFixed(1)}${changeSuffix}` : change < 0 ? `▼ ${change.toFixed(1)}${changeSuffix}` : '→ No change'}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create `PeriodFilter.tsx`**

```tsx
// components/analytics/PeriodFilter.tsx
'use client';
import { useRouter, useSearchParams } from 'next/navigation';

const PERIODS = [
  { value: 1, label: 'Today' },
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
];

interface Props { current: number }

export function PeriodFilter({ current }: Props) {
  const router = useRouter();
  const params = useSearchParams();

  const set = (p: number) => {
    const next = new URLSearchParams(params.toString());
    next.set('period', String(p));
    router.replace(`?${next.toString()}`);
  };

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Time period filter">
      {PERIODS.map(({ value, label }) => {
        const active = current === value;
        return (
          <button
            key={value}
            onClick={() => set(value)}
            aria-pressed={active}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              minHeight: 36,
              background: active ? '#6366f1' : 'var(--color-surface-raised)',
              color: active ? 'white' : 'var(--color-text-secondary)',
              border: `1px solid ${active ? '#6366f1' : 'var(--color-border)'}`,
              cursor: 'pointer',
            }}
          >{label}</button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```
git add components/analytics/SkeletonCard.tsx components/analytics/KpiCard.tsx components/analytics/PeriodFilter.tsx
git commit -m "feat: add KpiCard, SkeletonCard, PeriodFilter analytics components"
```

---

## Task 7: Create LiveStatusBar

**Files:**
- Create: `components/analytics/LiveStatusBar.tsx`

- [ ] **Step 1: Create the file**

```tsx
// components/analytics/LiveStatusBar.tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import { fetchRealTime, type RealTimeResponse } from '@/lib/analyticsApi';

export function LiveStatusBar() {
  const [data, setData] = useState<RealTimeResponse | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = () => {
    fetchRealTime().then(setData).catch(() => {});
  };

  useEffect(() => {
    poll();
    timerRef.current = setInterval(poll, 15_000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const rt = data?.real_time;
  const today = data?.today;
  const leading = rt?.current_stations[0];

  return (
    <div
      className="flex items-center gap-4 px-5 py-2 text-xs overflow-x-auto shrink-0"
      style={{
        background: 'linear-gradient(90deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.04) 100%)',
        borderBottom: '1px solid var(--color-border)',
        color: 'var(--color-text-secondary)',
        minHeight: 36,
      }}
    >
      {/* Pulse dot */}
      <span className="flex items-center gap-1.5 shrink-0">
        <span className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ background: '#22c55e' }} />
        <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>
          {rt?.active_listeners ?? '—'}
        </span>
        {' '}listening now
      </span>

      <span style={{ color: 'var(--color-border)' }}>|</span>

      <span className="shrink-0">
        <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>
          {rt?.live_stations ?? '—'}
        </span>
        {' '}stations live
      </span>

      <span style={{ color: 'var(--color-border)' }}>|</span>

      <span className="shrink-0">
        <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>
          {today?.total_plays?.toLocaleString() ?? '—'}
        </span>
        {' '}plays today
      </span>

      {leading && (
        <>
          <span style={{ color: 'var(--color-border)' }}>|</span>
          <span className="shrink-0">
            Leading:{' '}
            <span style={{ color: '#6366f1', fontWeight: 600 }}>{leading.name}</span>
            {' · '}{leading.current_listeners} listeners
          </span>
        </>
      )}

      <span className="ml-auto shrink-0" style={{ color: 'var(--color-text-muted)' }}>↻ 15s</span>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```
git add components/analytics/LiveStatusBar.tsx
git commit -m "feat: add LiveStatusBar with 15s polling"
```

---

## Task 8: Create OverviewTab

**Files:**
- Create: `components/analytics/tabs/OverviewTab.tsx`

**Data:** `fetchDashboard(period)` + `fetchTrending(PERIOD_HOURS[period], 10)`

- [ ] **Step 1: Create the file**

```tsx
// components/analytics/tabs/OverviewTab.tsx
'use client';
import { useEffect, useState } from 'react';
import { fetchDashboard, fetchTrending, PERIOD_HOURS, type DashboardResponse, type TrendingEntry } from '@/lib/analyticsApi';
import { KpiCard } from '../KpiCard';
import { SkeletonCard } from '../SkeletonCard';
import { LineChart } from '../charts/LineChart';
import { DonutChart } from '../charts/DonutChart';
import { HBarChart } from '../charts/HBarChart';
import type { RealTimeResponse } from '@/lib/analyticsApi';

function fmtDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s}s`;
}

function relativeTime(date: string | Date) {
  const diff = Date.now() - new Date(date).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return `${Math.floor(diff / 60_000)}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface Props {
  period: number;
  realtime: RealTimeResponse | null;
}

export function OverviewTab({ period, realtime }: Props) {
  const [dash, setDash] = useState<DashboardResponse | null>(null);
  const [trending, setTrending] = useState<TrendingEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const hours = PERIOD_HOURS[period] ?? 168;
    Promise.all([fetchDashboard(period), fetchTrending(hours, 10)])
      .then(([d, t]) => { setDash(d); setTrending(t.results); setLoading(false); })
      .catch(() => { setError('Failed to load overview data.'); setLoading(false); });
  }, [period]);

  if (error) return (
    <div className="rounded-xl p-6 text-center" style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}>
      <p className="text-sm mb-3" style={{ color: '#f87171' }}>{error}</p>
      <button onClick={() => { setError(null); setLoading(true); fetchDashboard(period).then(d => { setDash(d); setLoading(false); }).catch(() => setError('Failed to load.')); }}
        className="text-xs px-3 py-1.5 rounded-lg" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
        Retry
      </button>
    </div>
  );

  const ov = dash?.overview;

  // Build daily plays from top_stations (not ideal but dashboard has no daily series — use period KPIs only)
  // For the LineChart we'll derive a simple data set from the period plays in the future; for now show empty state when no series available.
  const lineData: { date: string; plays: number }[] = [];

  const genreData = dash?.top_stations.reduce<Record<string, number>>((acc, s) => {
    if (s.genre) acc[s.genre] = (acc[s.genre] ?? 0) + s.play_count;
    return acc;
  }, {}) ?? {};

  const donutData = Object.entries(genreData)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  const barData = (dash?.top_stations ?? [])
    .slice(0, 5)
    .map(s => ({ name: s.name, value: s.play_count }));

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Live Listeners"
          value={realtime?.real_time.active_listeners ?? '—'}
          isLive
          loading={!realtime}
        />
        <KpiCard
          label="Total Plays"
          value={ov?.total_plays ?? 0}
          change={ov?.plays_growth_percent}
          loading={loading}
        />
        <KpiCard
          label="Unique Listeners"
          value={ov?.unique_listeners ?? 0}
          loading={loading}
        />
        <KpiCard
          label="Avg Session"
          value={ov ? fmtDuration((ov.avg_session_minutes ?? 0) * 60) : '—'}
          loading={loading}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl p-4" style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}>
          <p className="text-xs font-semibold mb-3 uppercase" style={{ color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}>Plays Over Time</p>
          {loading ? <SkeletonCard height={140} /> : lineData.length === 0 ? (
            <p className="text-xs text-center py-12" style={{ color: 'var(--color-text-muted)' }}>No time-series data for this period</p>
          ) : (
            <LineChart data={lineData} ariaLabel="Line chart: plays over time" />
          )}
        </div>
        <div className="rounded-xl p-4" style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}>
          <p className="text-xs font-semibold mb-3 uppercase" style={{ color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}>Plays by Genre</p>
          {loading ? <SkeletonCard height={220} /> : donutData.length === 0 ? (
            <p className="text-xs text-center py-12" style={{ color: 'var(--color-text-muted)' }}>No genre data</p>
          ) : (
            <DonutChart data={donutData} ariaLabel="Donut chart: plays by genre" />
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl p-4" style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}>
          <p className="text-xs font-semibold mb-3 uppercase" style={{ color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}>Top Stations</p>
          {loading ? <SkeletonCard height={200} /> : barData.length === 0 ? (
            <p className="text-xs text-center py-10" style={{ color: 'var(--color-text-muted)' }}>No data for this period</p>
          ) : (
            <HBarChart data={barData} ariaLabel="Bar chart: top 5 stations by plays" />
          )}
        </div>
        <div className="rounded-xl p-4 overflow-auto" style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}>
          <p className="text-xs font-semibold mb-3 uppercase" style={{ color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}>Trending Songs</p>
          {loading ? <SkeletonCard height={200} /> : !trending || trending.length === 0 ? (
            <p className="text-xs text-center py-10" style={{ color: 'var(--color-text-muted)' }}>No trending songs yet</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr style={{ color: 'var(--color-text-muted)' }}>
                  <th className="text-left pb-2 font-medium">#</th>
                  <th className="text-left pb-2 font-medium">Song / Artist</th>
                  <th className="text-right pb-2 font-medium">Plays</th>
                  <th className="text-right pb-2 font-medium">Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {trending.map((t, i) => (
                  <tr key={t.title} style={{ borderTop: '1px solid var(--color-border)' }}>
                    <td className="py-1.5 pr-2 tabular-nums" style={{ color: 'var(--color-text-muted)' }}>{i + 1}</td>
                    <td className="py-1.5 pr-4 max-w-[160px]">
                      <p className="truncate font-medium" style={{ color: 'var(--color-text-primary)' }}>{t.title}</p>
                      <p className="truncate" style={{ color: 'var(--color-text-muted)' }}>{t.artist ?? 'Unknown'}</p>
                    </td>
                    <td className="py-1.5 text-right tabular-nums" style={{ color: 'var(--color-text-primary)' }}>{t.playCount}</td>
                    <td className="py-1.5 text-right" style={{ color: 'var(--color-text-muted)' }}>{relativeTime(t.lastSeen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```
git add components/analytics/tabs/OverviewTab.tsx
git commit -m "feat: add OverviewTab with KPIs, genre donut, station bar, trending songs"
```

---

## Task 9: Create StationsTab

**Files:**
- Create: `components/analytics/tabs/StationsTab.tsx`

**Data:** `fetchDashboard(period)` for the table + `fetchStationStats(id, period)` for drill-down modal.

- [ ] **Step 1: Create the file**

```tsx
// components/analytics/tabs/StationsTab.tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import {
  fetchDashboard, fetchStationStats,
  type DashboardResponse, type StationStatsResponse, type RealTimeResponse
} from '@/lib/analyticsApi';
import { SkeletonCard } from '../SkeletonCard';
import { KpiCard } from '../KpiCard';
import { LineChart } from '../charts/LineChart';
import { HeatmapGrid } from '../charts/HeatmapGrid';

type SortKey = 'play_count' | 'avg_duration';

interface Props {
  period: number;
  realtime: RealTimeResponse | null;
}

export function StationsTab({ period, realtime }: Props) {
  const [dash, setDash] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>('play_count');
  const [asc, setAsc] = useState(false);
  const [detail, setDetail] = useState<StationStatsResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const triggerRef = useRef<HTMLTableRowElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setLoading(true); setError(null);
    fetchDashboard(period)
      .then(d => { setDash(d); setLoading(false); })
      .catch(() => { setError('Failed to load stations.'); setLoading(false); });
  }, [period]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDetail(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const openDetail = (id: number) => {
    setDetailLoading(true);
    fetchStationStats(id, period)
      .then(d => { setDetail(d); setDetailLoading(false); })
      .catch(() => setDetailLoading(false));
  };

  const closeDetail = () => {
    setDetail(null);
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (detail) modalRef.current?.focus();
  }, [detail]);

  const rtMap = new Map(
    (realtime?.real_time.current_stations ?? []).map(s => [s.id, s.current_listeners])
  );

  const toggleSort = (k: SortKey) => {
    if (sort === k) setAsc(a => !a);
    else { setSort(k); setAsc(false); }
  };

  const stations = [...(dash?.top_stations ?? [])].sort((a, b) => {
    const v = sort === 'play_count' ? a.play_count - b.play_count : a.avg_duration - b.avg_duration;
    return asc ? v : -v;
  });

  if (error) return <p className="text-sm text-center py-12" style={{ color: '#f87171' }}>{error}</p>;

  return (
    <div>
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} height={44} />)}</div>
      ) : stations.length === 0 ? (
        <p className="text-sm text-center py-12" style={{ color: 'var(--color-text-muted)' }}>No station data for this period</p>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
          <table className="w-full text-xs">
            <thead style={{ background: 'var(--color-surface-raised)' }}>
              <tr style={{ color: 'var(--color-text-muted)' }}>
                <th className="text-left px-4 py-3 font-medium">Station</th>
                <th className="text-left px-3 py-3 font-medium">Genre</th>
                <th
                  className="text-right px-3 py-3 font-medium cursor-pointer select-none"
                  onClick={() => toggleSort('play_count')}
                  style={{ color: sort === 'play_count' ? '#6366f1' : undefined }}
                >Plays {sort === 'play_count' ? (asc ? '↑' : '↓') : ''}</th>
                <th
                  className="text-right px-3 py-3 font-medium cursor-pointer select-none"
                  onClick={() => toggleSort('avg_duration')}
                  style={{ color: sort === 'avg_duration' ? '#6366f1' : undefined }}
                >Avg Duration {sort === 'avg_duration' ? (asc ? '↑' : '↓') : ''}</th>
                <th className="text-right px-3 py-3 font-medium">Live Now</th>
                <th className="text-right px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {stations.map(s => {
                const isLive = rtMap.has(s.id);
                const liveCount = rtMap.get(s.id) ?? 0;
                const avgSec = s.avg_duration ?? 0;
                const avgFmt = `${Math.floor(avgSec / 60)}m ${Math.floor(avgSec % 60)}s`;
                return (
                  <tr
                    key={s.id}
                    ref={r => { if (r) triggerRef.current = r; }}
                    tabIndex={0}
                    onClick={() => openDetail(s.id)}
                    onKeyDown={e => e.key === 'Enter' && openDetail(s.id)}
                    className="cursor-pointer"
                    style={{ borderTop: '1px solid var(--color-border)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.04)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text-primary)' }}>{s.name}</td>
                    <td className="px-3 py-3" style={{ color: 'var(--color-text-secondary)' }}>{s.genre ?? '—'}</td>
                    <td className="px-3 py-3 text-right tabular-nums" style={{ color: 'var(--color-text-primary)' }}>{s.play_count.toLocaleString()}</td>
                    <td className="px-3 py-3 text-right tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>{avgFmt}</td>
                    <td className="px-3 py-3 text-right tabular-nums" style={{ color: isLive ? '#22c55e' : 'var(--color-text-muted)' }}>
                      {isLive ? liveCount : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{
                        background: isLive ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                        color: isLive ? '#22c55e' : '#ef4444',
                      }}>
                        {isLive ? '● Live' : '● Offline'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail modal */}
      {(detail || detailLoading) && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-4 md:items-center"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={e => { if (e.target === e.currentTarget) closeDetail(); }}
          role="dialog"
          aria-modal="true"
          aria-label={detail ? `${detail.station.name} detail` : 'Loading station detail'}
        >
          <div
            ref={modalRef}
            tabIndex={-1}
            className="w-full max-w-3xl rounded-2xl overflow-auto outline-none"
            style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border-strong)', maxHeight: '90vh' }}
          >
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div>
                <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  {detail?.station.name ?? 'Loading…'}
                </h2>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {detail?.station.genre} · {detail?.station.region}
                </p>
              </div>
              <button onClick={closeDetail} aria-label="Close" className="p-1.5 rounded-lg" style={{ color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {detailLoading ? (
              <div className="p-6 space-y-4">
                <SkeletonCard height={100} />
                <SkeletonCard height={160} />
              </div>
            ) : detail ? (
              <div className="p-6 space-y-6">
                {/* KPI mini-row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <KpiCard label="Period Plays" value={detail.stats.period_plays} />
                  <KpiCard label="Unique Listeners" value={detail.stats.unique_listeners} />
                  <KpiCard label="Avg Session" value={`${detail.stats.avg_session_minutes.toFixed(1)}m`} />
                  <KpiCard label="Total Hours" value={`${detail.stats.total_listening_hours.toFixed(1)}h`} />
                </div>
                {/* Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <p className="text-xs font-semibold mb-3 uppercase" style={{ color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}>Daily Plays</p>
                    {detail.daily_stats.length > 0 ? (
                      <LineChart data={detail.daily_stats.map(d => ({ date: d.date, plays: d.plays }))} ariaLabel={`Line chart: daily plays for ${detail.station.name}`} />
                    ) : <p className="text-xs text-center py-8" style={{ color: 'var(--color-text-muted)' }}>No daily data</p>}
                  </div>
                  <div className="rounded-xl p-4 overflow-auto" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <p className="text-xs font-semibold mb-3 uppercase" style={{ color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}>Peak Hours (day × hour)</p>
                    {detail.heatmap_data.length > 0 ? (
                      <HeatmapGrid data={detail.heatmap_data} />
                    ) : <p className="text-xs text-center py-8" style={{ color: 'var(--color-text-muted)' }}>No hourly data</p>}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```
git add components/analytics/tabs/StationsTab.tsx
git commit -m "feat: add StationsTab with sortable table and station detail modal"
```

---

## Task 10: Create SongsTab

**Files:**
- Create: `components/analytics/tabs/SongsTab.tsx`

**Data:** `fetchTrending(PERIOD_HOURS[period], 20)`

- [ ] **Step 1: Create the file**

```tsx
// components/analytics/tabs/SongsTab.tsx
'use client';
import { useEffect, useState } from 'react';
import { fetchTrending, PERIOD_HOURS, type TrendingEntry } from '@/lib/analyticsApi';
import { SkeletonCard } from '../SkeletonCard';
import { HBarChart } from '../charts/HBarChart';

function fmtDuration(sec: number | null) {
  if (!sec || sec === 0) return '—';
  return `${Math.floor(sec / 60)}m ${Math.floor(sec % 60)}s`;
}

function relativeTime(date: string | Date) {
  const diff = Date.now() - new Date(date).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return `${Math.floor(diff / 60_000)}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface Props { period: number }

export function SongsTab({ period }: Props) {
  const [songs, setSongs] = useState<TrendingEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'playCount' | 'avgDuration'>('playCount');

  useEffect(() => {
    setLoading(true); setError(null);
    fetchTrending(PERIOD_HOURS[period] ?? 168, 20)
      .then(r => { setSongs(r.results); setLoading(false); })
      .catch(() => { setError('Failed to load song data.'); setLoading(false); });
  }, [period]);

  const sorted = songs ? [...songs].sort((a, b) =>
    sortBy === 'playCount'
      ? b.playCount - a.playCount
      : (b.avgDuration ?? 0) - (a.avgDuration ?? 0)
  ) : [];

  const artistData = songs
    ? Object.entries(
        songs.reduce<Record<string, number>>((acc, s) => {
          const key = s.artist ?? 'Unknown';
          acc[key] = (acc[key] ?? 0) + s.playCount;
          return acc;
        }, {})
      )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, value]) => ({ name, value }))
    : [];

  if (error) return <p className="text-sm text-center py-12" style={{ color: '#f87171' }}>{error}</p>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Songs table */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-2 px-4 py-3" style={{ background: 'var(--color-surface-raised)', borderBottom: '1px solid var(--color-border)' }}>
          <p className="text-xs font-semibold uppercase flex-1" style={{ color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}>Top Songs</p>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as 'playCount' | 'avgDuration')}
            className="text-xs rounded-lg px-2 py-1"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', cursor: 'pointer' }}
          >
            <option value="playCount">By Plays</option>
            <option value="avgDuration">By Avg Duration</option>
          </select>
        </div>
        {loading ? (
          <div className="p-4 space-y-2">{Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} height={44} />)}</div>
        ) : sorted.length === 0 ? (
          <p className="text-xs text-center py-10" style={{ color: 'var(--color-text-muted)' }}>No songs detected in this period</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr style={{ color: 'var(--color-text-muted)' }}>
                <th className="text-left px-4 py-2 font-medium">#</th>
                <th className="text-left px-2 py-2 font-medium">Song / Artist</th>
                <th className="text-right px-2 py-2 font-medium">Plays</th>
                <th className="text-right px-2 py-2 font-medium">Avg</th>
                <th className="text-right px-4 py-2 font-medium">Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s, i) => (
                <tr key={s.title} style={{ borderTop: '1px solid var(--color-border)' }}>
                  <td className="px-4 py-2 tabular-nums" style={{ color: 'var(--color-text-muted)' }}>{i + 1}</td>
                  <td className="px-2 py-2 max-w-[180px]">
                    <p className="truncate font-medium" style={{ color: 'var(--color-text-primary)' }}>{s.title}</p>
                    <p className="truncate" style={{ color: 'var(--color-text-muted)' }}>{s.artist ?? 'Unknown'}</p>
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums" style={{ color: 'var(--color-text-primary)' }}>{s.playCount}</td>
                  <td className="px-2 py-2 text-right tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>{fmtDuration(s.avgDuration)}</td>
                  <td className="px-4 py-2 text-right" style={{ color: 'var(--color-text-muted)' }}>{relativeTime(s.lastSeen)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Artist chart */}
      <div className="rounded-xl p-4" style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}>
        <p className="text-xs font-semibold uppercase mb-4" style={{ color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}>Top Artists</p>
        {loading ? <SkeletonCard height={320} /> : artistData.length === 0 ? (
          <p className="text-xs text-center py-10" style={{ color: 'var(--color-text-muted)' }}>No artist data</p>
        ) : (
          <HBarChart data={artistData} height={320} ariaLabel="Bar chart: top artists by play count" />
        )}
        <p className="text-xs mt-4" style={{ color: 'var(--color-text-muted)' }}>Source: track metadata from live stream detection</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```
git add components/analytics/tabs/SongsTab.tsx
git commit -m "feat: add SongsTab with sortable song table and top artists chart"
```

---

## Task 11: Create GenresTab

**Files:**
- Create: `components/analytics/tabs/GenresTab.tsx`

**Data:** `fetchGenres(period)` + `fetchRegions(period)`

- [ ] **Step 1: Create the file**

```tsx
// components/analytics/tabs/GenresTab.tsx
'use client';
import { useEffect, useState } from 'react';
import { fetchGenres, fetchRegions, type GenreEntry, type RegionEntry } from '@/lib/analyticsApi';
import { SkeletonCard } from '../SkeletonCard';
import { DonutChart } from '../charts/DonutChart';
import { HBarChart } from '../charts/HBarChart';

interface Props { period: number }

export function GenresTab({ period }: Props) {
  const [genres, setGenres] = useState<GenreEntry[] | null>(null);
  const [regions, setRegions] = useState<RegionEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true); setError(null);
    Promise.all([fetchGenres(period), fetchRegions(period)])
      .then(([g, r]) => { setGenres(g.genre_analytics); setRegions(r.region_analytics); setLoading(false); })
      .catch(() => { setError('Failed to load genre/region data.'); setLoading(false); });
  }, [period]);

  if (error) return <p className="text-sm text-center py-12" style={{ color: '#f87171' }}>{error}</p>;

  const genreDonut = (genres ?? []).map(g => ({ name: g.genre, value: g.total_plays }));
  const genreBar = (genres ?? []).map(g => ({ name: g.genre, value: g.total_plays }));
  const bestGenre = genres?.[0];

  const regionDonut = (regions ?? []).map(r => ({ name: r.region, value: r.total_plays }));
  const regionBar = (regions ?? []).map(r => ({ name: r.region, value: r.total_plays }));
  const bestRegion = regions?.reduce((a, b) => (b.unique_listeners > (a?.unique_listeners ?? 0) ? b : a), regions[0]);

  const Section = ({ title, donut, bar, footer }: {
    title: string;
    donut: { name: string; value: number }[];
    bar: { name: string; value: number }[];
    footer?: string;
  }) => (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl p-4" style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}>
          {loading ? <SkeletonCard height={220} /> : donut.length === 0 ? (
            <p className="text-xs text-center py-10" style={{ color: 'var(--color-text-muted)' }}>No data</p>
          ) : (
            <DonutChart data={donut} ariaLabel={`Donut chart: ${title} share`} />
          )}
        </div>
        <div className="rounded-xl p-4" style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}>
          {loading ? <SkeletonCard height={220} /> : bar.length === 0 ? (
            <p className="text-xs text-center py-10" style={{ color: 'var(--color-text-muted)' }}>No data</p>
          ) : (
            <HBarChart data={bar} ariaLabel={`Bar chart: ${title} ranked by plays`} />
          )}
        </div>
      </div>
      {footer && (
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{footer}</p>
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      <Section
        title="Genres"
        donut={genreDonut}
        bar={genreBar}
        footer={bestGenre ? `Best performing genre: ${bestGenre.genre} · ${bestGenre.total_plays.toLocaleString()} plays · ${bestGenre.station_count} stations` : undefined}
      />
      <div style={{ borderTop: '1px solid var(--color-border)' }} />
      <Section
        title="Regions"
        donut={regionDonut}
        bar={regionBar}
        footer={bestRegion ? `Region with most listeners: ${bestRegion.region} · ${bestRegion.unique_listeners.toLocaleString()} unique` : undefined}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```
git add components/analytics/tabs/GenresTab.tsx
git commit -m "feat: add GenresTab with donut and bar charts for genres and regions"
```

---

## Task 12: Create HealthTab

**Files:**
- Create: `components/analytics/tabs/HealthTab.tsx`

**Data:** `fetchRealTime()` (live status) + `fetchDashboard(period)` (station list with uptime context)

- [ ] **Step 1: Create the file**

```tsx
// components/analytics/tabs/HealthTab.tsx
'use client';
import { useEffect, useState } from 'react';
import { fetchDashboard, type DashboardResponse, type RealTimeResponse } from '@/lib/analyticsApi';
import { SkeletonCard } from '../SkeletonCard';

type MetaSource = 'zetta' | 'icy' | 'icecast' | 'unknown';

const SOURCE_COLORS: Record<MetaSource, { bg: string; text: string }> = {
  zetta:   { bg: 'rgba(99,102,241,0.1)',  text: '#818cf8' },
  icy:     { bg: 'rgba(245,158,11,0.1)',  text: '#fbbf24' },
  icecast: { bg: 'rgba(96,165,250,0.1)',  text: '#60a5fa' },
  unknown: { bg: 'rgba(148,163,184,0.1)', text: '#94a3b8' },
};

interface Props {
  period: number;
  realtime: RealTimeResponse | null;
}

export function HealthTab({ period, realtime }: Props) {
  const [dash, setDash] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'status' | 'listeners'>('listeners');

  useEffect(() => {
    setLoading(true); setError(null);
    fetchDashboard(period)
      .then(d => { setDash(d); setLoading(false); })
      .catch(() => { setError('Failed to load health data.'); setLoading(false); });
  }, [period]);

  if (error) return <p className="text-sm text-center py-12" style={{ color: '#f87171' }}>{error}</p>;

  const rtMap = new Map(
    (realtime?.real_time.current_stations ?? []).map(s => [s.id, s])
  );

  const stations = [...(dash?.top_stations ?? [])];
  const sorted = stations.sort((a, b) => {
    if (sortBy === 'status') {
      return (rtMap.has(b.id) ? 1 : 0) - (rtMap.has(a.id) ? 1 : 0);
    }
    return (rtMap.get(b.id)?.current_listeners ?? 0) - (rtMap.get(a.id)?.current_listeners ?? 0);
  });

  return (
    <div className="space-y-6">
      {/* Status grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} height={96} />)
          : sorted.map(s => {
              const rt = rtMap.get(s.id);
              const isLive = !!rt;
              const borderColor = isLive ? '#22c55e' : '#ef4444';
              return (
                <div
                  key={s.id}
                  className="rounded-xl p-3"
                  style={{
                    background: 'var(--color-surface-raised)',
                    border: `1px solid ${borderColor}33`,
                    boxShadow: `0 0 0 1px ${borderColor}22`,
                  }}
                >
                  <p className="text-xs font-semibold mb-1 truncate" style={{ color: 'var(--color-text-primary)' }}>
                    <span style={{ color: isLive ? '#22c55e' : '#ef4444' }}>●</span>
                    {' '}{s.name}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Genre: {s.genre ?? '—'}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    Listeners: <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                      {isLive ? rt.current_listeners : '—'}
                    </span>
                  </p>
                </div>
              );
            })}
      </div>

      {/* Detail table */}
      {!loading && sorted.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-2 px-4 py-3" style={{ background: 'var(--color-surface-raised)', borderBottom: '1px solid var(--color-border)' }}>
            <p className="text-xs font-semibold uppercase flex-1" style={{ color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}>Station Details</p>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as 'status' | 'listeners')}
              className="text-xs rounded-lg px-2 py-1"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', cursor: 'pointer' }}
            >
              <option value="listeners">By Listeners</option>
              <option value="status">By Status</option>
            </select>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ color: 'var(--color-text-muted)' }}>
                <th className="text-left px-4 py-2 font-medium">Station</th>
                <th className="text-left px-3 py-2 font-medium">Status</th>
                <th className="text-right px-3 py-2 font-medium">Period Plays</th>
                <th className="text-right px-3 py-2 font-medium">Current Listeners</th>
                <th className="text-right px-4 py-2 font-medium">Last Online</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(s => {
                const rt = rtMap.get(s.id);
                const isLive = !!rt;
                return (
                  <tr key={s.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                    <td className="px-4 py-2 font-medium" style={{ color: 'var(--color-text-primary)' }}>{s.name}</td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{
                        background: isLive ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                        color: isLive ? '#22c55e' : '#ef4444',
                      }}>
                        {isLive ? '● Live' : '● Offline'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>{s.play_count.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right tabular-nums" style={{ color: isLive ? '#22c55e' : 'var(--color-text-muted)' }}>
                      {isLive ? rt.current_listeners : '—'}
                    </td>
                    <td className="px-4 py-2 text-right" style={{ color: 'var(--color-text-muted)' }}>
                      {isLive ? 'Now' : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```
git add components/analytics/tabs/HealthTab.tsx
git commit -m "feat: add HealthTab with station status grid and detail table"
```

---

## Task 13: Create main analytics page + navigation

**Files:**
- Create: `app/admin/analytics/page.tsx`
- Modify: `app/admin/page.tsx`

- [ ] **Step 1: Create `app/admin/analytics/page.tsx`**

```tsx
// app/admin/analytics/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, BarChart2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Layout } from '@/components/layout/Layout';
import { LiveStatusBar } from '@/components/analytics/LiveStatusBar';
import { PeriodFilter } from '@/components/analytics/PeriodFilter';
import { OverviewTab } from '@/components/analytics/tabs/OverviewTab';
import { StationsTab } from '@/components/analytics/tabs/StationsTab';
import { SongsTab } from '@/components/analytics/tabs/SongsTab';
import { GenresTab } from '@/components/analytics/tabs/GenresTab';
import { HealthTab } from '@/components/analytics/tabs/HealthTab';
import { fetchRealTime, type RealTimeResponse } from '@/lib/analyticsApi';

type Tab = 'overview' | 'stations' | 'songs' | 'genres' | 'health';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview',  label: 'Overview' },
  { id: 'stations',  label: 'Stations' },
  { id: 'songs',     label: 'Songs & Artists' },
  { id: 'genres',    label: 'Genres & Regions' },
  { id: 'health',    label: 'Station Health' },
];

const VALID_PERIODS = [1, 7, 30, 90];

export default function AnalyticsPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading } = useAuth();

  const tab = (params.get('tab') as Tab) || 'overview';
  const period = VALID_PERIODS.includes(Number(params.get('period')))
    ? Number(params.get('period'))
    : 7;

  const [realtime, setRealtime] = useState<RealTimeResponse | null>(null);

  useEffect(() => {
    if (!loading && !user?.is_admin) router.replace('/');
  }, [user, loading, router]);

  useEffect(() => {
    fetchRealTime().then(setRealtime).catch(() => {});
    const t = setInterval(() => fetchRealTime().then(setRealtime).catch(() => {}), 15_000);
    return () => clearInterval(t);
  }, []);

  if (loading || !user?.is_admin) return null;

  const setTab = (t: Tab) => {
    const next = new URLSearchParams(params.toString());
    next.set('tab', t);
    router.replace(`?${next.toString()}`);
  };

  return (
    <Layout>
      <div className="flex flex-col min-h-screen pb-24">

        {/* Live status bar */}
        <LiveStatusBar />

        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Link
                href="/admin"
                className="flex items-center gap-1.5 text-sm"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <ArrowLeft className="w-4 h-4" />
                Stations
              </Link>
              <span style={{ color: 'var(--color-border)' }}>/</span>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
                  <BarChart2 className="w-4 h-4" style={{ color: 'white' }} />
                </div>
                <h1 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Analytics</h1>
              </div>
            </div>
            <PeriodFilter current={period} />
          </div>

          {/* Tab nav */}
          <div className="flex gap-1 overflow-x-auto" role="tablist">
            {TABS.map(t => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors shrink-0"
                style={{
                  background: tab === t.id ? 'rgba(99,102,241,0.12)' : 'transparent',
                  color: tab === t.id ? '#6366f1' : 'var(--color-text-secondary)',
                  border: `1px solid ${tab === t.id ? 'rgba(99,102,241,0.3)' : 'transparent'}`,
                  cursor: 'pointer',
                }}
              >{t.label}</button>
            ))}
          </div>

          {/* Tab content */}
          <div role="tabpanel">
            {tab === 'overview'  && <OverviewTab period={period} realtime={realtime} />}
            {tab === 'stations'  && <StationsTab period={period} realtime={realtime} />}
            {tab === 'songs'     && <SongsTab period={period} />}
            {tab === 'genres'    && <GenresTab period={period} />}
            {tab === 'health'    && <HealthTab period={period} realtime={realtime} />}
          </div>

        </main>
      </div>
    </Layout>
  );
}
```

- [ ] **Step 2: Add Analytics link to `app/admin/page.tsx`**

In `app/admin/page.tsx`, add `import Link from 'next/link';` and `import { BarChart2 } from 'lucide-react';` to the existing import line.

`BarChart2` and `Link` go in the list view header. Find the header `<div className="flex items-center justify-between mb-6">` block. Add the Analytics link button BEFORE the existing `<button onClick={startNew}` button:

```tsx
import Link from 'next/link';
// BarChart2 already imported from lucide-react — add it to the existing import
```

In the list view header section (around line 308, before the "Add Station" button):
```tsx
<div className="flex items-center gap-2">
  <Link
    href="/admin/analytics"
    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium"
    style={{
      background: 'var(--color-surface-raised)',
      color: 'var(--color-text-secondary)',
      border: '1px solid var(--color-border)',
    }}
  >
    <BarChart2 className="w-4 h-4" />
    Analytics
  </Link>
  <button
    onClick={startNew}
    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
    style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: 'white' }}
  >
    <Plus className="w-4 h-4" />
    Add Station
  </button>
</div>
```

- [ ] **Step 3: Verify TypeScript**

```
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```
git add app/admin/analytics/page.tsx app/admin/page.tsx
git commit -m "feat: add analytics dashboard page and navigation link"
```

---

## Task 14: End-to-end verification

- [ ] **Step 1: Start dev server**

```
yarn dev
```

- [ ] **Step 2: Visit `/admin/analytics`**

Verify:
- Live status bar shows (may show `—` if no listeners yet)
- All 5 tabs render without crash
- Period filter updates URL
- Tab navigation updates URL
- Tab URL survives browser refresh
- Stations tab row click opens modal
- Modal closes with Escape key and X button
- TypeScript has no errors in terminal

- [ ] **Step 3: Verify navigation link**

Visit `/admin` → confirm "Analytics" button appears in header → clicking navigates to `/admin/analytics`.

- [ ] **Step 4: Final commit**

```
git add -A
git commit -m "feat: complete analytics dashboard — live bar, 5 tabs, period filter, station drill-down"
```
