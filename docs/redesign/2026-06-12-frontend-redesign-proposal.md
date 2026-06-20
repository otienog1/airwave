# AirWave Frontend Redesign Proposal

**Date:** 2026-06-12
**Scope:** Complete frontend redesign — IA, design system, player experience, discovery, listener & metadata analytics
**Benchmark set:** Spotify, Apple Music, TuneIn, Radio Garden, modern SaaS dashboards (Linear, Vercel)

---

## Part 1 — Analysis of the Existing Application

### 1.1 What exists today

The app is a **single-page station grid** ([components/MordernAirwave.tsx](../../components/MordernAirwave.tsx)) with:

- Sticky header (logo, theme toggle, auth) — [components/layout/Header.tsx](../../components/layout/Header.tsx)
- Search + genre/region filter chips + trending strip — `SearchAndFilters`, `TrendingStrip`
- Station card grid with inline now-playing marquee — `StationCard`, `StationGrid`
- Fixed bottom player bar (avatar, marquee, play, volume, sleep timer) — `AudioPlayer`
- Admin-only analytics dashboard at `/admin/analytics` with 6 tabs (Overview, Audience, Stations, Songs & Artists, Genres & Regions, Station Health)
- Real data pipelines already built: Zetta/Icecast/ICY stream metadata, play-event analytics (`plays`), station snapshots (`stationSnapshots`), heartbeat listener sessions (`listenerSessions`)

**The data layer is ahead of the UI.** Listener counts, song-change detection, per-track play history, and station health are all collected but barely surfaced to listeners.

### 1.2 Usability issues found

| # | Issue | Severity | Evidence |
|---|-------|----------|----------|
| U1 | **Brand identity conflict** — header renders "MBR", manifest says "AirWave Radio", recent screenshots show "NU'RADIO" | High | `Header.tsx:46`, `manifest.json`, `.playwright-mcp/` captures |
| U2 | **No station detail pages / deep links** — the only routable state is `?view=favorites`. Stations cannot be shared, bookmarked, or opened from notifications | High | `app/page.tsx` is the only listener route |
| U3 | **No expanded Now Playing view** — the bottom bar is the entire player. No large artwork, no track history, no station info surface | High | `AudioPlayer.tsx` |
| U4 | **No recently played / listening history UI** — play history is captured in MongoDB but never shown to the listener | High | `plays` collection exists; no UI |
| U5 | **No recommendations** — favorites + trending exist, but nothing personal ("because you listen to Hip Hop…") | Medium | — |
| U6 | **Analytics locked behind admin** — listener-facing stats (live listener counts, trending songs) are public-interest data hidden in `/admin/analytics` | Medium | `AnalyticsPageInner` redirects non-admins |
| U7 | **Heart/favorite tap target ~28px** — below the 44px minimum | Medium | `StationCard.tsx:113-120` (`p-1.5` + 16px icon) |
| U8 | **Emoji as icon** (`📻 All` filter button) | Low | `MordernAirwave.tsx:174` |
| U9 | **Mobile volume popup is a workaround** — rotated range input in a positioned popup; standard pattern is to omit volume UI on touch (hardware buttons) and show it only on pointer devices | Low | `VolumeControl.tsx` |
| U10 | **Two parallel theming systems** — custom `--color-*` vars (used) and shadcn `oklch` tokens (mostly unused, greyscale defaults). Chart colors don't come from tokens | Medium | `globals.css:7-107` |
| U11 | **`GENRE_COLORS` duplicated** in at least 3 components with diverging values | Medium | `StationCard.tsx`, `StationInfo.tsx` |
| U12 | **Inline `style={}` everywhere** instead of utility classes/tokens — inconsistent hover states implemented with `onMouseEnter` handlers | Medium | `Header.tsx:122-149` etc. |
| U13 | **No dynamic artwork** — initials-only avatars; when a station has no logo the entire UI is text | Medium | `StationAvatar` |
| U14 | **PWA icons 404** — manifest references `/icons/icon-192.png`, `/icons/icon-512.png`; neither exists | High (PWA install broken) | console errors in production |
| U15 | **GSAP imported for 220ms fade-ins** — ~25KB gzip for what CSS keyframes already do elsewhere in the same file | Low | `StationCard.tsx`, `StationInfo.tsx` |

