# Graph Report - airwave  (2026-06-13)

## Corpus Check
- 158 files · ~110,138 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1251 nodes · 1992 edges · 94 communities (73 shown, 21 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 80 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `10c1b5e8`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Stream Metadata & Auth Pipeline|Stream Metadata & Auth Pipeline]]
- [[_COMMUNITY_Player Hooks & UX Plans|Player Hooks & UX Plans]]
- [[_COMMUNITY_MongoDB Migration & Analytics|MongoDB Migration & Analytics]]
- [[_COMMUNITY_Password Reset UI|Password Reset UI]]
- [[_COMMUNITY_Project Config & Assets|Project Config & Assets]]
- [[_COMMUNITY_Stations Page UI|Stations Page UI]]
- [[_COMMUNITY_Stations Filters UI|Stations Filters UI]]
- [[_COMMUNITY_Dashboard Layout Brainstorm|Dashboard Layout Brainstorm]]
- [[_COMMUNITY_Password Reset Error States|Password Reset Error States]]
- [[_COMMUNITY_Analytics Dashboard Plans|Analytics Dashboard Plans]]
- [[_COMMUNITY_Architecture & Scalability|Architecture & Scalability]]
- [[_COMMUNITY_Keyboard Shortcuts Design|Keyboard Shortcuts Design]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 97|Community 97]]
- [[_COMMUNITY_Community 102|Community 102]]
- [[_COMMUNITY_Community 108|Community 108]]

## God Nodes (most connected - your core abstractions)
1. `Station` - 43 edges
2. `ApiService` - 32 edges
3. `User` - 31 edges
4. `$()` - 30 edges
5. `Station` - 27 edges
6. `get_stations_col()` - 25 edges
7. `get_users_col()` - 23 edges
8. `useAuth()` - 21 edges
9. `a` - 18 edges
10. `Analytics Dashboard Implementation Plan` - 16 edges

## Surprising Connections (you probably didn't know these)
- `Claude Code Local Permission Allowlist (ui-ux-pro-max skill access)` --conceptually_related_to--> `AirWave Package Manifest (Next.js 14 PWA radio app)`  [AMBIGUOUS]
  .claude/settings.local.json → package.json
- `Yarn 4.15.0 Config (node-modules linker)` --shares_data_with--> `AirWave Package Manifest (Next.js 14 PWA radio app)`  [EXTRACTED]
  .yarnrc.yml → package.json
- `Next.js Logo SVG (template asset)` --conceptually_related_to--> `README - create-next-app bootstrap docs`  [INFERRED]
  public/next.svg → README.md
- `Vercel Logo SVG (template asset)` --conceptually_related_to--> `README - create-next-app bootstrap docs`  [INFERRED]
  public/vercel.svg → README.md
- `UI Snapshot: Set New Password page (AirWave brand)` --references--> `AirWave Radio PWA Manifest - Stream Kenya's best radio stations live`  [INFERRED]
  .playwright-mcp/page-2026-05-30T20-42-52-645Z.yml → public/manifest.json

## Import Cycles
- 1-file cycle: `backend/app/models/station.py -> backend/app/models/station.py`

## Hyperedges (group relationships)
- **Engagement Feature Roadmap (brainstorm 545)** — content_scope_trending_stations, content_scope_now_playing_cards, content_scope_listening_history [EXTRACTED 1.00]
- **Analytics Dashboard Tab Structure (session-1)** — content_tab_contents_overview_tab, content_tab_contents_stations_tab, content_tab_contents_songs_artists_tab, content_tab_contents_genres_regions_tab, content_tab_contents_station_health_tab, content_composite_layout_composite_dashboard [EXTRACTED 1.00]
- **Keyboard Shortcut System Design (brainstorm 1077)** — content_shortcut_areas_player_shortcuts, content_shortcut_areas_search_shortcuts, content_shortcut_areas_discovery_shortcuts, content_shortcut_areas_global_shortcuts, content_discoverability_cheatsheet_overlay, content_discoverability_button_tooltips, content_cheatsheet_design_shortcut_cheatsheet [EXTRACTED 1.00]
- **Song Detection Analytics Flow** — plans_2026_05_25_airwave_improvements_usestreammetadata, plans_2026_05_26_stream_metadata_analytics_play_event_pipeline, plans_2026_05_27_smart_polling_smart_poll_scheduler, plans_2026_05_30_analytics_audience_tab_audience_route [INFERRED 0.85]
- **MongoDB Data Layer** — plans_2026_05_26_stream_metadata_analytics_mongodb_singleton, plans_2026_05_26_realtime_listener_tracking_listenersessiondocument, plans_2026_05_29_mongodb_migration_backend_db_module, plans_2026_05_29_mongodb_migration_counters_collection [INFERRED 0.85]
- **Auth & Security Hardening** — plans_2026_05_28_security_auth_hardening_httponly_cookie_auth, plans_2026_05_28_security_auth_hardening_fetchwithrefresh, plans_2026_05_28_security_auth_hardening_rate_limiter_middleware, specs_2026_05_28_security_auth_hardening_design_token_flow [EXTRACTED 1.00]

