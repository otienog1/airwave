'use client';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

const PALETTE = ['#6366f1', '#8b5cf6', '#d97706', '#22c55e', '#60a5fa'];

interface Props {
  data: { name: string; value: number }[];
  centerLabel?: string;
  height?: number;
  ariaLabel?: string;
}

export function DonutChart({ data, centerLabel, height = 220, ariaLabel }: Props) {
  const capped =
    data.length > 5
      ? [
          ...data.slice(0, 4),
          { name: 'Other', value: data.slice(4).reduce((s, d) => s + d.value, 0) },
        ]
      : data;

  return (
    <div aria-label={ariaLabel} role="img">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={capped} innerRadius="58%" outerRadius="78%" dataKey="value" paddingAngle={2}>
            {capped.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              fontSize: 12,
            }}
            itemStyle={{ color: 'var(--color-text-primary)' }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{
              fontSize: 11,
              color: 'var(--color-text-secondary)',
              paddingTop: 8,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      {centerLabel && (
        <p className="text-center text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
          {centerLabel}
        </p>
      )}
    </div>
  );
}
