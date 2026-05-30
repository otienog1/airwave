'use client';
import { useEffect, useState } from 'react';
import { fetchTrending, PERIOD_HOURS, type TrendingEntry } from '@/lib/analyticsApi';
import { SkeletonCard } from '../SkeletonCard';
import { HBarChart } from '../charts/HBarChart';

function fmtDuration(sec: number | null) {
  if (!sec || sec === 0) return '—';
  return `${Math.floor(sec / 60)}m ${Math.floor(sec % 60)}s`;
}

function relativeTime(date: string | Date) {
  const diff = Date.now() - new Date(date).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return `${Math.floor(diff / 60_000)}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface Props { period: number }

export function SongsTab({ period }: Props) {
  const [songs, setSongs] = useState<TrendingEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'playCount' | 'avgDuration'>('playCount');

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchTrending(PERIOD_HOURS[period] ?? 168, 20)
      .then(r => { setSongs(r.results); setLoading(false); })
      .catch(() => { setError('Failed to load song data.'); setLoading(false); });
  }, [period]);

  const sorted = songs
    ? [...songs].sort((a, b) =>
        sortBy === 'playCount'
          ? b.playCount - a.playCount
          : (b.avgDuration ?? 0) - (a.avgDuration ?? 0)
      )
    : [];

  const artistData = songs
    ? Object.entries(
        songs.reduce<Record<string, number>>((acc, s) => {
          const key = s.artist ?? 'Unknown';
          acc[key] = (acc[key] ?? 0) + s.playCount;
          return acc;
        }, {})
      )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, value]) => ({ name, value }))
    : [];

  if (error) {
    return <p className="text-sm text-center py-12" style={{ color: '#f87171' }}>{error}</p>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Songs table */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
        <div
          className="flex items-center gap-2 px-4 py-3"
          style={{ background: 'var(--color-surface-raised)', borderBottom: '1px solid var(--color-border)' }}
        >
          <p
            className="text-xs font-semibold uppercase flex-1"
            style={{ color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}
          >
            Top Songs
          </p>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as 'playCount' | 'avgDuration')}
            className="text-xs rounded-lg px-2 py-1"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
            }}
          >
            <option value="playCount">By Plays</option>
            <option value="avgDuration">By Avg Duration</option>
          </select>
        </div>
        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} height={44} />)}
          </div>
        ) : sorted.length === 0 ? (
          <p className="text-xs text-center py-10" style={{ color: 'var(--color-text-muted)' }}>
            No songs detected in this period
          </p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr style={{ color: 'var(--color-text-muted)' }}>
                <th className="text-left px-4 py-2 font-medium">#</th>
                <th className="text-left px-2 py-2 font-medium">Song / Artist</th>
                <th className="text-right px-2 py-2 font-medium">Plays</th>
                <th className="text-right px-2 py-2 font-medium">Avg</th>
                <th className="text-right px-4 py-2 font-medium">Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s, i) => (
                <tr key={s.title} style={{ borderTop: '1px solid var(--color-border)' }}>
                  <td className="px-4 py-2 tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
                    {i + 1}
                  </td>
                  <td className="px-2 py-2 max-w-[180px]">
                    <p className="truncate font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {s.title}
                    </p>
                    <p className="truncate" style={{ color: 'var(--color-text-muted)' }}>
                      {s.artist ?? 'Unknown'}
                    </p>
                  </td>
                  <td
                    className="px-2 py-2 text-right tabular-nums"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {s.playCount}
                  </td>
                  <td
                    className="px-2 py-2 text-right tabular-nums"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {fmtDuration(s.avgDuration)}
                  </td>
                  <td className="px-4 py-2 text-right" style={{ color: 'var(--color-text-muted)' }}>
                    {relativeTime(s.lastSeen)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Artist chart */}
      <div
        className="rounded-xl p-4"
        style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}
      >
        <p
          className="text-xs font-semibold uppercase mb-4"
          style={{ color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}
        >
          Top Artists
        </p>
        {loading ? (
          <SkeletonCard height={320} />
        ) : artistData.length === 0 ? (
          <p className="text-xs text-center py-10" style={{ color: 'var(--color-text-muted)' }}>
            No artist data
          </p>
        ) : (
          <HBarChart data={artistData} height={320} ariaLabel="Bar chart: top artists by play count" />
        )}
        <p className="text-xs mt-4" style={{ color: 'var(--color-text-muted)' }}>
          Source: track metadata from live stream detection
        </p>
      </div>
    </div>
  );
}
