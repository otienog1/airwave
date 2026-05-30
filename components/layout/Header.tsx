'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LoginModal } from '@/components/auth/LoginModal';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Radio, User, LogOut, Settings, Heart, ChevronDown } from 'lucide-react';

export const Header: React.FC = () => {
    const router = useRouter();
    const { user, logout, isAuthenticated, loading } = useAuth();
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);

    return (
        <>
            <header
                className="sticky top-0 z-40"
                style={{
                    background: 'var(--color-header-bg)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    borderBottom: '1px solid var(--color-border)',
                }}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="flex items-center justify-between h-16">

                        {/* Logo */}
                        <button onClick={() => router.push('/')} className="flex items-center gap-3">
                            <div
                                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                                style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
                            >
                                <Radio style={{ width: '1.125rem', height: '1.125rem', color: 'white' }} />
                            </div>
                            <div>
                                <div
                                    className="text-lg font-bold tracking-tight leading-none"
                                    style={{ color: 'var(--color-text-primary)' }}
                                >
                                    AirWave
                                </div>
                                <div
                                    className="text-xs hidden sm:block leading-none mt-0.5"
                                    style={{ color: 'var(--color-text-muted)' }}
                                >
                                    Kenya&apos;s Radio
                                </div>
                            </div>
                        </button>

                        {/* Right side */}
                        <div className="flex items-center gap-2">
                            <ThemeToggle />

                            {loading ? (
                                <div
                                    className="w-9 h-9 rounded-full animate-pulse"
                                    style={{ background: 'var(--color-surface-raised)' }}
                                />
                            ) : isAuthenticated ? (
                                <div className="relative">
                                    <button
                                        onClick={() => setShowUserMenu(!showUserMenu)}
                                        className="flex items-center gap-2 rounded-xl px-3 py-2 transition-colors duration-150"
                                        style={{
                                            background: 'var(--color-surface)',
                                            border: '1px solid var(--color-border)',
                                        }}
                                        aria-label="User menu"
                                        aria-expanded={showUserMenu}
                                    >
                                        <div
                                            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                                            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
                                        >
                                            <User className="w-3.5 h-3.5 text-white" />
                                        </div>
                                        <span
                                            className="hidden sm:inline text-sm font-medium"
                                            style={{ color: 'var(--color-text-primary)' }}
                                        >
                                            {user?.username}
                                        </span>
                                        <ChevronDown
                                            className="w-3.5 h-3.5 transition-transform duration-200"
                                            style={{
                                                color: 'var(--color-text-muted)',
                                                transform: showUserMenu ? 'rotate(180deg)' : 'rotate(0deg)',
                                            }}
                                        />
                                    </button>

                                    {showUserMenu && (
                                        <>
                                            <div
                                                className="fixed inset-0 z-10"
                                                onClick={() => setShowUserMenu(false)}
                                            />
                                            <div
                                                className="absolute right-0 mt-2 w-52 rounded-xl overflow-hidden z-20 shadow-xl"
                                                style={{
                                                    background: 'var(--color-surface-raised)',
                                                    border: '1px solid var(--color-border-strong)',
                                                }}
                                            >
                                                <div
                                                    className="px-4 py-3"
                                                    style={{ borderBottom: '1px solid var(--color-border)' }}
                                                >
                                                    <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                                                        {user?.username}
                                                    </p>
                                                    <p className="text-xs truncate mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                                                        {user?.email}
                                                    </p>
                                                </div>

                                                <div className="py-1">
                                                    <button
                                                        onClick={() => { router.push('/?view=favorites'); setShowUserMenu(false); }}
                                                        className="w-full text-left px-4 py-2.5 flex items-center gap-2.5 text-sm transition-colors"
                                                        style={{ color: 'var(--color-text-secondary)' }}
                                                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-overlay-hover)')}
                                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                                    >
                                                        <Heart className="w-4 h-4" />
                                                        My Favorites
                                                    </button>

                                                    {user?.is_admin && (
                                                        <button
                                                            onClick={() => { router.push('/admin'); setShowUserMenu(false); }}
                                                            className="w-full text-left px-4 py-2.5 flex items-center gap-2.5 text-sm transition-colors"
                                                            style={{ color: 'var(--color-text-secondary)' }}
                                                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-overlay-hover)')}
                                                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                                        >
                                                            <Settings className="w-4 h-4" />
                                                            Admin Panel
                                                        </button>
                                                    )}

                                                    <div style={{ borderTop: '1px solid var(--color-border)', margin: '4px 0' }} />

                                                    <button
                                                        onClick={() => { logout(); setShowUserMenu(false); }}
                                                        className="w-full text-left px-4 py-2.5 flex items-center gap-2.5 text-sm transition-colors"
                                                        style={{ color: '#ef4444' }}
                                                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                                    >
                                                        <LogOut className="w-4 h-4" />
                                                        Sign Out
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowLoginModal(true)}
                                    className="btn-primary"
                                >
                                    Sign In
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
        </>
    );
};
