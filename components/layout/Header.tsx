'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLayout } from '@/context/LayoutContext';
import { User, Menu } from 'lucide-react';

export const Header: React.FC = () => {
    const router = useRouter();
    const { isAuthenticated, loading } = useAuth();
    const { openDrawer, openLogin } = useLayout();

    return (
        <header
            className="sticky top-0 z-40"
            style={{
                background: 'var(--color-header-bg)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                borderBottom: '1px solid var(--color-border)',
            }}
        >
            <div className="w-full px-4 sm:px-6">
                <div className="relative flex items-center justify-between h-16">

                    {/* Left: drawer trigger (mobile only — desktop uses the sidebar) */}
                    <div className="sm:hidden">
                        {loading ? (
                            <div
                                className="w-9 h-9 rounded-full animate-pulse"
                                style={{ background: 'var(--color-surface-raised)' }}
                            />
                        ) : isAuthenticated ? (
                            <button
                                onClick={openDrawer}
                                className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer"
                                style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
                                aria-label="Open account menu"
                                aria-haspopup="dialog"
                            >
                                <User className="w-4 h-4 text-white" />
                            </button>
                        ) : (
                            <button
                                onClick={openDrawer}
                                className="icon-btn w-9 h-9"
                                aria-label="Open menu"
                                aria-haspopup="dialog"
                            >
                                <Menu className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Center: brand */}
                    <button
                        onClick={() => router.push('/')}
                        className="absolute left-1/2 -translate-x-1/2 cursor-pointer text-base font-bold uppercase tracking-widest leading-none"
                        style={{ color: 'var(--color-text-primary)' }}
                        aria-label="MBR — home"
                    >
                        MBR
                    </button>

                    {/* Right: sign-in for guests */}
                    <div className="ml-auto">
                        {!loading && !isAuthenticated && (
                            <button onClick={openLogin} className="btn-primary">
                                Sign In
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};