## Communities (94 total, 21 thin omitted)

### Community 0 - "Stream Metadata & Auth Pipeline"
Cohesion: 0.28
Nodes (7): Icecast Metadata Proxy Route, useStreamMetadata Hook (Now Playing polling), MongoDB Client Singleton (lib/mongodb.ts), Play Event Pipeline (title-change detection), SnapshotDocument (stationSnapshots collection), Smart End-of-Song Poll Scheduler, Next.js Sliding-Window Rate Limiter (middleware.ts)

### Community 1 - "Player Hooks & UX Plans"
Cohesion: 0.29
Nodes (6): Auto-Reconnect with Exponential Backoff, PWA Support via next-pwa, StationAvatar Component, useAudioPlayer Hook, useFavorites Hook (localStorage + API sync), useSleepTimer Hook

### Community 2 - "MongoDB Migration & Analytics"
Cohesion: 0.24
Nodes (12): getTrending Aggregation, PlayDocument (plays collection), TTL Auto-Purge Indexes, Flask analytics_bp (MongoDB aggregations), backend/app/db.py (PyMongo connection helpers), Counters Collection (auto-increment integer IDs), Plain Python Model Classes (no ORM), stationPlays Collection (app click events) (+4 more)

### Community 3 - "Password Reset UI"
Cohesion: 0.21
Nodes (14): AirWave Kenya's Radio Branding, AirWave App Header (Logo, Tagline, Sign In), Centered Auth Card Layout Pattern, Confirm Password Input Field, Dark Theme Design (Near-Black Background, Purple Accent), Set New Password Gradient CTA Button, New Password Input Field, Password Requirements Hint Text (+6 more)

### Community 4 - "Project Config & Assets"
Cohesion: 0.14
Nodes (14): Claude Code Local Permission Allowlist (ui-ux-pro-max skill access), shadcn/ui Components Config (base-nova style, lucide icons), ESLint Config (next/core-web-vitals), AirWave Package Manifest (Next.js 14 PWA radio app), UI Snapshot: Set New Password page (AirWave brand), UI Snapshot: Live Stations page loading state (AirWave brand), UI Snapshot: Set New Password page, second capture (AirWave brand), UI Snapshot: Nu'Radio rebrand, Live Stations with collapsible Filters toggle (+6 more)

### Community 5 - "Stations Page UI"
Cohesion: 0.19
Nodes (14): AirWave Live Stations Page Screenshot (NU'RADIO), Dark Theme Design (Near-Black Background, High-Contrast Cards), Filters Button, Kenyan Radio Stations Catalog (KISS 100, Capital FM, Radio Maisha, Classic 105, Radio Citizen, Homeboyz Radio, Mulembe FM), Listen Now CTA Button (Per-Station Brand Color), LIVE Status Indicator (Green Dot + Label), Live Stations Header (18 stations, Kenya's Best Radio), NU'RADIO Brand Identity (+6 more)

