'use client';

import React, { useEffect } from 'react';
import { X, User, LogOut, Settings, UserCog, LogIn } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

interface UserDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onEditProfile: () => void;
    onSignIn: () => void;
}

export const UserDrawer: React.FC<UserDrawerProps> = ({
    isOpen,
    onClose,
    onEditProfile,
    onSignIn,
}) => {
    const router = useRouter();
    const { user, logout, isAuthenticated } = useAuth();

    useEffect(() => {
        if (!isOpen) return;
        document.body.style.overflow = 'hidden';
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = '';
            document.removeEventListener('keydown', onKey);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const itemClass =
        'w-full text-left px-4 py-3 flex items-center gap-3 text-sm rounded-xl transition-colors cursor-pointer hover:bg-[var(--color-overlay-hover)]';

    return (
        <div
            className="fixed inset-0 z-[70]"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
        >
            <aside
                className="absolute inset-y-0 left-0 w-80 max-w-[85vw] flex flex-col"
                style={{
                    background: 'var(--color-surface)',
                    borderRight: '1px solid var(--color-border-strong)',
                    paddingTop: 'env(safe-area-inset-top)',
                    paddingBottom: 'env(safe-area-inset-bottom)',
                }}
                role="dialog"
                aria-modal="true"
                aria-label="Account menu"
                onClick={e => e.stopPropagation()}
            >
                {/* Header row */}
                <div
                    className="flex items-center justify-between px-5 py-4"
                    style={{ borderBottom: '1px solid var(--color-border)' }}
                >
                    {isAuthenticated ? (
                        <div className="flex items-center gap-3 min-w-0">
                            <div
                                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                                style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
                            >
                                <User className="w-5 h-5 text-white" />
                            </div>
                            <div className="min-w-0">
                                <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
                                    {user?.username}
                                </p>
                                <p className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
                                    {user?.email}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                            Menu
                        </p>
                    )}
                    <button
                        onClick={onClose}
                        className="w-11 h-11 -mr-2 flex items-center justify-center rounded-xl transition-colors hover:bg-[var(--color-overlay-hover)] cursor-pointer"
                        style={{ color: 'var(--color-text-muted)' }}
                        aria-label="Close menu"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
                    <div className="flex items-center justify-between px-4 py-2.5 rounded-xl">
                        <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Theme</span>
                        <ThemeToggle />
                    </div>

                    <div style={{ borderTop: '1px solid var(--color-border)', margin: '8px 12px' }} />

                    {isAuthenticated ? (
                        <>
                            <button
                                onClick={() => { onEditProfile(); onClose(); }}
                                className={itemClass}
                                style={{ color: 'var(--color-text-secondary)' }}
                            >
                                <UserCog className="w-4 h-4" /> Edit Profile
                            </button>

                            {user?.is_admin && (
                                <button
                                    onClick={() => { router.push('/admin'); onClose(); }}
                                    className={itemClass}
                                    style={{ color: 'var(--color-text-secondary)' }}
                                >
                                    <Settings className="w-4 h-4" /> Admin Panel
                                </button>
                            )}
                        </>
                    ) : (
                        <button
                            onClick={() => { onSignIn(); onClose(); }}
                            className={itemClass}
                            style={{ color: 'var(--color-accent)' }}
                        >
                            <LogIn className="w-4 h-4" /> Sign In
                        </button>
                    )}
                </div>

                {isAuthenticated && (
                    <div className="px-3 py-3" style={{ borderTop: '1px solid var(--color-border)' }}>
                        <button
                            onClick={() => { logout(); onClose(); }}
                            className={itemClass}
                            style={{ color: '#ef4444' }}
                        >
                            <LogOut className="w-4 h-4" /> Sign Out
                        </button>
                    </div>
                )}
            </aside>
        </div>
    );
};
