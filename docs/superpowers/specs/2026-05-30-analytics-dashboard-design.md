# Analytics Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an admin-only analytics dashboard at `/admin/analytics` that gives George a real-time + historical view of listener activity, station performance, song trends, genre/region breakdown, and station health — all the data needed to make content and promotion decisions.

**Architecture:** Separate Next.js page with URL-synced tab + period state. A persistent live status bar polls Flask `/analytics/real-time` every 15 s. Each tab lazily fetches its own data from the Flask analytics API (via a typed `lib/analyticsApi.ts` wrapper) when first opened. Recharts handles all charts; a custom SVG grid handles the hourly heatmap (no Recharts equivalent).

**Tech Stack:** Next.js App Router, React, Tailwind CSS, Recharts v2, Lucide icons, existing CSS custom-property design system (`--color-surface`, `--color-border`, `--color-text-*`, indigo `#6366f1` accent).

---

## Design System (ui-ux-pro-max)

- **Style:** Dark Mode (OLED) — matches existing Airwave dark theme
- **Primary accent:** `#6366f1` (indigo) — consistent with rest of app
- **Surface:** `var(--color-surface)` / `var(--color-surface-raised)`
- **Border:** `var(--color-border)` / `var(--color-border-strong)`
- **Text:** `var(--color-text-primary)` / `var(--color-text-secondary)` / `var(--color-text-muted)`
- **Live green:** `#22c55e` (success/online)
- **Amber warning:** `#f59e0b`
- **Red danger:** `#ef4444`
- **Chart palette:** `#6366f1`, `#8b5cf6`, `#d97706`, `#22c55e`, `#60a5fa` (accessible, no red-green-only pairs)
- **Typography:** system-ui (inherits from app); tabular-nums for all numeric data
- **Icons:** Lucide only (no emoji)
- **Spacing:** 8pt grid — gap-2 (8px), gap-4 (16px), gap-6 (24px)
- **Card radius:** `rounded-xl` (12px) — consistent with admin page
- **Animations:** 150–200ms ease-out; skeleton shimmer on load; no animation if `prefers-reduced-motion`

---

## URL State

Tab and period are stored in the URL so pages are deep-linkable and survive refresh:

```
/admin/analytics?tab=overview&period=7
```

- `tab`: `overview` | `stations` | `songs` | `genres` | `health` (default: `overview`)
- `period`: `1` | `7` | `30` | `90` (default: `7`, unit = days)

`useSearchParams` + `router.replace` for URL updates (no full navigation).

---

## File Structure

**New files to create:**

```
app/admin/analytics/page.tsx              Main page — auth guard, layout, URL state
lib/analyticsApi.ts                       Typed fetchers for all Flask analytics endpoints
components/analytics/LiveStatusBar.tsx    Green live bar — polls every 15 s
components/analytics/PeriodFilter.tsx     Today / 7d / 30d / 90d button group
components/analytics/KpiCard.tsx          Stat card with label, value, trend badge
components/analytics/SkeletonCard.tsx     Shimmer placeholder for loading states
components/analytics/tabs/OverviewTab.tsx
components/analytics/tabs/StationsTab.tsx
components/analytics/tabs/SongsTab.tsx
components/analytics/tabs/GenresTab.tsx
components/analytics/tabs/HealthTab.tsx
components/analytics/charts/LineChart.tsx       Recharts responsive line (plays over time)
components/analytics/charts/DonutChart.tsx      Recharts pie/donut (genre, region split)
components/analytics/charts/HBarChart.tsx       Recharts horizontal bar (top stations, artists)
components/analytics/charts/HeatmapGrid.tsx     Custom SVG 24 h × 7 day listener heatmap
```

**Existing files to modify:**

```
app/admin/page.tsx                        Add "Analytics" nav link button → /admin/analytics
lib/api.ts                               Add analyticsRealTime() method (or use analyticsApi.ts)
```

---

## Admin Auth Guard