### Community 6 - "Stations Filters UI"
Cohesion: 0.21
Nodes (13): Dark Theme Design with Purple Primary Accent and Theme Toggle, Genre Filter Chips (All, Hip Hop, Pop, Contemporary, Soul, News, Urban, Talk, Dance), Listen Now CTA Button (Per-Station Accent Color), LIVE Indicator Badge (Green Dot Status), Live Stations View (18 Stations, Kenya's Best Radio), NU'RADIO Brand Header, Region Filter Chips (All, Nairobi, Nakuru), NU'RADIO Live Stations Page Screenshot (+5 more)

### Community 7 - "Dashboard Layout Brainstorm"
Cohesion: 0.20
Nodes (11): Composite Analytics Dashboard Layout (live status bar layer + tab nav layer), Dashboard Layout Option B: Live Monitor (persistent live status bar first), Dashboard Layout Option A: Overview Grid (KPI cards + charts, one page), Engagement Feature: Trending Stations, Analytics Tab 4: Genres & Regions (audience breakdown), Analytics Tab 1: Overview (KPIs + trends landing view), Trending Layout Option B: Badges on existing station cards, Trending Layout Option C: Collapsible sortable Trending Today table (+3 more)

### Community 8 - "Password Reset Error States"
Cohesion: 0.24
Nodes (10): AirWave Header (Logo, Theme Toggle, Sign In), Centered Auth Card Layout, Passwords Match Indicator, Dark Theme with Purple Gradient Accent, Invalid or Expired Reset Link Error Banner, Password Reset Flow, Live Password Strength Checklist, Password Visibility Toggle (+2 more)

### Community 9 - "Analytics Dashboard Plans"
Cohesion: 0.12
Nodes (16): Aggregation Logic, Architecture, Backend, `components/MordernAirwave.tsx`, Data Sources, Endpoint: `GET /api/trending`, Error Handling, Files Changed (+8 more)

### Community 10 - "Architecture & Scalability"
Cohesion: 0.09
Nodes (20): Architecture Refactoring — Implementation Plan, Station Type Consolidation, Task 1: Delete broken prototype and clean up legacy type fields, Task 2: Consolidate duplicate Station type, Task 3: Wire `MordernAirwave` to `useStations` — replace hardcoded data, useStations Wiring (replace mock data), Cache-Control on Stations Endpoint, Scalability — Implementation Plan (+12 more)

### Community 11 - "Keyboard Shortcuts Design"
Cohesion: 0.40
Nodes (5): Shortcut Cheatsheet Overlay Design (Playback / Navigation / App sections), Discoverability Option: ? Cheatsheet Overlay, Global App Shortcuts (? cheatsheet, T theme, Esc dismiss), Player Control Shortcuts (Space, M, arrows for volume/station), Search & Filter Shortcuts (/ or Ctrl+K focus, Esc clear)

### Community 12 - "Community 12"
Cohesion: 0.13
Nodes (19): DEFAULT_GENRE_THEME, GENRE_THEMES, GenreTheme, getGenreTheme(), StationInfo(), StationInfoProps, PlayButton(), PlayButtonProps (+11 more)

### Community 14 - "Community 14"
Cohesion: 0.22
Nodes (6): Props, SkeletonCard(), fetchTrendingNow(), TrendingNowStation, Props, TrendingStrip()

### Community 15 - "Community 15"
Cohesion: 0.13
Nodes (13): inter, metadata, viewport, GlobalShortcuts(), AuthProvider(), ShortcutDef, SHORTCUTS, UseKeyboardShortcutsOptions (+5 more)

### Community 17 - "Community 17"
Cohesion: 0.05
Nodes (39): dependencies, @base-ui/react, class-variance-authority, clsx, lucide-react, media-chrome, mongodb, next (+31 more)

### Community 24 - "Community 24"
Cohesion: 0.22
Nodes (8): AudienceMoversPanel(), LineChart(), Props, AudienceResponse, AudienceSong, AudienceTab(), Props, SortKey

### Community 25 - "Community 25"
Cohesion: 0.07
Nodes (35): AdminPage(), emptyForm(), GENRES, inputStyle, inputStyle, LoginModal(), LoginModalProps, Mode (+27 more)

### Community 26 - "Community 26"
Cohesion: 0.15
Nodes (12): PlayerContext, PlayerContextValue, PlayerProvider(), useAudioPlayer(), UseAudioPlayerOptions, apiPost(), useListeners(), loadIds() (+4 more)

### Community 27 - "Community 27"
Cohesion: 0.08
Nodes (4): get_next_id(), get_users_col(), Atomically increment and return the next integer ID., User

### Community 28 - "Community 28"
Cohesion: 0.09
Nodes (33): GET(), GET(), FlaskHealthResponse, GET(), POST(), GET(), POST(), POST() (+25 more)

### Community 29 - "Community 29"
Cohesion: 0.06
Nodes (33): 1.1 What exists today, 1.2 Usability issues found, 1.3 Benchmark takeaways (adapted for live radio), 2.1 Route map, 2.2 Navigation model, 3.1 Home (mobile), 3.2 Expanded Now Playing (mobile sheet / desktop overlay), 3.3 Station detail page (+25 more)

### Community 30 - "Community 30"
Cohesion: 0.07
Nodes (27): Accessibility (ui-ux-pro-max priority 1), Admin Auth Guard, Analytics Dashboard Implementation Plan, Charts Spec, Component Specs, Dependency, Design System (ui-ux-pro-max), `DonutChart` (Recharts) (+19 more)

### Community 31 - "Community 31"
Cohesion: 0.08
Nodes (26): _parse_set_cookies(), Calling /refresh issues a new refresh cookie (token rotation)., Calling /refresh without a refresh cookie returns 401., Logout clears both access and refresh cookies., Profile returns 401 after logout clears the access cookie., Preflight from an unknown origin must not be reflected back., Preflight from the configured frontend origin is allowed., Login must set HttpOnly cookie; tokens must NOT appear in response body. (+18 more)

### Community 32 - "Community 32"
Cohesion: 0.12
Nodes (16): Analytics Dashboard Implementation Plan, File Map, Task 10: Create SongsTab, Task 11: Create GenresTab, Task 12: Create HealthTab, Task 13: Create main analytics page + navigation, Task 14: End-to-end verification, Task 1: Install recharts (+8 more)

### Community 33 - "Community 33"
Cohesion: 0.17
Nodes (9): ModernAirwave(), useFavorites(), useKeyboardShortcuts(), useRecentStations(), useStationFilter(), LibraryContent(), SearchAndFilters, SearchAndFiltersProps (+1 more)

### Community 34 - "Community 34"
Cohesion: 0.05
Nodes (24): $(), a, b(), deleteCacheAndMetadata(), et, F, G, get() (+16 more)

### Community 36 - "Community 36"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 37 - "Community 37"
Cohesion: 0.10
Nodes (22): ScrollState, useScrollDirection(), useSleepTimer(), TabBar(), TABS, cn(), AudioPlayer(), AudioPlayerProps (+14 more)

### Community 38 - "Community 38"
Cohesion: 0.22
Nodes (7): File Map, Task 1: Backend route `GET /api/analytics/trending-now`, Task 2: Frontend API types and fetcher, Task 3: TrendingStrip component, Task 4: Mount TrendingStrip in MordernAirwave, Trending Stations Implementation Plan, TrendingStrip Component

### Community 39 - "Community 39"
Cohesion: 0.60
Nodes (4): Heartbeat Session System, GET /api/listeners/counts Aggregation Route, ListenerSessionDocument, useListeners Hook

### Community 40 - "Community 40"
Cohesion: 0.10
Nodes (20): AudioPlayer, File Map, heartbeat, join, leave, Placeholder Scan, Real-Time Listener Tracking Implementation Plan, Self-Review (+12 more)

### Community 41 - "Community 41"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 42 - "Community 42"
Cohesion: 0.20
Nodes (7): EMPTY_META, msUntilSongEnd(), parseDurationString(), patchClosePlay(), postPlayEvent(), StoredPlay, StreamMetadata

### Community 43 - "Community 43"
Cohesion: 0.14
Nodes (8): station_detail(), stations_collection(), get_stations_col(), _build_filter(), get_genres(), get_regions(), get_stations(), get_user_favorites()

### Community 44 - "Community 44"
Cohesion: 0.25
Nodes (8): File Map, Placeholder Scan, Self-Review, Smart Polling Implementation Plan, Spec Coverage, Step 1: Read the current file, Task 1: Add Duration Parser + Smart Poll Scheduler, Type Consistency

### Community 45 - "Community 45"
Cohesion: 0.32
Nodes (5): AudienceTab Component, lib/analyticsApi.ts Typed Fetchers, Chart Components (LineChart, DonutChart, HBarChart, HeatmapGrid), LiveStatusBar (15s polling), URL-Synced Tab & Period State

### Community 46 - "Community 46"
Cohesion: 0.07
Nodes (29): Environment variables checklist, fetchWithRefresh Wrapper, File Map, HttpOnly Cookie JWT Delivery, Security & Auth Hardening — Implementation Plan, Task 1: Backend test infrastructure, Task 2: JWT cookie config & CORS lockdown (`backend/app/__init__.py`), Task 3: Login & Register → cookie responses (+21 more)

### Community 47 - "Community 47"
Cohesion: 0.29
Nodes (13): _date_range(), get_audience_stats(), get_dashboard_stats(), get_genre_analytics(), get_realtime_stats(), get_region_analytics(), get_station_stats(), get_trending_now() (+5 more)

### Community 48 - "Community 48"
Cohesion: 0.20
Nodes (8): change_password(), forgot_password(), register(), reset_password(), update_profile(), validate_email(), validate_password(), send_password_reset_email()

### Community 49 - "Community 49"
Cohesion: 0.28
Nodes (11): Lightweight endpoint called by Next.js analytics on metadata poll., record_snapshot(), register_analytics_commands(), ensure_counters(), ensure_indexes(), get_client(), get_counters_col(), get_db() (+3 more)

### Community 50 - "Community 50"
Cohesion: 0.15
Nodes (13): File Map, Placeholder Scan, Self-Review, Spec Coverage, Stream Metadata Analytics Implementation Plan, Task 1: MongoDB Client Singleton, Task 2: Analytics Library Functions, Task 3: Play Event API Route (POST + PATCH) (+5 more)

### Community 51 - "Community 51"
Cohesion: 0.10
Nodes (19): Analytics Audience Tab — Design Spec, `app/admin/analytics/page.tsx`, Approach, Audience Tab Content, `backend/app/db.py`, Backend Changes, `components/analytics/tabs/AudienceTab.tsx`, Data Sources (+11 more)

### Community 52 - "Community 52"
Cohesion: 0.17
Nodes (12): AirWave Feature Improvements Implementation Plan, Existing Assets (do NOT recreate), File Map, Self-Review, Task 1: Wire `MordernAirwave.tsx` to existing hooks, Task 2: Extract `useStationFilter` + `useFavorites` with localStorage, Task 3: `StationAvatar` component, Task 4: Install shadcn + add Slider, Toast, Tooltip (+4 more)

### Community 54 - "Community 54"
Cohesion: 0.25
Nodes (8): Analytics Audience Tab Implementation Plan, File Map, Task 1: Expose `plays` collection from `db.py`, Task 2: Add Flask `/audience` analytics route, Task 3: Add TypeScript types and fetcher for the audience endpoint, Task 4: Create `AudienceTab` component, Task 5: Wire the Audience tab into the analytics page, Task 6: Manual verification

### Community 55 - "Community 55"
Cohesion: 0.15
Nodes (11): KpiCard(), Props, DAYS, HeatmapGrid(), Props, fetchStationStats(), LivePulseResponse, StationStatsResponse (+3 more)

### Community 56 - "Community 56"
Cohesion: 0.18
Nodes (8): Station with declining plays still appears; growth_pct is negative; score stays, Returns empty list and 200 when no recent plays data., Returns up to 5 stations; station with most listeners ranks first., growth_pct is absent from response when plays_yesterday is 0., test_trending_now_empty(), test_trending_now_negative_growth(), test_trending_now_omits_growth_when_no_yesterday(), test_trending_now_returns_ranked_stations()

### Community 57 - "Community 57"
Cohesion: 0.09
Nodes (29): cardStyle, sectionLabel, AudienceInsightsResponse, AudienceMover, AudienceStation, AudienceTimeBucket, DailyStatEntry, DashboardOverview (+21 more)

### Community 58 - "Community 58"
Cohesion: 0.24
Nodes (8): usePlayer(), NowPlayingSheet(), NowPlayingSheetProps, PersistentAudioPlayer(), VolumeControl(), HistoryEntry, RecentTracks(), RecentTracksProps

### Community 59 - "Community 59"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

### Community 60 - "Community 60"
Cohesion: 0.28
Nodes (5): BaseConfig, Exception, APIError, create_app(), register_error_handlers()

### Community 61 - "Community 61"
Cohesion: 0.25
Nodes (8): MetadataQualityPanel(), DashboardResponse, fetchDashboard(), RealTimeResponse, HealthTab(), Props, Props, Props

### Community 62 - "Community 62"
Cohesion: 0.22
Nodes (8): useStationFilter Hook, Inactive Station Filtering, Skeleton Card Loading State (StationGrid), Task 1: Fix station count display during loading, Task 2: Filter inactive stations from grid, Task 3: Replace spinner with skeleton cards, UX Polish — Implementation Plan, KpiCard Component

### Community 63 - "Community 63"
Cohesion: 0.22
Nodes (9): File Map, Keyboard Shortcuts — Implementation Plan, Self-Review, Task 1: `useKeyboardShortcuts` hook, Task 2: `ShortcutCheatsheet` component, Task 3: `SearchAndFilters` — add `forwardRef`, Task 4: `PlayControl` — add `Space` tooltip, Task 5: `VolumeControl` — add `M` tooltip on mute button (+1 more)

### Community 64 - "Community 64"
Cohesion: 0.22
Nodes (9): MongoDB Migration — Implementation Plan, Task 1: Create `backend/app/db.py`, Task 2: Rewrite `backend/app/__init__.py`, Task 3: Rewrite models as plain Python classes, Task 4: Rewrite `backend/app/stations_bp.py`, Task 5: Rewrite `backend/app/auth_bp.py`, Task 6: Rewrite `backend/app/admin_bp.py`, Task 7: Rewrite `backend/app/analytics_bp.py` (+1 more)

### Community 65 - "Community 65"
Cohesion: 0.19
Nodes (9): LiveStatusBar(), AnalyticsPageInner(), Tab, TABS, VALID_PERIODS, PeriodFilter(), PERIODS, Props (+1 more)

### Community 66 - "Community 66"
Cohesion: 0.25
Nodes (8): Flask Deep Health Check, Next.js Error Boundaries (error.tsx + global-error.tsx), Next.js /api/health Aggregation Route, Monitoring — Implementation Plan, Task 1: Deep health check on Flask backend, Task 2: Next.js `/api/health` aggregation route, Task 3: Next.js `app/error.tsx` route-segment error boundary, Task 4: Next.js `app/global-error.tsx` root error boundary

### Community 68 - "Community 68"
Cohesion: 0.17
Nodes (10): SongImpactPanel(), HBarChart(), Props, fetchTrending(), PERIOD_HOURS, TrendingEntry, fmtDuration(), OverviewTab() (+2 more)

### Community 71 - "Community 71"
Cohesion: 0.20
Nodes (9): DonutChart(), PALETTE, Props, fetchGenres(), fetchRegions(), GenreEntry, RegionEntry, GenresTab() (+1 more)

### Community 72 - "Community 72"
Cohesion: 0.47
Nodes (5): chunk(), crc32(), G_END, G_START, makePNG()

### Community 74 - "Community 74"
Cohesion: 0.33
Nodes (6): Architecture, `components/ui/ShortcutCheatsheet.tsx`, `hooks/useKeyboardShortcuts.ts`, `ModernAirwave.tsx` changes, Theme toggle wiring, Tooltips

### Community 75 - "Community 75"
Cohesion: 0.33
Nodes (6): Edge Cases, Files to Create, Files to Modify, Keyboard Shortcuts — Design Spec, Overview, Shortcut Map

### Community 76 - "Community 76"
Cohesion: 0.40
Nodes (4): Insert default stations if the collection is empty., Create admin user if none exists., seed_admin(), seed_stations()

### Community 77 - "Community 77"
Cohesion: 0.50
Nodes (3): ShortcutCheatsheet Modal, useKeyboardShortcuts Hook (11 shortcuts), Input Focus Guard

### Community 81 - "Community 81"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 97 - "Community 97"
Cohesion: 0.40
Nodes (3): config, hits, LIMITS

### Community 102 - "Community 102"
Cohesion: 0.36
Nodes (9): EMPTY, fetchIcecastData(), fetchIcyData(), GET(), isMeaningless(), parseRawTitle(), parseZettaXml(), StreamInfo (+1 more)

### Community 108 - "Community 108"
Cohesion: 0.21
Nodes (11): deslugify(), findStationBySlug(), slugify(), fetchStationBySlug(), generateMetadata(), StationDetail(), StationDetailProps, StationTile() (+3 more)

## Ambiguous Edges - Review These
- `AirWave Package Manifest (Next.js 14 PWA radio app)` → `Claude Code Local Permission Allowlist (ui-ux-pro-max skill access)`  [AMBIGUOUS]
  .claude/settings.local.json · relation: conceptually_related_to

## Knowledge Gaps
- **432 isolated node(s):** `extends`, `Tab`, `TABS`, `VALID_PERIODS`, `GENRES` (+427 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `AirWave Package Manifest (Next.js 14 PWA radio app)` and `Claude Code Local Permission Allowlist (ui-ux-pro-max skill access)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `Station` connect `Community 16` to `Community 33`, `Community 37`, `Community 42`, `Community 108`, `Community 12`, `Community 14`, `Community 15`, `Community 25`, `Community 26`, `Community 28`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `fetchStationBySlug()` connect `Community 108` to `Community 34`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `extends`, `Tab`, `TABS` to the rest of the system?**
  _471 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Project Config & Assets` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Should `Analytics Dashboard Plans` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Should `Architecture & Scalability` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._