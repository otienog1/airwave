'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Layout } from '@/components/layout/Layout';
import { apiService } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Check } from 'lucide-react';

const inputStyle = {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
    outline: 'none',
    width: '100%',
} as const;

function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token') ?? '';

    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);

    if (!token) {
        return (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
                <AlertCircle className="w-12 h-12" style={{ color: '#f87171' }} />
                <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Invalid reset link</p>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    This link is missing a reset token. Please request a new one.
                </p>
                <button
                    onClick={() => router.push('/')}
                    className="mt-2 text-sm font-medium"
                    style={{ color: '#6366f1' }}
                >
                    Go home
                </button>
            </div>
        );
    }

    if (done) {
        return (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
                <CheckCircle2 className="w-12 h-12" style={{ color: '#4ade80' }} />
                <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Password updated!</p>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    Your password has been changed. You can now sign in with your new password.
                </p>
                <button
                    onClick={() => router.push('/')}
                    className="mt-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: 'white' }}
                >
                    Go to AirWave
                </button>
            </div>
        );
    }

    const requirements = [
        { label: '8+ characters',   ok: password.length >= 8 },
        { label: 'Uppercase letter', ok: /[A-Z]/.test(password) },
        { label: 'Lowercase letter', ok: /[a-z]/.test(password) },
        { label: 'Number',           ok: /\d/.test(password) },
    ];
    const passwordValid = requirements.every(r => r.ok);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!passwordValid) {
            setError('Password does not meet all requirements below');
            return;
        }
        if (password !== confirm) {
            setError('Passwords do not match');
            return;
        }

        setSubmitting(true);
        try {
            const res = await apiService.resetPassword(token, password);
            if (res.error) {
                setError(res.error);
            } else {
                setDone(true);
            }
        } catch {
            setError('An unexpected error occurred');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* New password */}
            <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                    New Password
                </label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
                    <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        placeholder="At least 8 characters"
                        className="rounded-xl pl-10 pr-10 py-2.5 text-sm"
                        style={inputStyle}
                    />
                    <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 z-10 cursor-pointer" style={{ color: 'var(--color-text-muted)' }}>
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                </div>
                {password.length > 0 && (
                    <div className="mt-2 grid grid-cols-2 gap-1">
                        {requirements.map(({ label, ok }) => (
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

            {/* Confirm password */}
            <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                    Confirm Password
                </label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
                    <input
                        type={showConfirm ? 'text' : 'password'}
                        value={confirm}
                        onChange={e => setConfirm(e.target.value)}
                        required
                        placeholder="Repeat your password"
                        className="rounded-xl pl-10 pr-10 py-2.5 text-sm"
                        style={inputStyle}
                    />
                    <button type="button" onClick={() => setShowConfirm(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 z-10 cursor-pointer" style={{ color: 'var(--color-text-muted)' }}>
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                </div>
                {confirm.length > 0 && (
                    <div className="flex items-center gap-1 mt-1.5">
                        <Check className="w-3 h-3 shrink-0" style={{ color: password === confirm ? '#4ade80' : 'var(--color-text-muted)', opacity: password === confirm ? 1 : 0.4 }} />
                        <span className="text-xs" style={{ color: password === confirm ? '#4ade80' : 'var(--color-text-muted)', opacity: password === confirm ? 1 : 0.6 }}>
                            Passwords match
                        </span>
                    </div>
                )}
            </div>

            {/* Error */}
            {error && (
                <p className="text-xs px-3 py-2 rounded-lg" style={{ color: '#f87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
                    {error}
                </p>
            )}

            <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold"
                style={{
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    color: 'white',
                    opacity: submitting ? 0.7 : 1,
                }}
            >
                {submitting && <LoadingSpinner size="sm" />}
                {submitting ? 'Updating…' : 'Set New Password'}
            </button>
        </form>
    );
}

export default function ResetPasswordPage() {
    return (
        <Layout>
            <main className="min-h-[70vh] flex items-center justify-center px-4 py-12">
                <div className="w-full max-w-md">
                    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border-strong)' }}>
                        <div className="px-6 py-5" style={{ borderBottom: '1px solid var(--color-border)' }}>
                            <h1 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                                Set a new password
                            </h1>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                                Must be at least 8 characters with uppercase, lowercase, and a digit.
                            </p>
                        </div>
                        <div className="px-6 py-6">
                            <Suspense fallback={<LoadingSpinner size="sm" />}>
                                <ResetPasswordForm />
                            </Suspense>
                        </div>
                    </div>
                </div>
            </main>
        </Layout>
    );
}
