# Graph Report - .  (2026-06-20)

## Corpus Check
- 191 files · ~116,965 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1135 nodes · 1970 edges · 103 communities (66 shown, 37 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 90 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Workbox PWA Runtime|Workbox PWA Runtime]]
- [[_COMMUNITY_Admin & Analytics Dashboard|Admin & Analytics Dashboard]]
- [[_COMMUNITY_Next.js API Routes|Next.js API Routes]]
- [[_COMMUNITY_Layout & Navigation Hooks|Layout & Navigation Hooks]]
- [[_COMMUNITY_Package Dependencies|Package Dependencies]]
- [[_COMMUNITY_Analytics Insight Panels|Analytics Insight Panels]]
- [[_COMMUNITY_Design System & Redesign Docs|Design System & Redesign Docs]]
- [[_COMMUNITY_User Auth & Favorites (Flask)|User Auth & Favorites (Flask)]]
- [[_COMMUNITY_Genre Theme System|Genre Theme System]]
- [[_COMMUNITY_Flask Station Model|Flask Station Model]]
- [[_COMMUNITY_Auth Test Suite|Auth Test Suite]]
- [[_COMMUNITY_API Service Client|API Service Client]]
- [[_COMMUNITY_Tailwind  Alias Config|Tailwind / Alias Config]]
- [[_COMMUNITY_KPI Cards & Charts|KPI Cards & Charts]]
- [[_COMMUNITY_Metadata Quality & Skeleton|Metadata Quality & Skeleton]]
- [[_COMMUNITY_Flask Admin & Station Blueprint|Flask Admin & Station Blueprint]]
- [[_COMMUNITY_Player Context & Audio Hook|Player Context & Audio Hook]]
- [[_COMMUNITY_JWT Auth Blueprint|JWT Auth Blueprint]]
- [[_COMMUNITY_Player Context & Slug Lib|Player Context & Slug Lib]]
- [[_COMMUNITY_Stream Metadata Hook|Stream Metadata Hook]]
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
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 93|Community 93]]
- [[_COMMUNITY_Community 94|Community 94]]
- [[_COMMUNITY_Community 95|Community 95]]
- [[_COMMUNITY_Community 97|Community 97]]
- [[_COMMUNITY_Community 98|Community 98]]
- [[_COMMUNITY_Community 99|Community 99]]
- [[_COMMUNITY_Community 101|Community 101]]
- [[_COMMUNITY_Community 102|Community 102]]

## God Nodes (most connected - your core abstractions)
1. `Station` - 45 edges
2. `User` - 34 edges
3. `ApiService` - 33 edges
4. `$()` - 30 edges
5. `Station` - 29 edges
6. `get_stations_col()` - 26 edges
7. `get_users_col()` - 23 edges
8. `useAuth()` - 23 edges
9. `getGenreTheme()` - 19 edges
10. `a` - 18 edges

## Surprising Connections (you probably didn't know these)
- `15 usability issues found (U1–U15): brand conflict, no station detail pages, no Now Playing expand, no history UI, analytics locked, small touch targets, emoji icons, dual theming, GENRE_COLORS duplication, inline styles, no dynamic artwork, PWA icons 404, GSAP overhead` --references--> `Station`  [INFERRED]
  docs/redesign/2026-06-12-frontend-redesign-proposal.md → types/Station.ts
- `generate-icons.mjs — PWA icon generator script` --writes--> `icon-192.png — PWA app icon 192×192, indigo-violet gradient, white radio-broadcast glyph (two arcs + dot)`  [EXTRACTED]
  scripts/generate-icons.mjs → public/icons/icon-192.png
- `generate-icons.mjs — PWA icon generator script` --writes--> `icon-512.png — PWA app icon 512×512, indigo-violet gradient, white radio-broadcast glyph (two arcs + dot), same design as 192`  [EXTRACTED]
  scripts/generate-icons.mjs → public/icons/icon-512.png
- `generate-icons.mjs — PWA icon generator script` --writes--> `icon-maskable-192.png — PWA maskable icon 192×192, same gradient+glyph but glyph scaled to 78% safe zone for adaptive icon clipping`  [EXTRACTED]
  scripts/generate-icons.mjs → public/icons/icon-maskable-192.png
- `generate-icons.mjs — PWA icon generator script` --writes--> `icon-maskable-512.png — PWA maskable icon 512×512, same gradient+glyph scaled to safe zone`  [EXTRACTED]
  scripts/generate-icons.mjs → public/icons/icon-maskable-512.png

