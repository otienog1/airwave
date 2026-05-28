'use client';

import React, { useState } from 'react';
import { Timer, X } from 'lucide-react';

const PRESET_MINUTES = [15, 30, 60, 90];

interface SleepTimerProps {
  minutesLeft: number | null;
  isActive: boolean;
  onStart: (minutes: number) => void;
  onCancel: () => void;
}

export const SleepTimer: React.FC<SleepTimerProps> = ({
  minutesLeft,
  isActive,
  onStart,
  onCancel,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative hidden sm:block">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
        style={{
          color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)',
          background: isActive ? 'rgba(99,102,241,0.1)' : 'transparent',
        }}
        aria-label={isActive ? `Sleep timer: ${minutesLeft} min remaining` : 'Set sleep timer'}
        title={isActive ? `Stops in ${minutesLeft} min` : 'Set sleep timer'}
      >
        {isActive ? (
          <span className="text-xs font-bold tabular-nums">{minutesLeft}m</span>
        ) : (
          <Timer className="w-4 h-4" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute bottom-10 right-0 z-20 rounded-xl p-3 shadow-2xl"
            style={{
              background: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border-strong)',
              minWidth: '160px',
            }}
          >
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              Sleep timer
            </p>
            <div className="flex flex-col gap-1">
              {PRESET_MINUTES.map(m => (
                <button
                  key={m}
                  onClick={() => { onStart(m); setOpen(false); }}
                  className="text-left px-3 py-1.5 rounded-lg text-sm transition-colors"
                  style={{ color: 'var(--color-text-primary)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-overlay-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {m} minutes
                </button>
              ))}
              {isActive && (
                <button
                  onClick={() => { onCancel(); setOpen(false); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm mt-1 transition-colors"
                  style={{ color: '#f87171' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <X className="w-3.5 h-3.5" /> Cancel timer
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
