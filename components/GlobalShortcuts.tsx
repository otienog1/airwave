'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { ShortcutCheatsheet } from '@/components/ui/ShortcutCheatsheet';
import { SHORTCUTS } from '@/hooks/useKeyboardShortcuts';

function isInputFocused(): boolean {
  const tag = document.activeElement?.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

export function GlobalShortcuts() {
  const { theme, setTheme } = useTheme();
  const [isCheatsheetOpen, setIsCheatsheetOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isCheatsheetOpen) { setIsCheatsheetOpen(false); return; }
        return;
      }
      if (isInputFocused()) return;
      switch (e.key) {
        case 't':
        case 'T':
          setTheme(theme === 'light' ? 'dark' : 'light');
          break;
        case '?':
          setIsCheatsheetOpen(prev => !prev);
          break;
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [theme, setTheme, isCheatsheetOpen]);

  return (
    <ShortcutCheatsheet
      isOpen={isCheatsheetOpen}
      onClose={() => setIsCheatsheetOpen(false)}
      shortcuts={SHORTCUTS}
    />
  );
}