## Import Cycles
- 1-file cycle: `backend/app/models/station.py -> backend/app/models/station.py`

## Hyperedges (group relationships)
- **Keyboard Shortcut System Design (brainstorm 1077)** — content_shortcut_areas_player_shortcuts, content_shortcut_areas_search_shortcuts, content_shortcut_areas_discovery_shortcuts, content_shortcut_areas_global_shortcuts, content_discoverability_cheatsheet_overlay, content_discoverability_button_tooltips, content_cheatsheet_design_shortcut_cheatsheet [EXTRACTED 1.00]
- **Engagement Feature Roadmap (brainstorm 545)** — content_scope_trending_stations, content_scope_now_playing_cards, content_scope_listening_history [EXTRACTED 1.00]
- **Analytics Dashboard Tab Structure (session-1)** — content_tab_contents_overview_tab, content_tab_contents_stations_tab, content_tab_contents_songs_artists_tab, content_tab_contents_genres_regions_tab, content_tab_contents_station_health_tab, content_composite_layout_composite_dashboard [EXTRACTED 1.00]
- **Song Detection Analytics Flow** — plans_2026_05_25_airwave_improvements_usestreammetadata, plans_2026_05_26_stream_metadata_analytics_play_event_pipeline, plans_2026_05_27_smart_polling_smart_poll_scheduler, plans_2026_05_30_analytics_audience_tab_audience_route [INFERRED 0.85]
- **Auth & Security Hardening** — plans_2026_05_28_security_auth_hardening_httponly_cookie_auth, plans_2026_05_28_security_auth_hardening_fetchwithrefresh, plans_2026_05_28_security_auth_hardening_rate_limiter_middleware, specs_2026_05_28_security_auth_hardening_design_token_flow [EXTRACTED 1.00]
- **MongoDB Data Layer** — plans_2026_05_26_stream_metadata_analytics_mongodb_singleton, plans_2026_05_26_realtime_listener_tracking_listenersessiondocument, plans_2026_05_29_mongodb_migration_backend_db_module, plans_2026_05_29_mongodb_migration_counters_collection [INFERRED 0.85]
- **Listener Session Lifecycle** — listeners_join_route_post, listeners_heartbeat_route_post, listeners_leave_route_post, listeners_counts_route_get [EXTRACTED 1.00]
- **Analytics Data Pipeline** — analytics_play_event_route_post, analytics_snapshot_route_post, analytics_trending_route_get [INFERRED 0.85]
- **Analytics Tab Components** — tabs_audiencetab_audiencetab, tabs_overviewtab_overviewtab, tabs_songstab_songstab, tabs_stationstab_stationstab, tabs_healthtab_healthtab [INFERRED 0.85]

## Communities (103 total, 37 thin omitted)

### Community 0 - "Workbox PWA Runtime"
Cohesion: 0.05
Nodes (24): $(), a, b(), deleteCacheAndMetadata(), et, F, G, get() (+16 more)

### Community 1 - "Admin & Analytics Dashboard"
Cohesion: 0.06
Nodes (43): AnalyticsPage, AnalyticsPageInner, AdminPage(), emptyForm(), GENRES, inputStyle, AnalyticsPageInner(), GET /api/analytics/trending (+35 more)

### Community 2 - "Next.js API Routes"
Cohesion: 0.08
Nodes (37): GET(), GET(), FlaskHealthResponse, GET(), POST(), GET(), POST(), POST() (+29 more)

### Community 3 - "Layout & Navigation Hooks"
Cohesion: 0.08
Nodes (34): ScrollState, useScrollDirection(), useSleepTimer(), TabBar(), TABS, cn(), AudioPlayer(), AudioPlayerProps (+26 more)

### Community 4 - "Package Dependencies"
Cohesion: 0.05
Nodes (39): dependencies, @base-ui/react, class-variance-authority, clsx, lucide-react, media-chrome, mongodb, next (+31 more)

### Community 5 - "Analytics Insight Panels"
Cohesion: 0.07
Nodes (34): cardStyle, sectionLabel, AudienceInsightsResponse, AudienceMover, AudienceResponse, AudienceSong, AudienceStation, AudienceTimeBucket (+26 more)