### 1.3 Benchmark takeaways (adapted for live radio)

| Pattern | Source | Adaptation for radio |
|---------|--------|---------------------|
| Persistent mini-player → tap to expand full-screen Now Playing | Spotify, Apple Music | Same; radio version emphasizes station brand + live badge + recent tracks instead of seek bar |
| Color-adaptive UI (artwork tints the player) | Apple Music | Extract accent from station logo / genre seed → tint expanded player + cards |
| "Heavy rotation" / personalized rows | Spotify Home | "Jump back in" (recent sessions), "Because you like {genre}", "Popular in {region}" |
| Live badge + listener count as social proof | TuneIn, Twitch | "● LIVE · 1.2k listening" on cards and player — we already have this data |
| Horizontal scroll shelves per category | All three | Replace single grid with shelved Home: Trending, Recent, Favorites, per-genre shelves |
| Public charts page | Spotify Charts | "Top songs on Kenyan radio this week" — `getTrending()` already computes this |
| Real-time ops dashboard: KPI cards + live sparklines | Vercel/Linear dashboards | Keep 6-tab structure, add real-time pulse view + per-song listener impact |

---

## Part 2 — Updated Information Architecture

### 2.1 Route map

```
/                       Home (Listen) — shelves: Hero Now Playing, Trending, Recently
                        Played, Favorites, Browse by Genre, All Stations
/station/[slug]         Station detail — large branding, live now-playing, recent
                        tracks (from plays), listener sparkline, similar stations
/charts                 Public charts — top songs/artists across Kenyan radio
                        (period filter: today / week / month)
/search                 Full-screen search (mobile) / inline overlay (desktop)
/library                Favorites + listening history (auth required)
/analytics              Admin dashboard (existing 6 tabs, redesigned layouts)
/admin                  Station management (existing)
```

Player state is **overlay, not route**: mini-player (persistent) ⇄ expanded Now Playing sheet. Deep link `/station/[slug]?play=1` auto-starts the stream (after a user gesture per autoplay policy).

### 2.2 Navigation model

- **Mobile:** bottom tab bar — `Listen · Charts · Search · Library` (4 tabs, icon+label), mini-player docked above it. Expanded player slides over everything.
- **Desktop:** slim left sidebar with the same 4 destinations + station shelf scroll; player remains a bottom bar with an expand control.
- Back behavior: expanded player closes on Esc/back-swipe without losing scroll position.

---

## Part 3 — Wireframes & Component Hierarchy

### 3.1 Home (mobile)

```
┌─────────────────────────────┐
│ ◉ AirWave        ◐  👤      │  Header: brand, theme, auth
├─────────────────────────────┤
│ ╔═════════════════════════╗ │
│ ║  NOW PLAYING (hero)     ║ │  Only when a station is active:
│ ║  [art 96px] Capital FM  ║ │  artwork, station, track marquee,
│ ║  ♪ Maandy — Bad Gyal    ║ │  ● LIVE · 1.2k listening
│ ╚═════════════════════════╝ │
│ Trending ▸                  │  horizontal shelf, 2.5 cards visible
│ ⟨ [card][card][card] ⟩      │
│ Jump back in ▸              │  recent sessions shelf
│ ⟨ [card][card] ⟩            │
│ Browse                      │
│ [Pop][Hip Hop][News][Talk]  │  genre chips → filtered grid
│ All stations                │
│ [station row]               │  compact rows (not big cards):
│ [station row]               │  art · name · ♪ track · listeners · ▶
├─────────────────────────────┤
│ [art] Capital FM  ♪ track ▶ │  Mini-player (tap = expand)
├─────────────────────────────┤
│  Listen  Charts Search Lib  │  Bottom tabs
└─────────────────────────────┘
```

