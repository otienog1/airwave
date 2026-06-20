'use client';
import React from 'react';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    icon?: React.ReactNode;
    iconPosition?: 'left' | 'right';
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
    primary: {
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        color: '#ffffff',
        border: '1px solid transparent',
        boxShadow: '0 1px 4px rgba(99,102,241,0.35), 0 0 0 0 transparent',
    },
    secondary: {
        background: 'var(--color-surface)',
        color: 'var(--color-text-primary)',
        border: '1px solid var(--color-border-strong)',
    },
    ghost: {
        background: 'transparent',
        color: 'var(--color-text-secondary)',
        border: '1px solid transparent',
    },
    danger: {
        background: 'transparent',
        color: '#dc2626',
        border: '1px solid rgba(220,38,38,0.2)',
    },
};

const sizeClasses: Record<ButtonSize, string> = {
    sm: 'h-8  px-3   text-[12px] font-medium rounded-xl  gap-1.5',
    md: 'h-10 px-4   text-[13px] font-medium rounded-xl  gap-2',
    lg: 'h-12 px-5   text-[15px] font-semibold rounded-2xl gap-2',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({
        variant = 'secondary',
        size = 'md',
        loading = false,
        icon,
        iconPosition = 'left',
        children,
        disabled,
        className = '',
        style,
        ...props
    }, ref) => {
        const isDisabled = disabled || loading;
        return (
            <button
                ref={ref}
                disabled={isDisabled}
                className={`
                    inline-flex items-center justify-center font-medium
                    transition-all duration-150 cursor-pointer select-none
                    focus-visible:outline-none focus-visible:ring-2
                    focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2
                    active:scale-[0.97]
                    ${sizeClasses[size]}
                    ${isDisabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}
                    ${className}
                `.replace(/\s+/g, ' ').trim()}
                style={{ ...variantStyles[variant], ...style }}
                {...props}
            >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
                {!loading && icon && iconPosition === 'left' && <span className="shrink-0 flex">{icon}</span>}
                {children}
                {!loading && icon && iconPosition === 'right' && <span className="shrink-0 flex">{icon}</span>}
            </button>
        );
    }
);
Button.displayName = 'Button';