### Community 6 - "Design System & Redesign Docs"
Cohesion: 0.06
Nodes (35): Design system decisions: single semantic token scale, genreTheme.ts single source, remove dual --color-*/oklch setup, remove GSAP, AirWave Frontend Redesign Proposal (2026-06-12) — analysis, IA, wireframes, design system, a11y, performance, implementation plan, Implementation phases: P0 Foundations, P1 Player Experience, P2 IA & Discovery, P3 Analytics Dashboards, P4 Polish, Live Pulse analytics tab design: KPI cards, station listener bars, session feed, song-change impact panel — all from existing realtime endpoints, Navigation model: mobile bottom tab bar (Listen/Charts/Search/Library) + desktop left sidebar; player is overlay not route, Proposed route map: / Home, /station/[slug], /charts, /search, /library, /analytics, /admin, 15 usability issues found (U1–U15): brand conflict, no station detail pages, no Now Playing expand, no history UI, analytics locked, small touch targets, emoji icons, dual theming, GENRE_COLORS duplication, inline styles, no dynamic artwork, PWA icons 404, GSAP overhead, MBR Radio Complete Frontend Redesign Implementation Plan (2026-06-13) — 4-phase agentic task plan with checkbox steps (+27 more)

### Community 7 - "User Auth & Favorites (Flask)"
Cohesion: 0.09
Nodes (6): google_auth(), get_users_col(), toggle_favorite(), Create admin user if none exists., seed_admin(), User

### Community 8 - "Genre Theme System"
Cohesion: 0.10
Nodes (24): DEFAULT_GENRE_THEME, DEFAULT_GENRE_THEME, GENRE_THEMES, GenreTheme, GENRE_THEMES map, getGenreTheme(), StationInfoProps, getGenreTheme usage in StationArt (+16 more)

### Community 9 - "Flask Station Model"
Cohesion: 0.08
Nodes (4): BaseConfig (legacy SQLAlchemy config, superseded by MongoDB), datetime, Station, StationService (legacy SQLAlchemy service, unused by current MongoDB routes)

### Community 10 - "Auth Test Suite"
Cohesion: 0.08
Nodes (26): _parse_set_cookies(), Calling /refresh issues a new refresh cookie (token rotation)., Calling /refresh without a refresh cookie returns 401., Logout clears both access and refresh cookies., Profile returns 401 after logout clears the access cookie., Preflight from an unknown origin must not be reflected back., Preflight from the configured frontend origin is allowed., Login must set HttpOnly cookie; tokens must NOT appear in response body. (+18 more)

### Community 11 - "API Service Client"
Cohesion: 0.16
Nodes (4): ApiService, fetchWithRefresh(), Station, Station fields: id, name, description, url, logo_url, website, genre, region, language, frequency, is_active, is_live, current_listeners, total_plays, rating, favorites_count, created_at, updated_at

### Community 12 - "Tailwind / Alias Config"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 13 - "KPI Cards & Charts"
Cohesion: 0.19
Nodes (14): AudienceMoversPanel(), RetentionPanel(), KpiCard(), Props, HBarChart(), Props, LineChart(), Props (+6 more)

### Community 14 - "Metadata Quality & Skeleton"
Cohesion: 0.15
Nodes (16): MetadataQualityPanel(), Props, SkeletonCard(), DAYS, HeatmapGrid(), Props, DashboardResponse, fetchDashboard() (+8 more)

### Community 15 - "Flask Admin & Station Blueprint"
Cohesion: 0.14
Nodes (13): admin_required(), station_detail(), stations_collection(), get_stations_col(), _build_filter(), get_genres(), get_regions(), get_stations() (+5 more)

### Community 16 - "Player Context & Audio Hook"
Cohesion: 0.19
Nodes (13): MediaSession API integration, PlayerContextValue, PlayerProvider(), UseAudioPlayerOptions, loadIds(), pushRecentStation(), useRecentStations(), Module-level station cache (60s TTL) (+5 more)

### Community 17 - "JWT Auth Blueprint"
Cohesion: 0.16
Nodes (12): JWTManager singleton (flask-jwt-extended), change_password(), Cookie-based JWT auth pattern (HttpOnly, no body tokens), forgot_password(), login(), register(), reset_password(), update_profile() (+4 more)

### Community 18 - "Player Context & Slug Lib"
Cohesion: 0.20
Nodes (13): PlayerContext, usePlayer(), deslugify(), findStationBySlug(), slugify(), fetchStationBySlug(), generateMetadata(), findStationBySlug usage (+5 more)

### Community 19 - "Stream Metadata Hook"
Cohesion: 0.12
Nodes (14): EMPTY_META, msUntilSongEnd(), parseDurationString(), patchClosePlay(), postPlayEvent(), SmartPoll (song-end scheduling), StoredPlay, StreamMetadata (+6 more)