### 3.2 Expanded Now Playing (mobile sheet / desktop overlay)

```
┌─────────────────────────────┐
│ ▾                        ⋮  │  collapse, overflow (sleep timer, share)
│                             │
│      ┌───────────────┐      │  280px artwork; genre-gradient
│      │   station art  │     │  backdrop blurred behind
│      └───────────────┘      │
│   CAPITAL FM   ● LIVE       │
│   98.4 FM · Nairobi · Pop   │
│   ♪ MAANDY — BAD GYAL       │  marquee if overflow
│   ▂▅▇▅▂ 1,243 listening     │  live count + equalizer
│                             │
│   ⏮prev-station ▶/⏸ next⏭   │  station skip = prev/next in list
│   🔊 ───────●──             │  volume (pointer devices only)
│                             │
│   Recently on this station  │
│   ♪ Track A      3 min ago  │  from plays collection
│   ♪ Track B     12 min ago  │
└─────────────────────────────┘
```

### 3.3 Station detail page

```
┌──────────────────────────────────────────┐
│ ← back                                   │
│ [art 128] CAPITAL FM        [♥] [▶ Play] │
│ ● LIVE · 98.4 FM · Pop · Nairobi         │
│ 1,243 listening now                      │
│ ── listener sparkline (24h) ──           │  from stationSnapshots
│ Recent tracks                            │  from plays
│ ♪ ...                                    │
│ Similar stations                         │  same genre/region shelf
└──────────────────────────────────────────┘
```

### 3.4 Component hierarchy (target)

```
app/layout.tsx
└─ Providers (Theme, Google, Auth, Player)
   ├─ AppShell
   │  ├─ Sidebar (desktop) / TabBar (mobile)     [new]
   │  ├─ Header (brand, search trigger, auth)    [simplified]
   │  └─ <page>
   ├─ MiniPlayer                                 [evolved AudioPlayer]
   │  ├─ StationArt (artwork + fallback gradient)[new, replaces StationAvatar]
   │  ├─ TrackMarquee                            [extracted, CSS-only]
   │  ├─ PlayControl · VolumeControl(pointer-only) · SleepTimer
   │  └─ ListenerBadge                           [new]
   └─ NowPlayingSheet                            [new]
      ├─ StationArt(lg) · LiveBadge · TrackMarquee
      ├─ StationSkipControls
      └─ RecentTracksList                        [new, GET /api/analytics/station/[id]]

pages
├─ Home: HeroNowPlaying · Shelf(Trending|Recent|Favorites) · GenreChips · StationList
├─ StationDetail: StationHero · ListenerSparkline · RecentTracksList · SimilarShelf
├─ Charts: PeriodFilter · ChartList(songs|artists|stations)
└─ Analytics (admin): LivePulse · 6 tabs (existing, relaid)
```

Shared primitives: `Shelf`, `StationRow`, `StationCard(sm|lg)`, `LiveBadge`, `ListenerCount`, `Sparkline`, `Marquee`, `SkeletonRow`.

---

## Part 4 — Dashboard Layouts (Listener & Metadata Analytics)

### 4.1 Live Pulse (new default tab)

Real-time monitoring built on data already collected (`listenerSessions` 20s heartbeats, `stationSnapshots` 15s, `fetchRealTime` 15s poll):

