'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiService } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Mail, User, Lock, Eye, EyeOff, Check, CheckCircle2 } from 'lucide-react';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type Tab = 'profile' | 'password';

const inputStyle = {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
    outline: 'none',
    width: '100%',
} as const;

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
    const { user, updateProfile } = useAuth();
    const [tab, setTab] = useState<Tab>('profile');

    // Profile tab state
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [profileError, setProfileError] = useState('');
    const [profileSuccess, setProfileSuccess] = useState(false);
    const [profileSubmitting, setProfileSubmitting] = useState(false);

    // Password tab state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState(false);
    const [passwordSubmitting, setPasswordSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && user) {
            setUsername(user.username);
            setEmail(user.email);
            setProfileError('');
            setProfileSuccess(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setPasswordError('');
            setPasswordSuccess(false);
            setTab('profile');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setProfileError('');
        setProfileSuccess(false);
        if (!username.trim() || !email.trim()) {
            setProfileError('Username and email are required');
            return;
        }
        setProfileSubmitting(true);
        try {
            const err = await updateProfile(username.trim(), email.trim());
            if (err) {
                setProfileError(err);
            } else {
                setProfileSuccess(true);
            }
        } catch {
            setProfileError('An unexpected error occurred');
        } finally {
            setProfileSubmitting(false);
        }
    };

    const passwordRequirements = [
        { label: '8+ characters', ok: newPassword.length >= 8 },
        { label: 'Uppercase letter', ok: /[A-Z]/.test(newPassword) },
        { label: 'Lowercase letter', ok: /[a-z]/.test(newPassword) },
        { label: 'Number', ok: /\d/.test(newPassword) },
    ];
    const newPasswordValid = passwordRequirements.every(r => r.ok);
    const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess(false);
        if (!newPasswordValid) {
            setPasswordError('New password does not meet requirements');
            return;
        }
        if (!passwordsMatch) {
            setPasswordError('Passwords do not match');
            return;
        }
        setPasswordSubmitting(true);
        try {
            const res = await apiService.changePassword(currentPassword, newPassword);
            if (res.error) {
                setPasswordError(res.error);
            } else {
                setPasswordSuccess(true);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            }
        } catch {
            setPasswordError('An unexpected error occurred');
        } finally {
            setPasswordSubmitting(false);
        }
    };

    const tabStyle = (active: boolean) =>
        active
            ? {
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: '#ffffff',
                  border: '1px solid transparent',
              }
            : {
                  background: 'var(--color-surface)',
                  color: 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)',
              };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Account Settings" size="md">
            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                {(['profile', 'password'] as Tab[]).map(t => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className="flex-1 py-2 rounded-xl text-xs font-semibold uppercase tracking-widest transition-all duration-150 cursor-pointer"
                        style={tabStyle(tab === t)}
                    >
                        {t === 'profile' ? 'Profile' : 'Password'}
                    </button>
                ))}
            </div>

            {/* ── Profile tab ── */}
            {tab === 'profile' && (
                <form onSubmit={handleProfileSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                            Username
                        </label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
                            <input
                                type="text"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                required
                                placeholder="Your username"
                                className="rounded-xl pl-10 pr-4 py-2.5 text-sm w-full"
                                style={inputStyle}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                            Email Address
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                placeholder="Your email"
                                className="rounded-xl pl-10 pr-4 py-2.5 text-sm w-full"
                                style={inputStyle}
                            />
                        </div>
                    </div>

                    {profileError && (
                        <p className="text-xs px-3 py-2 rounded-lg" style={{ color: '#f87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
                            {profileError}
                        </p>
                    )}

                    {profileSuccess && (
                        <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg" style={{ color: '#4ade80', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' }}>
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            Profile updated successfully
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={profileSubmitting}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-opacity"
                        style={{
                            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                            color: 'white',
                            opacity: profileSubmitting ? 0.7 : 1,
                        }}
                    >
                        {profileSubmitting && <LoadingSpinner size="sm" />}
                        {profileSubmitting ? 'Saving…' : 'Save Changes'}
                    </button>
                </form>
            )}

            {/* ── Password tab ── */}
            {tab === 'password' && (
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    {/* Current password */}
                    <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                            Current Password
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
                            <input
                                type={showCurrent ? 'text' : 'password'}
                                value={currentPassword}
                                onChange={e => setCurrentPassword(e.target.value)}
                                required
                                placeholder="Enter current password"
                                className="rounded-xl pl-10 pr-10 py-2.5 text-sm w-full"
                                style={inputStyle}
                            />
                            <button
                                type="button"
                                onClick={() => setShowCurrent(p => !p)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 cursor-pointer"
                                style={{ color: 'var(--color-text-muted)' }}
                            >
                                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* New password */}
                    <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                            New Password
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
                            <input
                                type={showNew ? 'text' : 'password'}
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                required
                                placeholder="Enter new password"
                                className="rounded-xl pl-10 pr-10 py-2.5 text-sm w-full"
                                style={inputStyle}
                            />
                            <button
                                type="button"
                                onClick={() => setShowNew(p => !p)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 cursor-pointer"
                                style={{ color: 'var(--color-text-muted)' }}
                            >
                                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        {newPassword.length > 0 && (
                            <div className="mt-2 grid grid-cols-2 gap-1">
                                {passwordRequirements.map(({ label, ok }) => (
                                    <div key={label} className="flex items-center gap-1">
                                        <Check className="w-3 h-3 shrink-0" style={{ color: ok ? '#4ade80' : 'var(--color-text-muted)', opacity: ok ? 1 : 0.4 }} />
                                        <span className="text-xs" style={{ color: ok ? '#4ade80' : 'var(--color-text-muted)', opacity: ok ? 1 : 0.6 }}>
                                            {label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Confirm new password */}
                    <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                            Confirm New Password
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
                            <input
                                type={showConfirm ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                required
                                placeholder="Confirm new password"
                                className="rounded-xl pl-10 pr-10 py-2.5 text-sm w-full"
                                style={inputStyle}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirm(p => !p)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 cursor-pointer"
                                style={{ color: 'var(--color-text-muted)' }}
                            >
                                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        {confirmPassword.length > 0 && (
                            <div className="mt-1.5 flex items-center gap-1">
                                <Check className="w-3 h-3 shrink-0" style={{ color: passwordsMatch ? '#4ade80' : 'var(--color-text-muted)', opacity: passwordsMatch ? 1 : 0.4 }} />
                                <span className="text-xs" style={{ color: passwordsMatch ? '#4ade80' : 'var(--color-text-muted)', opacity: passwordsMatch ? 1 : 0.6 }}>
                                    Passwords match
                                </span>
                            </div>
                        )}
                    </div>

                    {passwordError && (
                        <p className="text-xs px-3 py-2 rounded-lg" style={{ color: '#f87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
                            {passwordError}
                        </p>
                    )}

                    {passwordSuccess && (
                        <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg" style={{ color: '#4ade80', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' }}>
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            Password changed successfully
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={passwordSubmitting}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-opacity"
                        style={{
                            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                            color: 'white',
                            opacity: passwordSubmitting ? 0.7 : 1,
                        }}
                    >
                        {passwordSubmitting && <LoadingSpinner size="sm" />}
                        {passwordSubmitting ? 'Changing…' : 'Change Password'}
                    </button>
                </form>
            )}
        </Modal>
    );
};
