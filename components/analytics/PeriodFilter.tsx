'use client';
import { useRouter, useSearchParams } from 'next/navigation';

const PERIODS = [
  { value: 1,  label: 'Today' },
  { value: 7,  label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
];

interface Props { current: number }

export function PeriodFilter({ current }: Props) {
  const router = useRouter();
  const params = useSearchParams();

  const set = (p: number) => {
    const next = new URLSearchParams(params.toString());
    next.set('period', String(p));
    router.replace(`?${next.toString()}`);
  };

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Time period filter">
      {PERIODS.map(({ value, label }) => {
        const active = current === value;
        return (
          <button
            key={value}
            onClick={() => set(value)}
            aria-pressed={active}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              minHeight: 36,
              background: active ? '#6366f1' : 'var(--color-surface-raised)',
              color: active ? 'white' : 'var(--color-text-secondary)',
              border: `1px solid ${active ? '#6366f1' : 'var(--color-border)'}`,
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
