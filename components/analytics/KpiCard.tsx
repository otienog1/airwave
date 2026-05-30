interface Props {
  label: string;
  value: string | number;
  change?: number;
  changeSuffix?: string;
  isLive?: boolean;
  loading?: boolean;
}

export function KpiCard({ label, value, change, changeSuffix = '%', isLive, loading }: Props) {
  if (loading) {
    return (
      <div
        className="rounded-xl p-4 animate-pulse"
        style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}
      >
        <div className="h-3 rounded mb-3" style={{ background: 'var(--color-border)', width: '60%' }} />
        <div className="h-7 rounded" style={{ background: 'var(--color-border)', width: '45%' }} />
      </div>
    );
  }

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}
    >
      <div className="flex items-center gap-1.5 mb-2">
        {isLive && (
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0"
            style={{ background: '#6366f1' }}
          />
        )}
        <p
          className="text-xs font-medium uppercase"
          style={{ color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}
        >
          {label}
        </p>
      </div>
      <p
        className="text-2xl font-bold tabular-nums"
        style={{ color: 'var(--color-text-primary)' }}
        role="status"
      >
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {!isLive && change !== undefined && (
        <p
          className="text-xs mt-1.5 font-medium tabular-nums"
          style={{
            color: change > 0 ? '#22c55e' : change < 0 ? '#ef4444' : 'var(--color-text-muted)',
          }}
        >
          {change > 0
            ? `▲ +${change.toFixed(1)}${changeSuffix}`
            : change < 0
            ? `▼ ${change.toFixed(1)}${changeSuffix}`
            : '→ No change'}
        </p>
      )}
    </div>
  );
}
