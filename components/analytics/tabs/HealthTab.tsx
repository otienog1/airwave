'use client';
import { useEffect, useState } from 'react';
import { fetchDashboard, type DashboardResponse, type RealTimeResponse } from '@/lib/analyticsApi';
import { SkeletonCard } from '../SkeletonCard';
import { MetadataQualityPanel } from '../InsightPanels';

interface Props {
  period: number;
  realtime: RealTimeResponse | null;
}

export function HealthTab({ period, realtime }: Props) {
  const [dash, setDash] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'listeners' | 'status'>('listeners');

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchDashboard(period)
      .then(d => { setDash(d); setLoading(false); })
      .catch(() => { setError('Failed to load health data.'); setLoading(false); });
  }, [period]);

  if (error) {
    return <p className="text-sm text-center py-12" style={{ color: '#f87171' }}>{error}</p>;
  }

  const rtMap = new Map(
    (realtime?.real_time.current_stations ?? []).map(s => [s.id, s])
  );

  const stations = [...(dash?.top_stations ?? [])].sort((a, b) => {
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
          : stations.map(s => {
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
                  <p
                    className="text-xs font-semibold mb-1 truncate"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    <span style={{ color: isLive ? '#22c55e' : '#ef4444' }}>●</span>
                    {' '}{s.name}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    Genre: {s.genre ?? '—'}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    Listeners:{' '}
                    <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                      {isLive ? rt.current_listeners : '—'}
                    </span>
                  </p>
                </div>
              );
            })}
      </div>

      {/* Detail table */}
      {!loading && stations.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
          <div
            className="flex items-center gap-2 px-4 py-3"
            style={{ background: 'var(--color-surface-raised)', borderBottom: '1px solid var(--color-border)' }}
          >
            <p
              className="text-xs font-semibold uppercase flex-1"
              style={{ color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}
            >
              Station Details
            </p>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as 'listeners' | 'status')}
              className="text-xs rounded-lg px-2 py-1"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
              }}
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
              {stations.map(s => {
                const rt = rtMap.get(s.id);
                const isLive = !!rt;
                return (
                  <tr key={s.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                    <td className="px-4 py-2 font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {s.name}
                    </td>
                    <td className="px-3 py-2">
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
                    <td
                      className="px-3 py-2 text-right tabular-nums"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {s.play_count.toLocaleString()}
                    </td>
                    <td
                      className="px-3 py-2 text-right tabular-nums"
                      style={{ color: isLive ? '#22c55e' : 'var(--color-text-muted)' }}
                    >
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

      {/* Per-station metadata pipeline health */}
      <MetadataQualityPanel period={period} />
    </div>
  );
}
