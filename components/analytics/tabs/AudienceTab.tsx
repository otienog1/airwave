'use client';
import { useEffect, useState } from 'react';
import {
  fetchAudience,
  type AudienceResponse,
  type AudienceSong,
} from '@/lib/analyticsApi';
import { KpiCard } from '../KpiCard';
import { SkeletonCard } from '../SkeletonCard';
import { LineChart } from '../charts/LineChart';
import { HBarChart } from '../charts/HBarChart';

type SortKey = 'avg_listeners' | 'count';

interface Props {
  period: number;
}

export function AudienceTab({ period }: Props) {
  const [data, setData] = useState<AudienceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('avg_listeners');

  const load = () => {
    setLoading(true);
    setError(null);
    fetchAudience(period)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError('Failed to load audience data.'); setLoading(false); });
  };

  useEffect(() => { load(); }, [period]); // eslint-disable-line react-hooks/exhaustive-deps

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
        <p className="text-sm mb-3" style={{ color: '#f87171' }}>{error}</p>
        <button
          onClick={load}
          className="text-xs px-3 py-1.5 rounded-lg"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', cursor: 'pointer' }}
        >
          Retry
        </button>
      </div>
    );
  }

  const lineData = (data?.time_series ?? []).map(b => ({ date: b.bucket, plays: b.listeners }));
  const barData = (data?.top_stations ?? []).map(s => ({ name: s.station_name, value: s.avg_listeners }));

  const sortedSongs: AudienceSong[] = [...(data?.top_songs ?? [])].sort((a, b) =>
    sortKey === 'avg_listeners' ? b.avg_listeners - a.avg_listeners : b.count - a.count
  );

  const thStyle = (key: SortKey) => ({
    textAlign: 'right' as const,
    paddingBottom: 8,
    fontWeight: 600,
    cursor: 'pointer',
    color: sortKey === key ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
    userSelect: 'none' as const,
  });

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Peak Listeners"
          value={data?.peak_listeners ?? 0}
          loading={loading}
        />
        <KpiCard
          label="Avg per Song"
          value={data ? data.avg_listeners.toLocaleString() : '—'}
          loading={loading}
        />
        <KpiCard
          label="Song Detections"
          value={data?.total_detections ?? 0}
          loading={loading}
        />
        <KpiCard
          label="App Engagement"
          value={data ? `${data.app_engagement_rate.toFixed(1)}%` : '—'}
          loading={loading}
        />
      </div>

      {/* Listener trend + top stations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl p-4" style={cardStyle}>
          <p style={sectionLabel}>Stream Listeners Over Time</p>
          {loading ? (
            <SkeletonCard height={140} />
          ) : lineData.length === 0 ? (
            <p className="text-xs text-center py-12" style={{ color: 'var(--color-text-muted)' }}>
              No listener data for this period
            </p>
          ) : (
            <LineChart data={lineData} ariaLabel="Area chart: stream listeners over time" />
          )}
        </div>

        <div className="rounded-xl p-4" style={cardStyle}>
          <p style={sectionLabel}>Top Stations by Reach</p>
          {loading ? (
            <SkeletonCard height={200} />
          ) : barData.length === 0 ? (
            <p className="text-xs text-center py-12" style={{ color: 'var(--color-text-muted)' }}>
              No station data
            </p>
          ) : (
            <HBarChart data={barData} ariaLabel="Bar chart: top stations by avg stream listeners" />
          )}
        </div>
      </div>

      {/* Top songs table */}
      <div className="rounded-xl p-4 overflow-auto" style={cardStyle}>
        <p style={sectionLabel}>Top Songs by Stream Listeners</p>
        {loading ? (
          <SkeletonCard height={200} />
        ) : sortedSongs.length === 0 ? (
          <p className="text-xs text-center py-10" style={{ color: 'var(--color-text-muted)' }}>
            No song data for this period
          </p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr style={{ color: 'var(--color-text-muted)' }}>
                <th className="text-left pb-2 font-medium">#</th>
                <th className="text-left pb-2 font-medium">Song</th>
                <th className="text-left pb-2 font-medium">Artist</th>
                <th
                  className="pr-4"
                  style={thStyle('avg_listeners')}
                  onClick={() => setSortKey('avg_listeners')}
                >
                  Avg Listeners {sortKey === 'avg_listeners' ? '↓' : ''}
                </th>
                <th
                  style={thStyle('count')}
                  onClick={() => setSortKey('count')}
                >
                  Detections {sortKey === 'count' ? '↓' : ''}
                </th>
                <th className="text-right pb-2 font-medium">Best Station</th>
              </tr>
            </thead>
            <tbody>
              {sortedSongs.map((song, i) => (
                <tr
                  key={`${song.title}-${song.artist}`}
                  style={{ borderTop: '1px solid var(--color-border)' }}
                >
                  <td className="py-1.5 pr-2 tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
                    {i + 1}
                  </td>
                  <td className="py-1.5 pr-4 max-w-[160px]">
                    <p className="truncate font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {song.title}
                    </p>
                  </td>
                  <td className="py-1.5 pr-4 max-w-[120px]">
                    <p className="truncate" style={{ color: 'var(--color-text-muted)' }}>
                      {song.artist ?? 'Unknown'}
                    </p>
                  </td>
                  <td className="py-1.5 text-right tabular-nums pr-4" style={{ color: 'var(--color-text-primary)' }}>
                    {song.avg_listeners.toLocaleString()}
                  </td>
                  <td className="py-1.5 text-right tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
                    {song.count}
                  </td>
                  <td className="py-1.5 text-right" style={{ color: '#6366f1' }}>
                    {song.best_station ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
