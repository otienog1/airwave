'use client';
import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import {
  fetchDashboard,
  fetchStationStats,
  type DashboardResponse,
  type StationStatsResponse,
  type RealTimeResponse,
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
  const triggerRowRef = useRef<HTMLElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchDashboard(period)
      .then(d => { setDash(d); setLoading(false); })
      .catch(() => { setError('Failed to load stations.'); setLoading(false); });
  }, [period]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDetail(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (detail) modalRef.current?.focus();
  }, [detail]);

  const openDetail = (id: number, trigger: HTMLElement) => {
    triggerRowRef.current = trigger;
    setDetailLoading(true);
    setDetail(null);
    fetchStationStats(id, period)
      .then(d => { setDetail(d); setDetailLoading(false); })
      .catch(() => setDetailLoading(false));
  };

  const closeDetail = () => {
    setDetail(null);
    setDetailLoading(false);
    (triggerRowRef.current as HTMLElement | null)?.focus();
  };

  const rtMap = new Map(
    (realtime?.real_time.current_stations ?? []).map(s => [s.id, s.current_listeners])
  );

  const toggleSort = (k: SortKey) => {
    if (sort === k) setAsc(a => !a);
    else { setSort(k); setAsc(false); }
  };

  const stations = [...(dash?.top_stations ?? [])].sort((a, b) => {
    const v = sort === 'play_count'
      ? a.play_count - b.play_count
      : (a.avg_duration ?? 0) - (b.avg_duration ?? 0);
    return asc ? v : -v;
  });

  if (error) {
    return (
      <p className="text-sm text-center py-12" style={{ color: '#f87171' }}>{error}</p>
    );
  }

  return (
    <div>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} height={44} />)}
        </div>
      ) : stations.length === 0 ? (
        <p className="text-sm text-center py-12" style={{ color: 'var(--color-text-muted)' }}>
          No station data for this period
        </p>
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
                >
                  Plays {sort === 'play_count' ? (asc ? '↑' : '↓') : ''}
                </th>
                <th
                  className="text-right px-3 py-3 font-medium cursor-pointer select-none"
                  onClick={() => toggleSort('avg_duration')}
                  style={{ color: sort === 'avg_duration' ? '#6366f1' : undefined }}
                >
                  Avg Duration {sort === 'avg_duration' ? (asc ? '↑' : '↓') : ''}
                </th>
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
                    tabIndex={0}
                    onClick={e => openDetail(s.id, e.currentTarget)}
                    onKeyDown={e => e.key === 'Enter' && openDetail(s.id, e.currentTarget)}
                    className="cursor-pointer"
                    style={{ borderTop: '1px solid var(--color-border)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.04)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {s.name}
                    </td>
                    <td className="px-3 py-3" style={{ color: 'var(--color-text-secondary)' }}>
                      {s.genre ?? '—'}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums" style={{ color: 'var(--color-text-primary)' }}>
                      {s.play_count.toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>
                      {avgFmt}
                    </td>
                    <td
                      className="px-3 py-3 text-right tabular-nums"
                      style={{ color: isLive ? '#22c55e' : 'var(--color-text-muted)' }}
                    >
                      {isLive ? liveCount : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          background: isLive ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                          color: isLive ? '#22c55e' : '#ef4444',
                        }}
                      >
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
      {(detail !== null || detailLoading) && (
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
            style={{
              background: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border-strong)',
              maxHeight: '90vh',
            }}
          >
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: '1px solid var(--color-border)' }}
            >
              <div>
                <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  {detail?.station.name ?? 'Loading…'}
                </h2>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {detail?.station.genre} · {detail?.station.region}
                </p>
              </div>
              <button
                onClick={closeDetail}
                aria-label="Close station detail"
                className="p-1.5 rounded-lg"
                style={{ color: 'var(--color-text-muted)', cursor: 'pointer' }}
              >
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <KpiCard label="Period Plays" value={detail.stats.period_plays} />
                  <KpiCard label="Unique Listeners" value={detail.stats.unique_listeners} />
                  <KpiCard label="Avg Session" value={`${detail.stats.avg_session_minutes.toFixed(1)}m`} />
                  <KpiCard label="Total Hours" value={`${detail.stats.total_listening_hours.toFixed(1)}h`} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    className="rounded-xl p-4"
                    style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                  >
                    <p
                      className="text-xs font-semibold mb-3 uppercase"
                      style={{ color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}
                    >
                      Daily Plays
                    </p>
                    {detail.daily_stats.length > 0 ? (
                      <LineChart
                        data={detail.daily_stats.map(d => ({ date: d.date, plays: d.plays }))}
                        ariaLabel={`Line chart: daily plays for ${detail.station.name}`}
                      />
                    ) : (
                      <p className="text-xs text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
                        No daily data
                      </p>
                    )}
                  </div>
                  <div
                    className="rounded-xl p-4 overflow-auto"
                    style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                  >
                    <p
                      className="text-xs font-semibold mb-3 uppercase"
                      style={{ color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}
                    >
                      Peak Hours (day × hour)
                    </p>
                    {detail.heatmap_data.length > 0 ? (
                      <HeatmapGrid data={detail.heatmap_data} />
                    ) : (
                      <p className="text-xs text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
                        No hourly data
                      </p>
                    )}
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
