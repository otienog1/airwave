'use client';

import { useEffect, useState } from 'react';
import { fetchTrendingNow, type TrendingNowStation } from '@/lib/analyticsApi';
import { SkeletonCard } from '@/components/analytics/SkeletonCard';
import type { Station } from '@/types/Station';

interface Props {
  stations: Station[];
  currentStation: Station | null;
  isPlaying?: boolean;
  isLoading?: boolean;
  onPlay: (station: Station) => void;
}

function fmt(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toLocaleString();
}

function WaveformBars() {
  return (
    <div className="flex items-end gap-[2px] shrink-0" style={{ height: '12px' }}>
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="waveform-bar" style={{ width: '2px', height: '12px', background: '#6366f1', animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  );
}

export function TrendingStrip({ stations, currentStation, isPlaying = false, isLoading = false, onPlay }: Props) {
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
      <div>
        <div className="h-4 w-24 rounded mb-2 animate-pulse" style={{ background: 'var(--color-surface-raised)' }} />
        <div
          className="flex gap-3 overflow-x-auto pb-1 snap-x"
          style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
        >
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="snap-start shrink-0 min-w-[148px]">
              <SkeletonCard height={88} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (trending.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-semibold mb-2 uppercase" style={{ color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}>
        🔥 Trending Now
      </p>

      <div
        className="flex gap-3 overflow-x-auto pb-1 snap-x"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
        role="list"
        aria-label="Trending stations"
      >
        {trending.map(t => {
          const station = stations.find(s => s.id === t.id);
          const isActive = currentStation?.id === t.id;
          const isLiveActive = isActive && (isPlaying || isLoading);
          return (
            <div
              key={t.id}
              className="snap-start shrink-0 min-w-[148px]"
              role="listitem"
            >
              <button
                onClick={() => station && onPlay(station)}
                disabled={!station}
                className="w-full rounded-2xl p-3 text-left transition-all duration-200 relative overflow-hidden"
                style={{
                  background: isActive ? 'rgba(99,102,241,0.15)' : 'var(--color-surface)',
                  border: `1px solid ${isActive ? 'rgba(99,102,241,0.5)' : 'var(--color-border)'}`,
                  boxShadow: isLiveActive ? '0 0 0 1px rgba(99,102,241,0.3), 0 4px 16px rgba(99,102,241,0.15)' : undefined,
                  cursor: station ? 'pointer' : 'default',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'var(--color-surface)'; }}
              >
                {/* Row 1: name + waveform/indicator */}
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-[13px] font-semibold truncate" style={{ color: isActive ? '#a5b4fc' : 'var(--color-text-primary)' }}>
                    {t.name}
                  </p>
                  {isLiveActive ? <WaveformBars /> : isActive ? (
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#6366f1' }} />
                  ) : null}
                </div>

                {/* Row 2: stats */}
                <div className="flex items-center gap-2 flex-wrap">
                  {t.live_listeners > 0 && (
                    <span className="text-[11px]" style={{ color: '#22c55e' }}>● {fmt(t.live_listeners)}</span>
                  )}
                  <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{fmt(t.plays_today)} plays</span>
                  {(() => {
                    const pct = t.growth_pct ?? 0;
                    return (
                      <span className="text-[11px]" style={{ color: pct > 0 ? '#f59e0b' : 'var(--color-text-muted)' }}>
                        {pct > 0 ? '↑' : pct < 0 ? '↓' : ''}{Math.abs(pct).toFixed(0)}%
                      </span>
                    );
                  })()}
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