Same pattern as `app/admin/page.tsx`:

```tsx
const { user, loading } = useAuth();
const router = useRouter();

useEffect(() => {
  if (!loading && !user?.is_admin) router.replace('/');
}, [user, loading, router]);

if (loading || !user?.is_admin) return null;
```

---

## lib/analyticsApi.ts

All Flask analytics endpoints go through this module. Uses the same `fetchWithRefresh` + `credentials: 'include'` pattern as `lib/api.ts`.

```ts
const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BACKEND}${path}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

// Real-time
export function fetchRealTime(): Promise<RealTimeResponse> {
  return get('/analytics/real-time');
}

// Dashboard overview
export function fetchDashboard(days: number): Promise<DashboardResponse> {
  return get(`/analytics/dashboard?days=${days}`);
}

// Trends (top stations growth)
export function fetchTrends(days: number): Promise<TrendsResponse> {
  return get(`/analytics/trends?days=${days}`);
}

// Genres
export function fetchGenres(days: number): Promise<GenresResponse> {
  return get(`/analytics/genres?days=${days}`);
}

// Regions
export function fetchRegions(days: number): Promise<RegionsResponse> {
  return get(`/analytics/regions?days=${days}`);
}

// Station detail (drill-down)
export function fetchStationStats(stationId: number, days: number): Promise<StationStatsResponse> {
  return get(`/analytics/stations/${stationId}/stats?days=${days}`);
}
```

Trending songs come from the existing Next.js endpoint:
```ts
// Already exists in /api/analytics/trending — call directly
export function fetchTrending(hours: number, limit: number): Promise<{ results: TrendingEntry[] }> {
  return fetch(`/api/analytics/trending?hours=${hours}&limit=${limit}`).then(r => r.json());
}
```

All response types must be fully typed (TypeScript interfaces), including nested arrays.

---

## Component Specs

### `LiveStatusBar`

- Polls `fetchRealTime()` every 15 000 ms via `setInterval`
- Always visible above the tab nav
- Shows: pulsing green dot, "N listening now", divider, "N stations live", divider, "N plays today", divider, "Leading: [station] · N listeners", right-aligned "↻ 15s"
- On error: silently keeps stale values (no error state visible in bar)
- Clears interval on unmount

```tsx
// Pulse animation via Tailwind animate-pulse on the dot
// Layout: flex items-center gap-4 px-5 py-2
// Background: linear-gradient matching existing dark theme
```

### `PeriodFilter`

- Button group: Today (1d) | 7 days | 30 days | 90 days
- Active button: indigo background + text; inactive: surface border
- Updates `?period=N` in URL via `router.replace` (shallow)
- Minimum 44×44px touch target

### `KpiCard`

Props: `label: string`, `value: string | number`, `change?: number`, `changeSuffix?: string`, `isLive?: boolean`

- `change > 0` → green `▲ +N%`
- `change < 0` → red `▼ N%`
- `change === 0` → muted `→ No change`
- `isLive` → pulsing indigo dot instead of change badge
- Skeleton variant shown while loading (shimmer via CSS animation)

### `SkeletonCard`

Shimmer placeholder using `animate-pulse` on a rounded div. Used in all tabs while data loads.

---

## Tab Specs

### Tab 1: Overview

**Data:** `fetchDashboard(period)` + `fetchTrending(24, 10)`

**Layout (top → bottom):**

1. **KPI row** (4 cards, grid-cols-4):
   - Live Listeners (from real-time, `isLive: true`)
   - Total Plays — period value with `change` vs prev period
   - Unique Listeners — period value with `change`
   - Avg Session Duration — formatted as `Nm Ns`, with `change`

2. **Trends row** (2 columns, 2fr + 1fr):
   - Left: `LineChart` — plays per day for the period. X-axis: dates. Y-axis: play count. Tooltip shows exact value on hover. Color: `#6366f1`.
   - Right: `DonutChart` — plays by genre. Legend below. 4–5 slices max (group remainder as "Other"). Center label: total plays.

