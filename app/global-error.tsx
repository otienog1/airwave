'use client';

import { useEffect } from 'react';

interface GlobalErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
    useEffect(() => {
        console.error('[app/global-error]', error);
    }, [error]);

    return (
        <html lang="en">
            <body
                style={{
                    margin: 0,
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#0f0f14',
                    fontFamily: 'system-ui, sans-serif',
                }}
            >
                <div
                    style={{
                        textAlign: 'center',
                        maxWidth: '400px',
                        padding: '2rem',
                        borderRadius: '1rem',
                        background: '#1a1a24',
                        border: '1px solid rgba(99,102,241,0.2)',
                    }}
                >
                    <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📻</div>
                    <h2
                        style={{
                            fontSize: '1.125rem',
                            fontWeight: 600,
                            color: '#f1f5f9',
                            marginBottom: '0.5rem',
                        }}
                    >
                        MBR encountered a critical error
                    </h2>
                    <p
                        style={{
                            fontSize: '0.875rem',
                            color: '#94a3b8',
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
                        Reload
                    </button>
                </div>
            </body>
        </html>
    );
}
