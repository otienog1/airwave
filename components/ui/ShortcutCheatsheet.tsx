'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { ShortcutDef } from '@/hooks/useKeyboardShortcuts';

interface ShortcutCheatsheetProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: ShortcutDef[];
}

const GROUPS: ShortcutDef['group'][] = ['Playback', 'Navigation', 'App'];

export const ShortcutCheatsheet: React.FC<ShortcutCheatsheetProps> = ({
  isOpen,
  onClose,
  shortcuts,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Save and restore focus
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement;
    } else {
      triggerRef.current?.focus();
    }
  }, [isOpen]);

  // Focus trap
  useEffect(() => {
    if (!isOpen) return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusable = dialog.querySelectorAll<HTMLElement>(
      'button, [href], input, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };

    dialog.addEventListener('keydown', handleTab);
    return () => dialog.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  // Prevent background scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      aria-hidden="false"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-150"
        style={{
          background: 'var(--color-surface, #1a1a2e)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <h2
            className="text-base font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            aria-label="Close shortcuts"
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors duration-150 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcut groups */}
        {GROUPS.map((group, gi) => {
          const rows = shortcuts.filter(s => s.group === group);
          if (rows.length === 0) return null;
          return (
            <div key={group}>
              {gi > 0 && (
                <div style={{ borderTop: '1px solid var(--color-border)' }} />
              )}
              <div
                className="px-5 pt-4 pb-1 text-xs font-semibold tracking-widest uppercase"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {group}
              </div>
              {rows.map(({ label, keys }) => (
                <div
                  key={label}
                  className="flex items-center justify-between px-5 py-2"
                >
                  <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    {label}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {keys.map(k => (
                      <kbd
                        key={k}
                        className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-md text-xs font-mono"
                        style={{
                          background: 'rgba(255,255,255,0.07)',
                          border: '1px solid var(--color-border)',
                          color: 'var(--color-text-primary)',
                        }}
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        })}

        {/* Footer note */}
        <p
          className="px-5 py-3 text-xs text-center"
          style={{
            borderTop: '1px solid var(--color-border)',
            color: 'var(--color-text-muted)',
          }}
        >
          Shortcuts are disabled while typing in search
        </p>
      </div>
    </div>
  );
};
