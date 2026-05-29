'use client';

import { useEffect } from 'react';

interface ErrorPageProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
    useEffect(() => {
        console.error('[app/error]', error);
    }, [error]);

    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--color-bg, #0f0f14)',
                fontFamily: 'system-ui, sans-serif',
            }}
        >
            <div
                style={{
                    textAlign: 'center',
                    maxWidth: '400px',
                    padding: '2rem',
                    borderRadius: '1rem',
                    background: 'var(--color-surface, #1a1a24)',
                    border: '1px solid rgba(99,102,241,0.2)',
                }}
            >
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📻</div>
                <h2
                    style={{
                        fontSize: '1.125rem',
                        fontWeight: 600,
                        color: 'var(--color-text-primary, #f1f5f9)',
                        marginBottom: '0.5rem',
                    }}
                >
                    Something went wrong
                </h2>
                <p
                    style={{
                        fontSize: '0.875rem',
                        color: 'var(--color-text-secondary, #94a3b8)',
                        marginBottom: '1.5rem',
                    }}
                >
                    {error.message || 'An unexpected error occurred.'}
                </p>
                <button
                    onClick={reset}
                    style={{
                        padding: '0.5rem 1.5rem',
                        borderRadius: '0.5rem',
                        background: '#6366f1',
                        color: '#fff',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                    }}
                >
                    Try again
                </button>
            </div>
        </div>
    );
}
