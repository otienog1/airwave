// Relative path: Flask endpoints are reached through the Next.js proxy
// (fallback rewrite), so the browser never makes a cross-origin request.
const BACKEND = '/api';

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

export interface AudienceTimeBucket {
  bucket: string;
  listeners: number;
}

export interface AudienceStation {
  station_id: number | string;
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

export function fetchAudience(days: number): Promise<AudienceResponse> {
  return get(`/analytics/audience?days=${days}`);
}

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

export const PERIOD_HOURS: Record<number, number> = { 1: 24, 7: 168, 30: 720, 90: 2160 };

// ── Live Pulse (Next.js route, in-app heartbeat sessions) ──────────────────

export interface LivePulseStation {
  station_id: number;
  station_name: string;
  listeners: number;
  now_playing: string | null;
}

export interface LivePulseResponse {
  total_listeners: number;
  stations_active: number;
  started_last_hour: number;
  avg_session_minutes: number;
  stations: LivePulseStation[];
  feed: { station_name: string; started_at: string }[];
  timestamp: string;
}

export function fetchLivePulse(): Promise<LivePulseResponse> {
  return get('/analytics/live-pulse');
}

// ── Audience insights: peak + WoW movers (Next.js route) ───────────────────

export interface AudienceMover {
  station_id: number;
  station_name: string;
  current: number;
  previous: number;
  growth_pct: number;
}

export interface AudienceInsightsResponse {
  days: number;
  peak: { listeners: number; at: string } | null;
  movers: AudienceMover[];
}

export function fetchAudienceInsights(days: number): Promise<AudienceInsightsResponse> {
  return get(`/analytics/audience-insights?days=${days}`);
}

// ── Song impact: listener delta per track (Next.js route) ──────────────────

export interface SongImpactEntry {
  title: string;
  artist: string | null;
  avg_delta: number;
  plays: number;
  avg_start: number;
}

export interface SongImpactResponse {
  days: number;
  gainers: SongImpactEntry[];
  losers: SongImpactEntry[];
  sample_size: number;
}

export function fetchSongImpact(days: number): Promise<SongImpactResponse> {
  return get(`/analytics/song-impact?days=${days}`);
}

// ── Metadata quality (Next.js route) ───────────────────────────────────────

export interface MetadataQualityStation {
  station_id: number;
  station_name: string;
  uptime_pct: number;
  metadata_rate_pct: number;
  primary_source: string | null;
  sources: { zetta: number; icecast: number; icy: number; none: number };
  last_title_at: string | null;
  stale: boolean;
}

export interface MetadataQualityResponse {
  days: number;
  stations: MetadataQualityStation[];
}

export function fetchMetadataQuality(days: number): Promise<MetadataQualityResponse> {
  return get(`/analytics/metadata-quality?days=${days}`);
}

// ── Retention cohorts (Next.js route) ──────────────────────────────────────

export interface RetentionWeek {
  week: string;
  returned: number;
  pct: number;
}

export interface RetentionCohort {
  week: string;
  size: number;
  retention: RetentionWeek[];
}

export interface RetentionResponse {
  weeks: number;
  cohorts: RetentionCohort[];
}

export function fetchRetention(weeks: number): Promise<RetentionResponse> {
  return get(`/analytics/retention?weeks=${weeks}`);
}