3. **Bottom row** (2 columns, 1fr + 1fr):
   - Left: `HBarChart` — top 5 stations by plays. Horizontal bars. Value labels on right. Color: indigo gradient.
   - Right: Trending songs table — rank, title, artist, play count, avg duration (from `plays` collection). Rows are sortable by play count. Max 10 rows. No pagination needed.

### Tab 2: Stations

**Data:** `fetchDashboard(period)` (top_stations list) + on drill-down: `fetchStationStats(stationId, period)`

**Layout:**

Sortable table with columns:
| Station | Genre | Plays | Unique Listeners | Avg Duration | Growth | Status | Live Now |
|---|---|---|---|---|---|---|---|

- **Plays**, **Unique Listeners**, **Avg Duration**, **Growth** are sortable (click header)
- **Status**: green "● Live" or red "● Offline" pill
- **Live Now**: current listener count from real-time data (matched by station id)
- **Growth**: coloured badge — green if positive, red if negative
- Row click → opens **StationDetailModal**

**StationDetailModal** (slide-up sheet, not a separate page):
- Station name + genre + region header
- Two charts side by side:
  - Left: `LineChart` — daily plays for the period
  - Right: `HeatmapGrid` — 24 h × 7 day listener heatmap (hours on X, days on Y, intensity = play count, indigo gradient)
- KPI mini-row: period plays, unique listeners, avg session, uptime %
- Close button (X) top-right; click outside to dismiss

### Tab 3: Songs & Artists

**Data:** `fetchTrending(hours, 20)` — hours comes from period (1d → 24h, 7d → 168h, 30d → 720h, 90d → 2160h)

**Layout (2 columns):**

Left column — **Top Songs table:**
| Rank | Song / Artist | Play Count | Avg Duration | Stations | Last Seen |
|---|---|---|---|---|---|

- Avg Duration: formatted as `Nm Ns` — comes from `playDuration` average in the `plays` collection
- Stations: comma-separated list of station names where this song was detected
- Last Seen: relative time ("2 hours ago")
- Sortable by Play Count or Avg Duration

Right column — **Top Artists `HBarChart`:**
- Aggregated from trending songs (group by artist, sum play counts)
- Top 10 artists, horizontal bars
- Below chart: "Source: track metadata from live stream detection"

### Tab 4: Genres & Regions

**Data:** `fetchGenres(period)` + `fetchRegions(period)`

**Layout — two sections stacked:**

**Genres section:**
- Left: `DonutChart` — genre share of total plays. 5 slices max. Interactive legend (click to highlight).
- Right: `HBarChart` — genres ranked by plays, with unique listener count as secondary bar (grouped bars or stacked). Labels: total plays + unique listeners.
- Below: stats row — "Best performing genre: Gospel · 8,234 plays · 3.2 avg stations"

**Regions section (identical structure):**
- Left: `DonutChart` — region share
- Right: `HBarChart` — regions ranked
- Below: "Region with most listeners: Nairobi · 1,284 unique"

### Tab 5: Station Health

**Data:** `fetchRealTime()` (live status) + `fetchDashboard(period)` (uptime from snapshots)

**Layout:**

**Status grid** at top — cards for each station:
```
┌─────────────────┐
│ ● Classic 105   │
│ Genre: Pop      │
│ Uptime: 99.2%   │
│ Listeners: 89   │
│ Last: Zetta     │
└─────────────────┘
```
- Green border + "● Live" if online now
- Red border + "● Offline" if `endedAt` not null / no recent snapshot
- Amber border if uptime < 90% (potential issue)
- Grid: `grid-cols-2 md:grid-cols-3 lg:grid-cols-4`

**Detail table** below grid:
| Station | Status | Uptime % | Last Online | Metadata Source | Current Listeners |
|---|---|---|---|---|---|
- Sortable by Uptime % and Status
- "Last Online": relative time for offline stations, "Now" for online
- Metadata Source: badge — "Zetta" (indigo), "ICY" (amber), "Icecast" (blue), "Unknown" (muted)

