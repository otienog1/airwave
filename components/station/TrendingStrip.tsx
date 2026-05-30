'use client';

import { useEffect, useState } from 'react';
import { fetchTrendingNow, type TrendingNowStation } from '@/lib/analyticsApi';
import { SkeletonCard } from '@/components/analytics/SkeletonCard';
import type { Station } from '@/types/Station';

interface Props {
  stations: Station[];
  currentStation: Station | null;
  onPlay: (station: Station) => void;
}

function fmt(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toLocaleString();
}

export function TrendingStrip({ stations, currentStation, onPlay }: Props) {
  const [trending, setTrending] = useState<TrendingNowStation[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetchTrendingNow()
        .then(d => { if (!cancelled) setTrending(d.stations); })
        .catch(() => { if (!cancelled) setTrending([]); });
    };
    load();
    const id = setInterval(load, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  if (trending === null) {
    return (
      <div className="mb-5">
        <div className="h-4 w-24 rounded mb-2 animate-pulse" style={{ background: 'var(--color-surface-raised)' }} />
        <div className="flex gap-3 overflow-x-auto pb-1">
          {[0, 1, 2].map(i => (
            <div key={i} className="shrink-0" style={{ width: 164 }}>
              <SkeletonCard height={88} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (trending.length === 0) return null;

  return (
    <div className="mb-5">
      <p
        className="text-xs font-semibold mb-2 uppercase"
        style={{ color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}
      >
        🔥 Trending Now
      </p>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {trending.map(t => {
          const station = stations.find(s => s.id === t.id);
          const isActive = currentStation?.id === t.id;
          return (
            <button
              key={t.id}
              onClick={() => station && onPlay(station)}
              disabled={!station}
              className="shrink-0 rounded-xl px-3 py-2.5 text-left transition-colors duration-150"
              style={{
                width: 164,
                background: isActive ? 'rgba(99,102,241,0.15)' : 'var(--color-surface-raised)',
                border: `1px solid ${isActive ? 'rgba(99,102,241,0.5)' : 'var(--color-border)'}`,
                cursor: station ? 'pointer' : 'default',
              }}
              onMouseEnter={e => {
                if (!isActive) e.currentTarget.style.background = 'rgba(99,102,241,0.08)';
              }}
              onMouseLeave={e => {
                if (!isActive) e.currentTarget.style.background = 'var(--color-surface-raised)';
              }}
            >
              <p
                className="text-xs font-semibold truncate mb-1.5"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {t.name}
              </p>
              <p className="text-xs" style={{ color: '#22c55e' }}>
                ● {fmt(t.live_listeners)} live
              </p>
              {t.growth_pct !== undefined && (
                <p className="text-xs" style={{ color: '#f59e0b' }}>
                  ↑ +{t.growth_pct.toFixed(0)}%
                </p>
              )}
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                {fmt(t.plays_today)} plays
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
