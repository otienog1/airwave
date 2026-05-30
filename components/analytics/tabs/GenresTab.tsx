'use client';
import { useEffect, useState } from 'react';
import { fetchGenres, fetchRegions, type GenreEntry, type RegionEntry } from '@/lib/analyticsApi';
import { SkeletonCard } from '../SkeletonCard';
import { DonutChart } from '../charts/DonutChart';
import { HBarChart } from '../charts/HBarChart';

interface Props { period: number }

export function GenresTab({ period }: Props) {
  const [genres, setGenres] = useState<GenreEntry[] | null>(null);
  const [regions, setRegions] = useState<RegionEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([fetchGenres(period), fetchRegions(period)])
      .then(([g, r]) => {
        setGenres(g.genre_analytics);
        setRegions(r.region_analytics);
        setLoading(false);
      })
      .catch(() => { setError('Failed to load genre/region data.'); setLoading(false); });
  }, [period]);

  if (error) {
    return <p className="text-sm text-center py-12" style={{ color: '#f87171' }}>{error}</p>;
  }

  const genreDonut = (genres ?? []).map(g => ({ name: g.genre, value: g.total_plays }));
  const genreBar   = (genres ?? []).map(g => ({ name: g.genre, value: g.total_plays }));
  const bestGenre  = genres?.[0];

  const regionDonut  = (regions ?? []).map(r => ({ name: r.region, value: r.total_plays }));
  const regionBar    = (regions ?? []).map(r => ({ name: r.region, value: r.total_plays }));
  const bestRegion   = regions?.reduce(
    (a, b) => (b.unique_listeners > (a?.unique_listeners ?? 0) ? b : a),
    regions[0]
  );

  const Section = ({
    title,
    donut,
    bar,
    footer,
  }: {
    title: string;
    donut: { name: string; value: number }[];
    bar: { name: string; value: number }[];
    footer?: string;
  }) => (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        {title}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          className="rounded-xl p-4"
          style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}
        >
          {loading ? (
            <SkeletonCard height={220} />
          ) : donut.length === 0 ? (
            <p className="text-xs text-center py-10" style={{ color: 'var(--color-text-muted)' }}>No data</p>
          ) : (
            <DonutChart data={donut} ariaLabel={`Donut chart: ${title} share`} />
          )}
        </div>
        <div
          className="rounded-xl p-4"
          style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}
        >
          {loading ? (
            <SkeletonCard height={220} />
          ) : bar.length === 0 ? (
            <p className="text-xs text-center py-10" style={{ color: 'var(--color-text-muted)' }}>No data</p>
          ) : (
            <HBarChart data={bar} ariaLabel={`Bar chart: ${title} ranked by plays`} />
          )}
        </div>
      </div>
      {footer && (
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{footer}</p>
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      <Section
        title="Genres"
        donut={genreDonut}
        bar={genreBar}
        footer={
          bestGenre
            ? `Best performing genre: ${bestGenre.genre} · ${bestGenre.total_plays.toLocaleString()} plays · ${bestGenre.station_count} stations`
            : undefined
        }
      />
      <div style={{ borderTop: '1px solid var(--color-border)' }} />
      <Section
        title="Regions"
        donut={regionDonut}
        bar={regionBar}
        footer={
          bestRegion
            ? `Region with most listeners: ${bestRegion.region} · ${bestRegion.unique_listeners.toLocaleString()} unique`
            : undefined
        }
      />
    </div>
  );
}
