'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Radio, BarChart2, Library, User, Menu } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLayout } from '@/context/LayoutContext';

const ITEMS = [
    { href: '/', label: 'Listen', icon: Radio },
    { href: '/charts', label: 'Charts', icon: BarChart2 },
    { href: '/library', label: 'Library', icon: Library },
] as const;

/** Slim desktop navigation rail, fixed under the header. Hidden on mobile. */
export const Sidebar: React.FC = () => {
    const pathname = usePathname();
    const { user, isAuthenticated } = useAuth();
    const { openDrawer } = useLayout();
    const accountLabel = isAuthenticated ? (user?.username ?? 'Account') : 'Menu';

    return (
        <nav
            className="hidden sm:flex fixed left-0 top-16 bottom-0 z-30 w-16 flex-col items-center gap-1 pt-4"
            style={{ borderRight: '1px solid var(--color-border)' }}
            aria-label="Primary"
        >
            {/* Account drawer trigger — first item */}
            <button
                onClick={openDrawer}
                className="flex flex-col items-center justify-center gap-1 w-12 h-12 rounded-xl transition-colors hover:bg-[var(--color-overlay-hover)] cursor-pointer"
                style={{ color: 'var(--color-text-muted)' }}
                aria-label={isAuthenticated ? 'Open account menu' : 'Open menu'}
                aria-haspopup="dialog"
                title={accountLabel}
            >
                {isAuthenticated ? (
                    <span
                        className="w-7 h-7 rounded-full flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
                    >
                        <User className="w-3.5 h-3.5 text-white" />
                    </span>
                ) : (
                    <Menu className="w-5 h-5" />
                )}
                <span className="text-[9px] font-semibold max-w-full truncate px-0.5">{accountLabel}</span>
            </button>

            <div
                className="w-8 h-px my-1"
                style={{ background: 'var(--color-border)' }}
                aria-hidden="true"
            />

            {ITEMS.map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                return (
                    <Link
                        key={href}
                        href={href}
                        className="flex flex-col items-center justify-center gap-1 w-12 h-12 rounded-xl transition-colors hover:bg-[var(--color-overlay-hover)]"
                        style={{
                            color: active ? 'var(--color-accent)' : 'var(--color-text-muted)',
                            background: active ? 'var(--color-overlay-hover)' : undefined,
                        }}
                        aria-current={active ? 'page' : undefined}
                        title={label}
                    >
                        <Icon className="w-5 h-5" />
                        <span className="text-[9px] font-semibold">{label}</span>
                    </Link>
                );
            })}
        </nav>
    );
};
