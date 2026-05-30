'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiService } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Mail, Lock, User, Eye, EyeOff, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type Mode = 'login' | 'register' | 'forgot';

const inputStyle = {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
    outline: 'none',
    width: '100%',
} as const;

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
    const { login, register } = useAuth();
    const [mode, setMode] = useState<Mode>('login');
    const [formData, setFormData] = useState({ email: '', username: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [forgotSent, setForgotSent] = useState(false);

    // Always open in login mode
    useEffect(() => {
        if (isOpen) {
            setMode('login');
            setError('');
            setForgotSent(false);
        }
    }, [isOpen]);

    const reset = () => {
        setFormData({ email: '', username: '', password: '' });
        setError('');
        setShowPassword(false);
        setForgotSent(false);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleAuthSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);
        try {
            const success = mode === 'login'
                ? await login(formData.email, formData.password)
                : await register(formData.email, formData.username, formData.password);

            if (success) {
                onClose();
                reset();
            } else {
                setError(mode === 'login' ? 'Invalid email or password' : 'Registration failed');
            }
        } catch {
            setError('An unexpected error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleForgotSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);
        try {
            const res = await apiService.forgotPassword(formData.email);
            if (res.error) {
                setError(res.error);
            } else {
                setForgotSent(true);
            }
        } catch {
            setError('An unexpected error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    const switchMode = (next: Mode) => { reset(); setMode(next); };

    const titles: Record<Mode, string> = {
        login: 'Welcome Back',
        register: 'Join AirWave',
        forgot: 'Reset Password',
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={titles[mode]} size="md">
            <p className="text-sm mb-6 text-center" style={{ color: 'var(--color-text-secondary)' }}>
                {mode === 'login' && 'Sign in to your account'}
                {mode === 'register' && 'Create your account'}
                {mode === 'forgot' && 'Enter your email and we\'ll send you a reset link'}
            </p>

            {/* ── Forgot password — sent state ── */}
            {mode === 'forgot' && forgotSent ? (
                <div className="flex flex-col items-center gap-4 py-4">
                    <CheckCircle2 className="w-12 h-12" style={{ color: '#4ade80' }} />
                    <div className="text-center">
                        <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                            Check your inbox
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                            A reset link has been sent to <strong>{formData.email}</strong>.
                        </p>
                    </div>
                    <button
                        onClick={() => switchMode('login')}
                        className="flex items-center gap-1.5 text-sm mt-2"
                        style={{ color: '#6366f1' }}
                    >
                        <ArrowLeft className="w-4 h-4" /> Back to sign in
                    </button>
                </div>
            ) : (

            /* ── Forms ── */
            <form onSubmit={mode === 'forgot' ? handleForgotSubmit : handleAuthSubmit} className="space-y-4">

                {/* Email */}
                <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                        Email Address
                    </label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            required
                            placeholder="Enter your email"
                            className="rounded-xl pl-10 pr-4 py-2.5 text-sm w-full"
                            style={inputStyle}
                        />
                    </div>
                </div>

                {/* Username (register only) */}
                {mode === 'register' && (
                    <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                            Username
                        </label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
                            <input
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleInputChange}
                                required
                                placeholder="Choose a username"
                                className="rounded-xl pl-10 pr-4 py-2.5 text-sm w-full"
                                style={inputStyle}
                            />
                        </div>
                    </div>
                )}

                {/* Password (login + register only) */}
                {mode !== 'forgot' && (
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                                Password
                            </label>
                            {mode === 'login' && (
                                <button
                                    type="button"
                                    onClick={() => switchMode('forgot')}
                                    className="text-xs"
                                    style={{ color: '#6366f1' }}
                                >
                                    Forgot password?
                                </button>
                            )}
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                value={formData.password}
                                onChange={handleInputChange}
                                required
                                placeholder="Enter your password"
                                className="rounded-xl pl-10 pr-10 py-2.5 text-sm w-full"
                                style={inputStyle}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(p => !p)}
                                className="absolute right-3 top-1/2 -translate-y-1/2"
                                style={{ color: 'var(--color-text-muted)' }}
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <p className="text-xs px-3 py-2 rounded-lg" style={{ color: '#f87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
                        {error}
                    </p>
                )}

                {/* Submit */}
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-opacity"
                    style={{
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        color: 'white',
                        opacity: isSubmitting ? 0.7 : 1,
                    }}
                >
                    {isSubmitting && <LoadingSpinner size="sm" />}
                    {isSubmitting ? 'Please wait…' : mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Send Reset Link'}
                </button>

                {/* Back link for forgot mode */}
                {mode === 'forgot' && (
                    <button
                        type="button"
                        onClick={() => switchMode('login')}
                        className="w-full flex items-center justify-center gap-1.5 text-sm"
                        style={{ color: 'var(--color-text-muted)' }}
                    >
                        <ArrowLeft className="w-4 h-4" /> Back to sign in
                    </button>
                )}
            </form>
            )}

            {/* Toggle login ↔ register */}
            {mode !== 'forgot' && (
                <div className="text-center mt-5">
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
                        <button
                            onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
                            className="font-semibold"
                            style={{ color: '#6366f1' }}
                        >
                            {mode === 'login' ? 'Sign up' : 'Sign in'}
                        </button>
                    </p>
                </div>
            )}
        </Modal>
    );
};
