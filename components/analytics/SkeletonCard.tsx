interface Props { height?: number; className?: string }

export function SkeletonCard({ height = 80, className = '' }: Props) {
  return (
    <div
      className={`rounded-xl animate-pulse ${className}`}
      style={{ height, background: 'var(--color-surface-raised)' }}
    />
  );
}
