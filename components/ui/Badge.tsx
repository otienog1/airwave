'use client';
import React from 'react';

type BadgeVariant = 'live' | 'listeners' | 'accent' | 'muted';

interface BadgeProps {
    variant?: BadgeVariant;
    children: React.ReactNode;
    pulse?: boolean;
    className?: string;
}

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
    live: {
        background: 'rgba(0,0,0,0.52)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        color: '#ffffff',
    },
    listeners: {
        background: 'rgba(0,0,0,0.52)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        color: 'rgba(255,255,255,0.8)',
    },
    accent: {
        background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
        color: 'var(--color-accent)',
        border: '1px solid color-mix(in srgb, var(--color-accent) 20%, transparent)',
    },
    muted: {
        background: 'var(--color-surface-raised)',
        color: 'var(--color-text-muted)',
        border: '1px solid var(--color-border)',
    },
};

export const Badge: React.FC<BadgeProps> = ({
    variant = 'muted',
    children,
    pulse = false,
    className = '',
}) => {
    return (
        <div
            className={`inline-flex items-center gap-1.5 px-2 py-[3px] rounded-full text-[11px] font-medium shrink-0 ${className}`}
            style={variantStyles[variant]}
        >
            {pulse && (
                <span
                    className="w-[5px] h-[5px] rounded-full shrink-0"
                    style={{
                        background: '#4ade80',
                        animation: 'pulse-glow 1.5s ease-in-out infinite',
                    }}
                    aria-hidden="true"
                />
            )}
            {children}
        </div>
    );
};
