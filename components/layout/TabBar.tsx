'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Radio, BarChart2, Library } from 'lucide-react';
import { useScrollDirection } from '@/hooks/useScrollDirection';

const TABS = [
    { href: '/', label: 'Listen', icon: Radio },
    { href: '/charts', label: 'Charts', icon: BarChart2 },
    { href: '/library', label: 'Library', icon: Library },
] as const;

/**
 * Mobile bottom navigation. Hidden on sm+ where the sidebar takes over.
 * Slides out of view while scrolling down, back in on scroll up.
 */
export const TabBar: React.FC = () => {
    const pathname = usePathname();
    const { direction, atTop } = useScrollDirection();
    const hidden = direction === 'down' && !atTop;

    return (
        <nav
            className={`sm:hidden fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-out-expo ${hidden ? 'translate-y-full' : 'translate-y-0'}`}
            style={{
                background: 'var(--color-player-bg)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                borderTop: '1px solid var(--color-border)',
                paddingBottom: 'env(safe-area-inset-bottom)',
            }}
            aria-label="Primary"
        >
            <div className="flex items-stretch justify-around h-16">
                {TABS.map(({ href, label, icon: Icon }) => {
                    const active = pathname === href;
                    return (
                        <Link
                            key={href}
                            href={href}
                            className="flex flex-col items-center justify-center gap-1 flex-1 min-w-[44px] transition-colors"
                            style={{ color: active ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
                            aria-current={active ? 'page' : undefined}
                        >
                            <Icon className="w-5 h-5" />
                            <span className="text-[10px] font-semibold">{label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
};
