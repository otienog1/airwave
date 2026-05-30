'use client';
import { useEffect, useRef, useState } from 'react';
import { fetchRealTime, type RealTimeResponse } from '@/lib/analyticsApi';

export function LiveStatusBar() {
  const [data, setData] = useState<RealTimeResponse | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = () => {
    fetchRealTime().then(setData).catch(() => {});
  };

  useEffect(() => {
    poll();
    timerRef.current = setInterval(poll, 15_000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const rt = data?.real_time;
  const today = data?.today;
  const leading = rt?.current_stations[0];

  return (
    <div
      className="flex items-center gap-4 px-5 py-2.5 text-xs overflow-x-auto rounded-xl"
      style={{
        background:
          'linear-gradient(90deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.04) 100%)',
        border: '1px solid var(--color-border)',
        color: 'var(--color-text-secondary)',
        minHeight: 40,
      }}
    >
      <span className="flex items-center gap-1.5 shrink-0">
        <span
          className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0"
          style={{ background: '#22c55e' }}
        />
        <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>
          {rt?.active_listeners ?? '—'}
        </span>
        {' '}listening now
      </span>

      <span style={{ color: 'var(--color-border)' }}>|</span>

      <span className="shrink-0">
        <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>
          {rt?.live_stations ?? '—'}
        </span>
        {' '}stations live
      </span>

      <span style={{ color: 'var(--color-border)' }}>|</span>

      <span className="shrink-0">
        <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>
          {today?.total_plays?.toLocaleString() ?? '—'}
        </span>
        {' '}plays today
      </span>

      {leading && (
        <>
          <span style={{ color: 'var(--color-border)' }}>|</span>
          <span className="shrink-0">
            Leading:{' '}
            <span style={{ color: '#6366f1', fontWeight: 600 }}>{leading.name}</span>
            {' · '}{leading.current_listeners} listeners
          </span>
        </>
      )}

      <span className="ml-auto shrink-0" style={{ color: 'var(--color-text-muted)' }}>
        ↻ 15s
      </span>
    </div>
  );
}
