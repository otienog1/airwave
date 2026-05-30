'use client';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

interface Props {
  data: { name: string; value: number }[];
  color?: string;
  height?: number;
  ariaLabel?: string;
}

export function HBarChart({ data, color = '#6366f1', height = 200, ariaLabel }: Props) {
  const computedHeight = Math.max(height, data.length * 36);
  return (
    <div aria-label={ariaLabel} role="img">
      <ResponsiveContainer width="100%" height={computedHeight}>
        <BarChart layout="vertical" data={data} margin={{ left: 8, right: 32, top: 4, bottom: 4 }}>
          <XAxis
            type="number"
            tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={90}
            tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              fontSize: 12,
            }}
            cursor={{ fill: 'rgba(99,102,241,0.06)' }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} fill={color} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