```
┌────────────────────────────────────────────────────────────┐
│ ● LIVE   42 in-app listeners · 6 stations active · 18 OK   │  status strip
├──────────────┬──────────────┬──────────────┬───────────────┤
│ Live now     │ Peak today   │ Avg session  │ Retention 7d  │  KPI cards w/
│ 42  ▲ +8     │ 67 @ 19:42   │ 23 min       │ 31% return    │  sparklines
├──────────────┴──────────────┴──────────────┴───────────────┤
│ Listeners by station (live, auto-refresh 15s)              │
│ Capital FM   ████████████████ 18   ♪ Maandy — Bad Gyal     │  bar + current
│ Kiss 100     █████████ 11          ♪ Burna Boy — Higher    │  song inline
│ Classic 105  ██████ 7              ♪ Sade — Smooth Op.     │
├────────────────────────────────────────────────────────────┤
│ Session feed (live)            │ Song-change impact        │
│ 19:42 join Capital FM (Nairobi)│ Track ended → Δ listeners │
│ 19:41 leave Kiss 100  (12 min) │ Bad Gyal    +3 during play│
└────────────────────────────────┴───────────────────────────┘
```

### 4.2 Audience tab (historical)

- **Listener trend** line chart, period filter 24h/7d/30d/90d (from `stationSnapshots` + `listenerSessions`)
- **Peak concurrent** per day heatmap (hour × weekday) — already have `HeatmapGrid`
- **Growth indicators**: WoW Δ per station, sorted movers list
- **Geographic split**: region of station as proxy now; listener geo when IP-region lands (flagged future)
- **Retention**: returning sessionIds per week cohort

### 4.3 Songs & metadata tab (upgraded)

- Most-played songs/artists (exists) **plus listener-weighted engagement**: avg concurrent listeners while track aired = join `plays` (startTime, durationSeconds) × `listenerSessions` heartbeats
- **Listener Δ on song change**: for each play event, listeners at start vs end → "songs that grow/lose audience" leaderboard
- **Metadata quality panel**: % polls returning title, per-source breakdown (zetta/icecast/icy), stale-metadata stations — from `lastMetaSource` snapshots

All charts: legends, tooltips, `tabular-nums`, color + shape encoding (not color alone), `aria-label` summaries.

---

## Part 5 — Reusable Design System

### 5.1 Decide the brand (blocking)

