'use client';
import { useState } from 'react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CELL = 16;
const GAP = 2;

interface Props {
  data: { hour: number; day: number; count: number }[];
}

export function HeatmapGrid({ data }: Props) {
  const [tip, setTip] = useState<{ x: number; y: number; label: string } | null>(null);

  const maxCount = Math.max(1, ...data.map(d => d.count));
  const cellMap = new Map<string, number>();
  for (const d of data) cellMap.set(`${d.day}-${d.hour}`, d.count);

  const totalW = 36 + 24 * (CELL + GAP) - GAP;
  const totalH = 7 * (CELL + GAP) - GAP + 20;

  return (
    <div className="relative overflow-x-auto">
      <svg
        width={totalW}
        height={totalH}
        aria-label="24-hour by 7-day listener heatmap"
      >
        {DAYS.map((d, row) => (
          <text
            key={row}
            x={0}
            y={row * (CELL + GAP) + CELL * 0.75}
            fontSize={9}
            fill="var(--color-text-muted)"
          >
            {d}
          </text>
        ))}
        {[0, 6, 12, 18, 23].map(h => (
          <text
            key={h}
            x={36 + h * (CELL + GAP)}
            y={totalH}
            fontSize={9}
            fill="var(--color-text-muted)"
          >
            {h}h
          </text>
        ))}
        {DAYS.map((dayLabel, row) =>
          Array.from({ length: 24 }, (_, col) => {
            const count = cellMap.get(`${row}-${col}`) ?? 0;
            const opacity = count === 0 ? 0 : 0.15 + 0.85 * (count / maxCount);
            const x = 36 + col * (CELL + GAP);
            const y = row * (CELL + GAP);
            return (
              <rect
                key={`${row}-${col}`}
                x={x}
                y={y}
                width={CELL}
                height={CELL}
                rx={3}
                fill={
                  count === 0
                    ? 'var(--color-surface-raised)'
                    : `rgba(99,102,241,${opacity})`
                }
                style={{ cursor: 'default' }}
                onMouseEnter={e =>
                  setTip({
                    x: e.clientX,
                    y: e.clientY,
                    label: `${dayLabel} ${col}:00 — ${count} plays`,
                  })
                }
                onMouseLeave={() => setTip(null)}
              />
            );
          })
        )}
      </svg>
      {tip && (
        <div
          className="fixed z-50 px-2 py-1 rounded text-xs pointer-events-none"
          style={{
            left: tip.x + 12,
            top: tip.y - 28,
            background: 'var(--color-surface-raised)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
        >
          {tip.label}
        </div>
      )}
    </div>
  );
}