---

## Charts Spec

### `LineChart` (Recharts)

```tsx
<ResponsiveContainer width="100%" height={120}>
  <RechartsLine data={data}>
    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
    <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
    <Tooltip contentStyle={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }} />
    <Line type="monotone" dataKey="plays" stroke="#6366f1" strokeWidth={2} dot={false} />
    <Area ... fill="url(#areaGrad)" />
  </RechartsLine>
</ResponsiveContainer>
```

Props: `data: { date: string; plays: number }[]`, `color?: string`

### `DonutChart` (Recharts)

```tsx
<PieChart>
  <Pie data={data} innerRadius="60%" outerRadius="80%" dataKey="value">
    {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
  </Pie>
  <Tooltip />
  <Legend />
</PieChart>
```

Props: `data: { name: string; value: number }[]`, `centerLabel?: string`

### `HBarChart` (Recharts)

```tsx
<BarChart layout="vertical" data={data}>
  <XAxis type="number" />
  <YAxis type="category" dataKey="name" width={80} />
  <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
  <Tooltip />
</BarChart>
```

Props: `data: { name: string; value: number }[]`

### `HeatmapGrid` (custom SVG)

24 columns (hours 0–23) × 7 rows (days). Each cell coloured by intensity:
- 0 plays → `var(--color-surface-raised)` (empty)
- Low → `#312e81` (dim indigo)
- High → `#6366f1` (full indigo)

Interpolate: `opacity = Math.min(count / maxCount, 1)` applied to `#6366f1`.

Cell size: 16×16px. On hover: tooltip shows "Wednesday 3 PM — 47 plays".

Props: `data: { hour: number; day: number; count: number }[]`

---

## Navigation Integration

Add an "Analytics" button to `app/admin/page.tsx` in the page header:

```tsx
import Link from 'next/link';
import { BarChart2 } from 'lucide-react';

// In the admin page header area:
<Link href="/admin/analytics"
  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
  style={{ background: 'var(--color-surface-raised)', color: 'var(--color-text-secondary)' }}
>
  <BarChart2 className="w-4 h-4" />
  Analytics
</Link>
```

Add a matching "← Stations" back link on the analytics page header.

---

## Loading & Error States

- **Loading:** All tabs show `SkeletonCard` placeholders in the same grid layout as the real content. Avoids layout shift.
- **Empty data:** Friendly empty state — icon + "No data yet for this period" + suggestion.
- **Error:** Inline error card with "Retry" button that re-fetches. Never shows a broken chart.
- **Live bar error:** Silently keeps stale values. No visible error.

---

## Accessibility (ui-ux-pro-max priority 1)

- All charts have `aria-label` describing the key insight (e.g., `"Line chart: plays peaked Saturday with 4,200 plays"`)
- All `KpiCard` values use `role="status"` so screen readers announce updates
- Color is never the only differentiator — uptime % shown in text alongside colour
- Keyboard: tab/enter navigates table sort headers; `Escape` closes StationDetailModal
- Focus moves to modal on open; returns to trigger row on close
- `prefers-reduced-motion`: skip shimmer animation, skip chart entrance animation

---

## Dependency

```bash
yarn add recharts
```

Recharts is the only new dependency. It is tree-shakeable and bundles only used components.

---

## Spec Self-Review

1. **Placeholder scan:** No TBD or TODO — all sections have concrete specs.
2. **Internal consistency:** URL params (`tab`, `period`) referenced consistently. `fetchTrending` hours-to-period mapping is explicit. `StationDetailModal` uses existing Flask station stats endpoint.
3. **Scope:** One implementation plan can cover this fully — no decomposition needed.
4. **Ambiguity:** Period `1` = "Today" = last 24 hours (not calendar day) — matches Flask endpoint behavior. Drill-down is a modal (not a separate route) — avoids a new page and back-navigation complexity.