### Community 20 - "Community 20"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 21 - "Community 21"
Cohesion: 0.22
Nodes (16): _date_range(), get_audience_stats(), get_dashboard_stats(), get_genre_analytics(), get_realtime_stats(), get_region_analytics(), get_station_stats(), get_trending_now() (+8 more)

### Community 22 - "Community 22"
Cohesion: 0.14
Nodes (11): inter, metadata, viewport, GlobalShortcuts(), ShortcutDef, SHORTCUTS, GoogleProvider(), GROUPS (+3 more)

### Community 23 - "Community 23"
Cohesion: 0.17
Nodes (11): ModernAirwave(), toggleFavorite, useFavorites(), useStationFilter(), apiService singleton, Chip(), FilterSection(), SearchAndFilters (+3 more)

### Community 24 - "Community 24"
Cohesion: 0.15
Nodes (11): LiveStatusBar(), Tab, TABS, VALID_PERIODS, PeriodFilter(), PERIODS, Props, fetchLivePulse() (+3 more)

### Community 25 - "Community 25"
Cohesion: 0.25
Nodes (13): Lightweight endpoint called by Next.js analytics on metadata poll., record_snapshot(), register_analytics_commands(), ensure_counters(), ensure_indexes(), get_client(), get_counters_col(), get_db() (+5 more)

### Community 26 - "Community 26"
Cohesion: 0.21
Nodes (14): AirWave Kenya's Radio Branding, AirWave App Header (Logo, Tagline, Sign In), Centered Auth Card Layout Pattern, Confirm Password Input Field, Dark Theme Design (Near-Black Background, Purple Accent), Set New Password Gradient CTA Button, New Password Input Field, Password Requirements Hint Text (+6 more)

### Community 27 - "Community 27"
Cohesion: 0.19
Nodes (14): AirWave Live Stations Page Screenshot (NU'RADIO), Dark Theme Design (Near-Black Background, High-Contrast Cards), Filters Button, Kenyan Radio Stations Catalog (KISS 100, Capital FM, Radio Maisha, Classic 105, Radio Citizen, Homeboyz Radio, Mulembe FM), Listen Now CTA Button (Per-Station Brand Color), LIVE Status Indicator (Green Dot + Label), Live Stations Header (18 stations, Kenya's Best Radio), NU'RADIO Brand Identity (+6 more)

