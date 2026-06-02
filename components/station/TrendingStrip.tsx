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
        <div className="hidden sm:block h-4 w-24 rounded mb-2 animate-pulse" style={{ background: 'var(--color-surface-raised)' }} />
        {/* Mobile skeleton */}
        <div className="sm:hidden flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {[0, 1, 2].map(i => (
            <div key={i} className="flex-none w-[150px] rounded-xl px-3 py-2.5 animate-pulse" style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}>
              <div className="h-3 rounded w-3/4 mb-2" style={{ background: 'var(--color-overlay-hover)' }} />
              <div className="h-2.5 rounded w-1/2" style={{ background: 'var(--color-overlay-hover)' }} />
            </div>
          ))}
        </div>
        {/* Desktop skeleton */}
        <div className="hidden sm:flex gap-3">
          {[0, 1, 2].map(i => (
            <div key={i} style={{ flex: '0 0 calc(100% / 7)' }}>
              <SkeletonCard height={88} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (trending.length === 0) return null;

  const label = (
    <p className="hidden sm:block text-xs font-semibold mb-2 uppercase" style={{ color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}>
      🔥 Trending Now
    </p>
  );

  return (
    <div>
      {label}

      {/* ── Mobile: horizontally scrollable cards ───────────── */}
      <div className="sm:hidden flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {trending.map(t => {
          const station = stations.find(s => s.id === t.id);
          const isActive = currentStation?.id === t.id;
          const isLiveActive = isActive && (isPlaying || isLoading);
          return (
            <button
              key={t.id}
              onClick={() => station && onPlay(station)}
              disabled={!station}
              className="flex-none w-[150px] rounded-xl px-3 py-2.5 text-left transition-all duration-200"
              style={{
                background: isActive ? 'rgba(99,102,241,0.15)' : 'var(--color-surface-raised)',
                border: `1px solid ${isActive ? 'rgba(99,102,241,0.5)' : 'var(--color-border)'}`,
                boxShadow: isLiveActive ? '0 0 0 1px rgba(99,102,241,0.3), 0 4px 16px rgba(99,102,241,0.15)' : undefined,
                cursor: station ? 'pointer' : 'default',
              }}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-xs font-semibold truncate" style={{ color: isActive ? '#a5b4fc' : 'var(--color-text-primary)' }}>
                  {t.name}
                </p>
                {isLiveActive ? <WaveformBars /> : isActive ? (
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#6366f1' }} />
                ) : null}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {t.live_listeners > 0 && (
                  <span className="text-[10px]" style={{ color: '#22c55e' }}>● {fmt(t.live_listeners)}</span>
                )}
                <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{fmt(t.plays_today)} plays</span>
                {(() => {
                  const pct = t.growth_pct ?? 0;
                  return (
                    <span className="text-[10px]" style={{ color: pct > 0 ? '#f59e0b' : 'var(--color-text-muted)' }}>
                      {pct > 0 ? '↑' : pct < 0 ? '↓' : ''}{Math.abs(pct).toFixed(0)}%
                    </span>
                  );
                })()}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Desktop: horizontal cards ────────────────────────── */}
      <div className="hidden sm:flex gap-3">
        {trending.map(t => {
          const station = stations.find(s => s.id === t.id);
          const isActive = currentStation?.id === t.id;
          const isLiveActive = isActive && (isPlaying || isLoading);
          return (
            <button
              key={t.id}
              onClick={() => station && onPlay(station)}
              disabled={!station}
              className="rounded-xl px-3 py-2.5 text-left transition-all duration-200 relative overflow-hidden"
              style={{
                flex: '0 0 calc((100% - 6 * 0.75rem) / 7)',
                background: isActive ? 'rgba(99,102,241,0.15)' : 'var(--color-surface-raised)',
                border: `1px solid ${isActive ? 'rgba(99,102,241,0.5)' : 'var(--color-border)'}`,
                boxShadow: isLiveActive ? '0 0 0 1px rgba(99,102,241,0.3), 0 4px 16px rgba(99,102,241,0.15)' : undefined,
                cursor: station ? 'pointer' : 'default',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = isActive ? 'rgba(99,102,241,0.15)' : 'var(--color-surface-raised)'; }}
            >
              {/* Row 1: name + waveform */}
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-xs font-semibold truncate" style={{ color: isActive ? '#a5b4fc' : 'var(--color-text-primary)' }}>
                  {t.name}
                </p>
                {isLiveActive ? <WaveformBars /> : isActive ? (
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#6366f1' }} />
                ) : null}
              </div>

              {/* Row 2: stats inline */}
              <div className="flex items-center gap-2 flex-wrap">
                {t.live_listeners > 0 && (
                  <span className="text-[10px]" style={{ color: '#22c55e' }}>● {fmt(t.live_listeners)}</span>
                )}
                <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{fmt(t.plays_today)} plays</span>
                {(() => {
                  const pct = t.growth_pct ?? 0;
                  return (
                    <span className="text-[10px]" style={{ color: pct > 0 ? '#f59e0b' : 'var(--color-text-muted)' }}>
                      {pct > 0 ? '↑' : pct < 0 ? '↓' : ''}{Math.abs(pct).toFixed(0)}%
                    </span>
                  );
                })()}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
