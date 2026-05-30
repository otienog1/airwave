'use client';
import { useEffect, useState } from 'react';
import {
  fetchDashboard,
  fetchTrending,
  PERIOD_HOURS,
  type DashboardResponse,
  type TrendingEntry,
  type RealTimeResponse,
} from '@/lib/analyticsApi';
import { KpiCard } from '../KpiCard';
import { SkeletonCard } from '../SkeletonCard';
import { LineChart } from '../charts/LineChart';
import { DonutChart } from '../charts/DonutChart';
import { HBarChart } from '../charts/HBarChart';

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

  const load = () => {
    setLoading(true);
    setError(null);
    const hours = PERIOD_HOURS[period] ?? 168;
    Promise.all([fetchDashboard(period), fetchTrending(hours, 10)])
      .then(([d, t]) => {
        setDash(d);
        setTrending(t.results);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load overview data.');
        setLoading(false);
      });
  };

  useEffect(() => { load(); }, [period]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div
        className="rounded-xl p-6 text-center"
        style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}
      >
        <p className="text-sm mb-3" style={{ color: '#f87171' }}>{error}</p>
        <button
          onClick={load}
          className="text-xs px-3 py-1.5 rounded-lg"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  const ov = dash?.overview;

  const genreMap = (dash?.top_stations ?? []).reduce<Record<string, number>>((acc, s) => {
    if (s.genre) acc[s.genre] = (acc[s.genre] ?? 0) + s.play_count;
    return acc;
  }, {});

  const donutData = Object.entries(genreMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  const barData = (dash?.top_stations ?? [])
    .slice(0, 5)
    .map(s => ({ name: s.name, value: s.play_count }));

  const lineData: { date: string; plays: number }[] = [];

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
        <div
          className="lg:col-span-2 rounded-xl p-4"
          style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}
        >
          <p
            className="text-xs font-semibold mb-3 uppercase"
            style={{ color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}
          >
            Plays Over Time
          </p>
          {loading ? (
            <SkeletonCard height={140} />
          ) : lineData.length === 0 ? (
            <p className="text-xs text-center py-12" style={{ color: 'var(--color-text-muted)' }}>
              No time-series data for this period
            </p>
          ) : (
            <LineChart data={lineData} ariaLabel="Line chart: plays over time" />
          )}
        </div>
        <div
          className="rounded-xl p-4"
          style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}
        >
          <p
            className="text-xs font-semibold mb-3 uppercase"
            style={{ color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}
          >
            Plays by Genre
          </p>
          {loading ? (
            <SkeletonCard height={220} />
          ) : donutData.length === 0 ? (
            <p className="text-xs text-center py-12" style={{ color: 'var(--color-text-muted)' }}>
              No genre data
            </p>
          ) : (
            <DonutChart data={donutData} ariaLabel="Donut chart: plays by genre" />
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div
          className="rounded-xl p-4"
          style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}
        >
          <p
            className="text-xs font-semibold mb-3 uppercase"
            style={{ color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}
          >
            Top Stations
          </p>
          {loading ? (
            <SkeletonCard height={200} />
          ) : barData.length === 0 ? (
            <p className="text-xs text-center py-10" style={{ color: 'var(--color-text-muted)' }}>
              No data for this period
            </p>
          ) : (
            <HBarChart data={barData} ariaLabel="Bar chart: top 5 stations by plays" />
          )}
        </div>

        <div
          className="rounded-xl p-4 overflow-auto"
          style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}
        >
          <p
            className="text-xs font-semibold mb-3 uppercase"
            style={{ color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}
          >
            Trending Songs
          </p>
          {loading ? (
            <SkeletonCard height={200} />
          ) : !trending || trending.length === 0 ? (
            <p className="text-xs text-center py-10" style={{ color: 'var(--color-text-muted)' }}>
              No trending songs yet
            </p>
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
                    <td
                      className="py-1.5 pr-2 tabular-nums"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {i + 1}
                    </td>
                    <td className="py-1.5 pr-4 max-w-[160px]">
                      <p
                        className="truncate font-medium"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {t.title}
                      </p>
                      <p className="truncate" style={{ color: 'var(--color-text-muted)' }}>
                        {t.artist ?? 'Unknown'}
                      </p>
                    </td>
                    <td
                      className="py-1.5 text-right tabular-nums"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {t.playCount}
                    </td>
                    <td className="py-1.5 text-right" style={{ color: 'var(--color-text-muted)' }}>
                      {relativeTime(t.lastSeen)}
                    </td>
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
