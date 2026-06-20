'use client';
import { useEffect, useState } from 'react';
import {
  fetchAudienceInsights,
  fetchSongImpact,
  fetchMetadataQuality,
  fetchRetention,
  type AudienceInsightsResponse,
  type SongImpactResponse,
  type MetadataQualityResponse,
  type RetentionResponse,
} from '@/lib/analyticsApi';
import { SkeletonCard } from './SkeletonCard';

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

function growthColor(pct: number): string {
  if (pct > 0) return 'var(--color-success)';
  if (pct < 0) return 'var(--color-error)';
  return 'var(--color-text-muted)';
}

// ── Retention cohort triangle ───────────────────────────────────────────────

function retentionColor(pct: number): string {
  // Heat: 0% → surface, 100% → accent
  const alpha = Math.round(Math.min(pct / 100, 1) * 220);
  return `rgba(99,102,241,${(alpha / 255).toFixed(2)})`;
}

export function RetentionPanel({ weeks = 8 }: { weeks?: number }) {
  const [data, setData] = useState<RetentionResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setData(null);
    setFailed(false);
    fetchRetention(weeks).then(setData).catch(() => setFailed(true));
  }, [weeks]);

  if (failed) return null;

  // Only show cohorts that have at least 1 device
  const cohorts = data?.cohorts.filter(c => c.size > 0) ?? [];
  // All unique week labels that appear in any cohort's retention array
  const allWeeks = data?.cohorts.map(c => c.week) ?? [];

  return (
    <div className="rounded-xl p-4 overflow-auto" style={cardStyle}>
      <div className="flex items-baseline justify-between mb-3">
        <p style={sectionLabel}>Weekly Retention Cohorts</p>
        {data && (
          <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            {cohorts.length} cohorts · {data.weeks} weeks · device-level, no sign-in required
          </p>
        )}
      </div>

      {data === null ? (
        <SkeletonCard height={200} />
      ) : cohorts.length === 0 ? (
        <div className="py-10 text-center space-y-2">
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            No visitor data yet — retention starts collecting the moment a user opens the app.
          </p>
          <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            Come back after a week to see your first cohort.
          </p>
        </div>
      ) : (
        <>
          <table className="w-full text-xs border-separate" style={{ borderSpacing: 2 }}>
            <thead>
              <tr>
                <th className="text-left pb-2 font-medium pr-3 whitespace-nowrap" style={{ color: 'var(--color-text-muted)' }}>
                  Cohort week
                </th>
                <th className="text-right pb-2 font-medium pr-3 whitespace-nowrap" style={{ color: 'var(--color-text-muted)' }}>
                  Users
                </th>
                {allWeeks.map(w => (
                  <th key={w} className="text-center pb-2 font-medium px-1 whitespace-nowrap" style={{ color: 'var(--color-text-muted)', minWidth: 44 }}>
                    {w.slice(5)} {/* MM-DD */}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cohorts.map(cohort => (
                <tr key={cohort.week}>
                  <td className="py-1 pr-3 font-medium whitespace-nowrap" style={{ color: 'var(--color-text-primary)' }}>
                    {cohort.week}
                  </td>
                  <td className="py-1 pr-3 text-right tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>
                    {cohort.size}
                  </td>
                  {allWeeks.map(w => {
                    const cell = cohort.retention.find(r => r.week === w);
                    if (!cell) {
                      return (
                        <td key={w} className="py-1 px-1 rounded text-center"
                          style={{ background: 'var(--color-surface)', color: 'var(--color-text-muted)' }}>
                          —
                        </td>
                      );
                    }
                    const isFirst = w === cohort.week;
                    return (
                      <td
                        key={w}
                        className="py-1 px-1 rounded text-center tabular-nums font-medium"
                        style={{
                          background: isFirst ? 'rgba(99,102,241,0.15)' : retentionColor(cell.pct),
                          color: cell.pct > 50 ? '#fff' : 'var(--color-text-primary)',
                          minWidth: 44,
                        }}
                        title={`${cell.returned} of ${cohort.size} returned (${cell.pct}%)`}
                        aria-label={`${cohort.week} cohort, week ${w}: ${cell.pct}%`}
                      >
                        {isFirst ? `${cell.pct}%` : cell.pct > 0 ? `${cell.pct}%` : '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[11px] mt-3" style={{ color: 'var(--color-text-muted)' }}>
            Each row = devices whose first visit was that week. Columns show % that returned in each subsequent week.
            Darker = higher retention.
          </p>
        </>
      )}
    </div>
  );
}

// ── 3.2 Audience: peak + week-over-week movers ──────────────────────────────

export function AudienceMoversPanel({ period }: { period: number }) {
  const [data, setData] = useState<AudienceInsightsResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setData(null);
    setFailed(false);
    fetchAudienceInsights(period).then(setData).catch(() => setFailed(true));
  }, [period]);

  if (failed) return null;

  return (
    <div className="rounded-xl p-4" style={cardStyle}>
      <p style={sectionLabel}>Station Growth (current vs previous half of period)</p>
      {data === null ? (
        <SkeletonCard height={160} />
      ) : data.movers.length === 0 ? (
        <p className="text-xs text-center py-10" style={{ color: 'var(--color-text-muted)' }}>
          Not enough snapshot data yet
        </p>
      ) : (
        <>
          {data.peak && (
            <p className="text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>
              Peak concurrent stream listeners:{' '}
              <strong className="tabular-nums" style={{ color: 'var(--color-text-primary)' }}>
                {data.peak.listeners.toLocaleString()}
              </strong>{' '}
              at {data.peak.at}
            </p>
          )}
          <ul className="space-y-2">
            {data.movers.slice(0, 8).map(m => (
              <li key={m.station_id} className="flex items-center gap-3 text-xs">
                <span className="flex-1 min-w-0 truncate font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {m.station_name}
                </span>
                <span className="tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
                  {m.previous} → {m.current}
                </span>
                <span
                  className="tabular-nums font-semibold w-16 text-right"
                  style={{ color: growthColor(m.growth_pct) }}
                >
                  {m.growth_pct > 0 ? '▲' : m.growth_pct < 0 ? '▼' : '→'} {Math.abs(m.growth_pct)}%
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

// ── 3.3 Songs: listener impact leaderboard ──────────────────────────────────

export function SongImpactPanel({ period }: { period: number }) {
  const [data, setData] = useState<SongImpactResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setData(null);
    setFailed(false);
    fetchSongImpact(period).then(setData).catch(() => setFailed(true));
  }, [period]);

  if (failed) return null;

  const list = (entries: SongImpactResponse['gainers'], empty: string) =>
    entries.length === 0 ? (
      <p className="text-xs text-center py-6" style={{ color: 'var(--color-text-muted)' }}>{empty}</p>
    ) : (
      <ul className="space-y-2">
        {entries.slice(0, 6).map(e => (
          <li key={e.title} className="flex items-center gap-3 text-xs">
            <span className="flex-1 min-w-0">
              <span className="block truncate font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {e.title}
              </span>
              <span className="block truncate" style={{ color: 'var(--color-text-muted)' }}>
                {e.plays} {e.plays === 1 ? 'airing' : 'airings'} · ~{e.avg_start} listeners at start
              </span>
            </span>
            <span
              className="tabular-nums font-semibold shrink-0"
              style={{ color: growthColor(e.avg_delta) }}
              aria-label={`average listener change ${e.avg_delta}`}
            >
              {e.avg_delta > 0 ? '+' : ''}{e.avg_delta}
            </span>
          </li>
        ))}
      </ul>
    );

  return (
    <div className="rounded-xl p-4" style={cardStyle}>
      <p style={sectionLabel}>Listener Impact — stream listener change while a song aired</p>
      {data === null ? (
        <SkeletonCard height={180} />
      ) : data.sample_size === 0 ? (
        <p className="text-xs text-center py-10" style={{ color: 'var(--color-text-muted)' }}>
          Not enough paired play/snapshot data for this period
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-success)' }}>
              Audience grew
            </p>
            {list(data.gainers.filter(g => g.avg_delta > 0), 'No gainers in this period')}
          </div>
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-error)' }}>
              Audience dropped
            </p>
            {list(data.losers, 'No losers in this period')}
          </div>
        </div>
      )}
    </div>
  );
}

// ── 3.4 Health: metadata quality ────────────────────────────────────────────

export function MetadataQualityPanel({ period }: { period: number }) {
  const [data, setData] = useState<MetadataQualityResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setData(null);
    setFailed(false);
    fetchMetadataQuality(period).then(setData).catch(() => setFailed(true));
  }, [period]);

  if (failed) return null;

  return (
    <div className="rounded-xl p-4 overflow-auto" style={cardStyle}>
      <p style={sectionLabel}>Metadata Quality</p>
      {data === null ? (
        <SkeletonCard height={200} />
      ) : data.stations.length === 0 ? (
        <p className="text-xs text-center py-10" style={{ color: 'var(--color-text-muted)' }}>
          No snapshot data for this period
        </p>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr style={{ color: 'var(--color-text-muted)' }}>
              <th className="text-left pb-2 font-medium">Station</th>
              <th className="text-right pb-2 font-medium pr-4">Uptime</th>
              <th className="text-right pb-2 font-medium pr-4">Metadata Rate</th>
              <th className="text-left pb-2 font-medium">Source</th>
              <th className="text-left pb-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.stations.map(s => (
              <tr key={s.station_id} style={{ borderTop: '1px solid var(--color-border)' }}>
                <td className="py-1.5 pr-4 font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {s.station_name}
                </td>
                <td
                  className="py-1.5 text-right tabular-nums pr-4"
                  style={{ color: s.uptime_pct >= 99 ? 'var(--color-success)' : s.uptime_pct >= 90 ? 'var(--color-warn)' : 'var(--color-error)' }}
                >
                  {s.uptime_pct}%
                </td>
                <td className="py-1.5 text-right tabular-nums pr-4" style={{ color: 'var(--color-text-primary)' }}>
                  {s.metadata_rate_pct}%
                </td>
                <td className="py-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  {s.primary_source ?? '—'}
                </td>
                <td className="py-1.5">
                  {s.stale ? (
                    <span className="font-semibold" style={{ color: 'var(--color-warn)' }}>
                      ⚠ stale — no titles in 24h
                    </span>
                  ) : (
                    <span style={{ color: 'var(--color-success)' }}>✓ healthy</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