Pick **one** name/wordmark (AirWave, MBR, or NU'RADIO) and apply to header, `document.title`, manifest, OG tags. The proposal assumes **AirWave** below; swap freely.

### 5.2 Tokens (consolidate to one system)

Replace the dual `--color-*` + shadcn-oklch setup with a single semantic scale, mapped into Tailwind config (no inline hex in components):

```css
:root {
  /* surfaces */
  --bg: #f5f6fa;            --surface: #ffffff;    --surface-2: #eef0f7;
  /* text */
  --text-1: #14151c;        --text-2: #5b5f7a;     --text-3: #9094ae;
  /* brand */
  --brand: #6366f1;         --brand-2: #8b5cf6;    /* gradient pair */
  /* status */
  --live: #22c55e;  --error: #ef4444;  --warn: #f59e0b;
  /* charts (sequential, color-blind safe) */
  --chart-1: #6366f1; --chart-2: #22d3ee; --chart-3: #f59e0b;
  --chart-4: #ec4899; --chart-5: #94a3b8;
  /* elevation */
  --shadow-1: 0 1px 3px rgb(0 0 0 / .06);
  --shadow-2: 0 8px 24px rgb(0 0 0 / .10);
  /* motion */
  --ease-out: cubic-bezier(.16,1,.3,1);
  --dur-fast: 150ms; --dur-base: 220ms; --dur-slow: 320ms;
  --radius-sm: 8px; --radius-md: 12px; --radius-lg: 16px;
}
.dark { /* same keys, dark values (desaturated, not inverted) */ }
```

**Genre accents** become a single exported map `lib/genreTheme.ts` `{ accent, glow, gradient }` — one source of truth consumed by cards, player, detail pages, dynamic artwork.

### 5.3 Typography

Inter (existing). Scale: `12 / 14 / 16 (body) / 18 / 22 / 28 / 36`. Body ≥16px on mobile (prevents iOS zoom). `tabular-nums` for counts, frequencies, timers. Line-height 1.5 body, 1.2 headings.

### 5.4 Spacing, layout

4px base scale. Breakpoints `390 / 768 / 1024 / 1440`. Content max-width `7xl`; analytics `screen-2xl`. `min-h-dvh` not `100vh`. Fixed bars reserve space via `padding-bottom: calc(var(--player-h) + env(safe-area-inset-bottom))`.

### 5.5 Core components & states

Every interactive component defines: default / hover / active(`scale-[0.97]`) / focus-visible (2px brand ring) / disabled (opacity .45) / loading. Touch targets ≥44×44px (fix heart button: `p-3` minimum or 44px hit-area extension).

**Dynamic artwork** (`StationArt`): if `logo_url` → `next/image`; else deterministic gradient from station name hash over genre accent pair + initials, optional subtle waveform pattern. Used at 40/64/96/128/280px.

### 5.6 Motion

- Micro-interactions 150–220ms ease-out; exits ~60% of enter duration
- Sheet/expand transitions: shared-element feel (mini-player art scales up into sheet), `transform/opacity` only
- Marquee: pure CSS (existing keyframes), pause on `:hover`/`:focus-within`
- All animation wrapped in `@media (prefers-reduced-motion: reduce)` overrides
- **Remove GSAP**: every current usage (fade/slide ≤300ms) is expressible in CSS; saves ~25KB gzip

---

## Part 6 — Accessibility Recommendations

1. **Touch targets:** heart (28px→44px), filter chips ≥40px height, volume thumb hit area
2. **Focus:** `:focus-visible` ring tokens on every control; skip-to-content link; focus trap + restore in modals/sheet (verify existing `Modal.tsx`)
3. **Screen readers:** `aria-live="polite"` region announcing track changes ("Now playing: … on Capital FM"); `aria-pressed` on play/favorite toggles; named landmarks (`main`, `nav`)
4. **Live semantics:** LIVE badge keeps text + dot (✓ already); listener counts get `aria-label="1,243 people listening"`
5. **Contrast:** audit `--text-3`/`--color-text-muted` (`#50546a` on `#0a0b0f` ≈ 3.9:1 — fails for 12px text); raise to ≥4.5:1; verify genre accents on dark surfaces
6. **Replace emoji icons** with Lucide SVGs (`📻` → `<Radio/>`)
7. **Keyboard:** existing shortcuts kept; add `?` cheatsheet discoverability hint; Esc closes sheet; tab order = visual order
8. **Media Session API:** lock-screen/notification controls with station artwork (also a UX win)
9. `prefers-reduced-motion`: disable marquee auto-scroll (show truncated + tooltip), waveform animation, shimmer

---

## Part 7 — Performance Recommendations

1. **Drop GSAP** → CSS animations (−25KB gzip client JS)
2. **`next/image`** for station logos with `sizes`; width/height reserved (CLS &lt; 0.1)
3. **Code-split** analytics: `dynamic(() => import('…/AnalyticsPage'))` — chart code stays out of the listener bundle; same for `NowPlayingSheet` (idle prefetch)
4. **Memoize grid rows** (`React.memo(StationRow)`) — currently every 15s metadata poll re-renders all 18 cards; with shelves+rows this matters more
5. **Single polling coordinator:** one `usePolling` scheduler multiplexing metadata (15s/smart), listener counts (15s), realtime (15s) → aligned ticks, one wake-up; pause all polls on `document.visibilitychange` (battery + server load)
6. **HTTP caching:** `s-maxage=15, stale-while-revalidate` already on stream-metadata ✓ — replicate on `listeners/counts` and trending
7. **Skeletons** for shelves and analytics (extend existing `SkeletonCard`); reserve space, no spinner-only states
8. **Font:** Inter already `display:swap` ✓; preload only the weights used (400/500/600/700 → audit if 700 needed)
9. **Fix PWA icons** (192/512 + maskable) — unblocks install prompt; precache shell via existing next-pwa
10. Target: LCP &lt; 2.0s on 4G (hero shelf is text+small images), INP &lt; 200ms, CLS &lt; 0.1

---

## Part 8 — Implementation Plan (prioritized)

### Phase 0 — Foundations (unblocks everything)
| # | Task | Files |
|---|------|-------|
| 0.1 | Brand decision applied everywhere | `Header`, `layout.tsx` metadata, `manifest.json`, `PlayerContext` title |
| 0.2 | Token consolidation: one semantic scale wired into `tailwind.config.ts`; delete unused oklch block; migrate inline styles in Header/Cards to classes | `globals.css`, `tailwind.config.ts` |
| 0.3 | `lib/genreTheme.ts` single genre-accent map; remove duplicates | `StationCard`, `StationInfo`, new lib |
| 0.4 | PWA icons (192/512/maskable) + favicon set | `public/icons/` |
| 0.5 | Remove GSAP → CSS keyframes | `StationCard`, `StationInfo`, `package.json` |
| 0.6 | A11y quick wins: 44px targets, focus-visible tokens, emoji→SVG, muted-text contrast bump | various |

### Phase 1 — Player experience (highest listener impact)
| # | Task |
|---|------|
| 1.1 | `StationArt` with deterministic gradient fallback (replaces initials-only avatar) |
| 1.2 | `NowPlayingSheet`: expanded player (mobile full-screen sheet, desktop overlay), genre-tinted backdrop, station skip prev/next |
| 1.3 | Recent tracks in sheet via existing `GET /api/analytics/station/[id]` |
| 1.4 | Media Session API (artwork, play/pause/next-station on lock screen) |
| 1.5 | `aria-live` track announcements; reduced-motion marquee fallback |
| 1.6 | Volume: pointer-devices-only; remove rotated-popup hack |

### Phase 2 — IA & discovery
| # | Task |
|---|------|
| 2.1 | `/station/[slug]` detail pages (deep links, OG tags per station) |
| 2.2 | Home shelves: Hero Now Playing, Trending (exists), Jump Back In (localStorage sessions), Favorites, genre shelves; grid → compact `StationRow` list |
| 2.3 | Mobile bottom tab bar + desktop sidebar (`AppShell`) |
| 2.4 | `/charts` public page on `getTrending()` |
| 2.5 | "Similar stations" shelf (genre/region heuristic) |
| 2.6 | `/library`: favorites + listening history UI |

### Phase 3 — Analytics dashboards
| # | Task |
|---|------|
| 3.1 | Live Pulse tab (KPI cards + live station bars + session feed) on existing realtime endpoints |
| 3.2 | Audience upgrades: peak tracking, WoW growth, retention cohorts |
| 3.3 | Song-change listener-impact pipeline (join plays × sessions) + leaderboard UI |
| 3.4 | Metadata quality panel (source mix, stale stations) |
| 3.5 | Chart a11y pass + chart color tokens |

### Phase 4 — Polish & measure
- Polling coordinator + visibility pause; bundle audit; Lighthouse/axe CI budget; recommendation shelf v1 ("Because you listen to …" from play history genres)

**Sequencing rationale:** P0 is cheap and removes drag from every later task; P1 changes what listeners feel most (the player is the product in a radio app); P2 makes the app shareable/discoverable (deep links are also required for Media Session and notifications); P3 monetizes the data layer you already built; P4 hardens.

---

## Success metrics

- Session length (already tracked via `listenerSessions`) — expect ↑ from expanded player + recents
- Return rate (sessionId cohorts) — expect ↑ from library/history + PWA install fix
- Stations-per-session (skip controls) and favorite conversions
- Web vitals: LCP < 2.0s, INP < 200ms, CLS < 0.1; bundle −25KB+ (GSAP) and analytics chunk split out