### Community 28 - "Community 28"
Cohesion: 0.21
Nodes (13): Dark Theme Design with Purple Primary Accent and Theme Toggle, Genre Filter Chips (All, Hip Hop, Pop, Contemporary, Soul, News, Urban, Talk, Dance), Listen Now CTA Button (Per-Station Accent Color), LIVE Indicator Badge (Green Dot Status), Live Stations View (18 Stations, Kenya's Best Radio), NU'RADIO Brand Header, Region Filter Chips (All, Nairobi, Nakuru), NU'RADIO Live Stations Page Screenshot (+5 more)

### Community 29 - "Community 29"
Cohesion: 0.21
Nodes (13): Icecast Metadata Proxy Route, useStreamMetadata Hook (Now Playing polling), Stream Metadata Analytics Plan, getTrending Aggregation, MongoDB Client Singleton (lib/mongodb.ts), Play Event Pipeline (title-change detection), PlayDocument (plays collection), SnapshotDocument (stationSnapshots collection) (+5 more)

### Community 30 - "Community 30"
Cohesion: 0.17
Nodes (12): GET /api/analytics/live-pulse, PATCH /api/analytics/play-event, POST /api/analytics/play-event, GET /api/analytics/retention, GET /api/analytics/song-impact, listenerSessions collection, listenerVisits collection, plays collection (+4 more)

### Community 31 - "Community 31"
Cohesion: 0.24
Nodes (12): MongoDB Migration Plan, Flask analytics_bp (MongoDB aggregations), backend/app/db.py (PyMongo connection helpers), Counters Collection (auto-increment integer IDs), Plain Python Model Classes (no ORM), stationPlays Collection (app click events), Analytics Audience Tab Plan, App Engagement Rate Metric (+4 more)

### Community 32 - "Community 32"
Cohesion: 0.30
Nodes (11): EMPTY, fetchIcecastData(), fetchIcecastData, fetchIcyData, fetchIcyData(), GET(), isMeaningless(), parseRawTitle() (+3 more)

### Community 33 - "Community 33"
Cohesion: 0.22
Nodes (9): DonutChart(), PALETTE, Props, fetchGenres(), fetchRegions(), GenreEntry, RegionEntry, GenresTab() (+1 more)

### Community 34 - "Community 34"
Cohesion: 0.20
Nodes (11): Composite Analytics Dashboard Layout (live status bar layer + tab nav layer), Dashboard Layout Option B: Live Monitor (persistent live status bar first), Dashboard Layout Option A: Overview Grid (KPI cards + charts, one page), Engagement Feature: Trending Stations, Analytics Tab 4: Genres & Regions (audience breakdown), Analytics Tab 1: Overview (KPIs + trends landing view), Trending Layout Option B: Badges on existing station cards, Trending Layout Option C: Collapsible sortable Trending Today table (+3 more)

### Community 35 - "Community 35"
Cohesion: 0.24
Nodes (9): handleVolumeChange, playStation, ReconnectLogic (exponential backoff, max 5), stopPlayback, toggleMute, togglePlay, useAudioPlayer(), useKeyboardShortcuts() (+1 more)

### Community 36 - "Community 36"
Cohesion: 0.18
Nodes (8): Station with declining plays still appears; growth_pct is negative; score stays, Returns empty list and 200 when no recent plays data., Returns up to 5 stations; station with most listeners ranks first., growth_pct is absent from response when plays_yesterday is 0., test_trending_now_empty(), test_trending_now_negative_growth(), test_trending_now_omits_growth_when_no_yesterday(), test_trending_now_returns_ranked_stations()

### Community 37 - "Community 37"
Cohesion: 0.24
Nodes (10): AirWave Header (Logo, Theme Toggle, Sign In), Centered Auth Card Layout, Passwords Match Indicator, Dark Theme with Purple Gradient Accent, Invalid or Expired Reset Link Error Banner, Password Reset Flow, Live Password Strength Checklist, Password Visibility Toggle (+2 more)

### Community 38 - "Community 38"
Cohesion: 0.20
Nodes (10): AirWave Feature Improvements Plan, PWA Support via next-pwa, StationAvatar Component, useFavorites Hook (localStorage + API sync), useSleepTimer Hook, useStationFilter Hook, UX Polish Plan, Inactive Station Filtering (+2 more)

### Community 39 - "Community 39"
Cohesion: 0.24
Nodes (10): AudienceTab Component, Analytics Dashboard Plan, lib/analyticsApi.ts Typed Fetchers, Chart Components (LineChart, DonutChart, HBarChart, HeatmapGrid), LiveStatusBar (15s polling), Trending Stations Plan, TrendingStrip Component, Analytics Dashboard Design Spec (+2 more)

### Community 40 - "Community 40"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

### Community 41 - "Community 41"
Cohesion: 0.25
Nodes (6): SongImpactPanel(), fetchTrending(), PERIOD_HOURS, TrendingEntry, Props, SongsTab()

### Community 42 - "Community 42"
Cohesion: 0.31
Nodes (5): BaseConfig, Exception, APIError, create_app(), register_error_handlers()

### Community 43 - "Community 43"
Cohesion: 0.22
Nodes (6): apiPost(), getOrCreateDeviceId (localStorage), fetchCounts (15s poll), Heartbeat (20s interval), getOrCreateSessionId (sessionStorage), useListeners()

### Community 44 - "Community 44"
Cohesion: 0.33
Nodes (5): fetchTrendingNow(), TrendingNowStation, Props, TrendingStrip(), WaveformBars()

### Community 45 - "Community 45"
Cohesion: 0.33
Nodes (7): Auto-Reconnect with Exponential Backoff, useAudioPlayer Hook, Keyboard Shortcuts Plan, ShortcutCheatsheet Modal, useKeyboardShortcuts Hook (11 shortcuts), Keyboard Shortcuts Design Spec, Input Focus Guard

### Community 46 - "Community 46"
Cohesion: 0.33
Nodes (7): Architecture Refactoring Plan, Station Type Consolidation, useStations Wiring (replace mock data), Scalability Plan, Cache-Control on Stations Endpoint, useStations In-Memory SWR Cache, Architecture Refactoring Design Spec

### Community 47 - "Community 47"
Cohesion: 0.38
Nodes (5): StationCard(), StationGrid(), StationGridProps, SkeletonCard(), SkeletonCardProps

### Community 48 - "Community 48"
Cohesion: 0.29
Nodes (6): Button, ButtonProps, ButtonSize, ButtonVariant, sizeClasses, variantStyles

### Community 49 - "Community 49"
Cohesion: 0.47
Nodes (5): chunk(), crc32(), G_END, G_START, makePNG()

### Community 51 - "Community 51"
Cohesion: 0.40
Nodes (5): create_app (Flask application factory), admin_bp (Flask blueprint /api/admin), analytics_bp (Flask blueprint /api/analytics), auth_bp (Flask blueprint /api/auth), stations_bp (Flask blueprint /api/stations)

### Community 52 - "Community 52"
Cohesion: 0.40
Nodes (5): Shortcut Cheatsheet Overlay Design (Playback / Navigation / App sections), Discoverability Option: ? Cheatsheet Overlay, Global App Shortcuts (? cheatsheet, T theme, Esc dismiss), Player Control Shortcuts (Space, M, arrows for volume/station), Search & Filter Shortcuts (/ or Ctrl+K focus, Esc clear)

### Community 53 - "Community 53"
Cohesion: 0.60
Nodes (5): Real-Time Listener Tracking Plan, Heartbeat Session System, GET /api/listeners/counts Aggregation Route, ListenerSessionDocument, useListeners Hook

### Community 54 - "Community 54"
Cohesion: 0.60
Nodes (5): Security & Auth Hardening Plan, fetchWithRefresh Wrapper, HttpOnly Cookie JWT Delivery, Security & Auth Hardening Design Spec, Cookie Token Flow with Silent Refresh & Rotation

### Community 55 - "Community 55"
Cohesion: 0.50
Nodes (4): GET /api/analytics/audience-insights, GET /api/analytics/metadata-quality, POST /api/analytics/snapshot, stationSnapshots collection

### Community 56 - "Community 56"
Cohesion: 0.50
Nodes (3): Lazy HTMLAudioElement initialization, initializeAudio (internal), useAudioManager()

### Community 58 - "Community 58"
Cohesion: 0.67
Nodes (3): Fallback rewrite to Flask backend, nextConfig, pwaConfig

### Community 59 - "Community 59"
Cohesion: 0.67
Nodes (4): Monitoring Plan, Flask Deep Health Check, Next.js Error Boundaries (error.tsx + global-error.tsx), Next.js /api/health Aggregation Route

### Community 60 - "Community 60"
Cohesion: 0.67
Nodes (3): getInitials(), StationAvatar(), StationAvatarProps

### Community 65 - "Community 65"
Cohesion: 0.67
Nodes (3): Next.js Logo SVG (template asset), Vercel Logo SVG (template asset), README - create-next-app bootstrap docs

### Community 67 - "Community 67"
Cohesion: 0.67
Nodes (3): fetchStationBySlug (SSR data fetch helper), generateMetadata (Next.js metadata export), StationPage (dynamic slug route)

## Knowledge Gaps
- **307 isolated node(s):** `extends`, `Tab`, `TABS`, `VALID_PERIODS`, `GENRES` (+302 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **37 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Station` connect `API Service Client` to `Admin & Analytics Dashboard`, `Next.js API Routes`, `Community 35`, `Layout & Navigation Hooks`, `Design System & Redesign Docs`, `Genre Theme System`, `Community 44`, `Community 47`, `Player Context & Audio Hook`, `Player Context & Slug Lib`, `Stream Metadata Hook`, `Community 23`, `Community 56`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Why does `15 usability issues found (U1–U15): brand conflict, no station detail pages, no Now Playing expand, no history UI, analytics locked, small touch targets, emoji icons, dual theming, GENRE_COLORS duplication, inline styles, no dynamic artwork, PWA icons 404, GSAP overhead` connect `Design System & Redesign Docs` to `API Service Client`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **What connects `extends`, `Tab`, `TABS` to the rest of the system?**
  _349 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Workbox PWA Runtime` be split into smaller, more focused modules?**
  _Cohesion score 0.05067920585161965 - nodes in this community are weakly interconnected._
- **Should `Admin & Analytics Dashboard` be split into smaller, more focused modules?**
  _Cohesion score 0.05819209039548023 - nodes in this community are weakly interconnected._
- **Should `Next.js API Routes` be split into smaller, more focused modules?**
  _Cohesion score 0.08200290275761973 - nodes in this community are weakly interconnected._
- **Should `Layout & Navigation Hooks` be split into smaller, more focused modules?**
  _Cohesion score 0.07801418439716312 - nodes in this community are weakly interconnected._