'use client';
import { useEffect, useState } from 'react';
import { fetchLivePulse, type LivePulseResponse } from '@/lib/analyticsApi';
import { KpiCard } from '../KpiCard';
import { SkeletonCard } from '../SkeletonCard';

const POLL_MS = 15_000;

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export function LivePulseTab() {
  const [data, setData] = useState<LivePulseResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetchLivePulse()
        .then(d => { if (!cancelled) { setData(d); setError(null); } })
        .catch(() => { if (!cancelled && !data) setError('Failed to load live data.'); });
    load();
    const t = setInterval(load, POLL_MS);
    return () => { cancelled = true; clearInterval(t); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const cardStyle = {
    background: 'var(--color-surface-raised)',
    border: '1px solid var(--color-border)',
  } as const;

  const sectionLabel = {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    color: 'var(--color-text-muted)',
    marginBottom: 12,
  };

  if (error) {
    return (
      <div className="rounded-xl p-6 text-center" style={cardStyle}>
        <p className="text-sm" style={{ color: '#f87171' }}>{error}</p>
      </div>
    );
  }

  const loading = data === null;
  const maxListeners = Math.max(1, ...(data?.stations.map(s => s.listeners) ?? [1]));

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="In-App Listeners" value={data?.total_listeners ?? 0} isLive loading={loading} />
        <KpiCard label="Stations Active" value={data?.stations_active ?? 0} isLive loading={loading} />
        <KpiCard label="Joined Last Hour" value={data?.started_last_hour ?? 0} isLive loading={loading} />
        <KpiCard
          label="Avg Session"
          value={data ? `${data.avg_session_minutes} min` : '—'}
          isLive
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Listeners by station, with current song */}
        <div className="lg:col-span-2 rounded-xl p-4" style={cardStyle}>
          <p style={sectionLabel}>Listening Now (refreshes every 15s)</p>
          {loading ? (
            <SkeletonCard height={220} />
          ) : data.stations.length === 0 ? (
            <p className="text-xs text-center py-12" style={{ color: 'var(--color-text-muted)' }}>
              Nobody is listening in the app right now
            </p>
          ) : (
            <ul className="space-y-3">
              {data.stations.map(s => (
                <li key={s.station_id}>
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span className="text-xs font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {s.station_name}
                    </span>
                    <span className="text-xs tabular-nums shrink-0" style={{ color: 'var(--color-text-secondary)' }}>
                      {s.listeners} {s.listeners === 1 ? 'listener' : 'listeners'}
                    </span>
                  </div>
                  <div
                    className="h-2 rounded-full overflow-hidden"
                    style={{ background: 'var(--color-overlay-hover)' }}
                    role="img"
                    aria-label={`${s.station_name}: ${s.listeners} in-app listeners`}
                  >
                    <div
                      className="h-full rounded-full transition-[width] duration-500"
                      style={{
                        width: `${(s.listeners / maxListeners) * 100}%`,
                        background: 'linear-gradient(90deg, var(--chart-1), var(--chart-2))',
                      }}
                    />
                  </div>
                  {s.now_playing && (
                    <p className="text-[11px] mt-1 truncate" style={{ color: 'var(--color-text-muted)' }}>
                      ♪ {s.now_playing}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Session feed */}
        <div className="rounded-xl p-4" style={cardStyle}>
          <p style={sectionLabel}>Session Feed</p>
          {loading ? (
            <SkeletonCard height={220} />
          ) : data.feed.length === 0 ? (
            <p className="text-xs text-center py-12" style={{ color: 'var(--color-text-muted)' }}>
              No active sessions
            </p>
          ) : (
            <ul className="space-y-2.5" aria-live="off">
              {data.feed.map((f, i) => (
                <li key={`${f.started_at}-${i}`} className="flex items-center gap-2.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: 'var(--color-success)' }}
                    aria-hidden="true"
                  />
                  <span className="flex-1 min-w-0 text-xs truncate" style={{ color: 'var(--color-text-primary)' }}>
                    joined <strong>{f.station_name}</strong>
                  </span>
                  <span className="text-[11px] tabular-nums shrink-0" style={{ color: 'var(--color-text-muted)' }}>
                    {timeAgo(f.started_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
