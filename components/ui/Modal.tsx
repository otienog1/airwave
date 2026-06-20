'use client';
import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
    const [mounted, setMounted] = useState(isOpen);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            setMounted(true);
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    if (!mounted) return null;

    const sizeClasses = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl' };

    return (
        <div
            className={`fixed inset-0 flex items-center justify-center z-50 p-4 ${isOpen ? 'modal-overlay-enter' : 'modal-overlay-exit'}`}
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        >
            <div
                className={`w-full ${sizeClasses[size]} relative max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl ${isOpen ? 'modal-panel-enter' : 'modal-panel-exit'}`}
                style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border-strong)' }}
                onAnimationEnd={() => { if (!isOpen) setMounted(false); }}
            >
                <div
                    className="flex items-center justify-between px-6 py-4"
                    style={{ borderBottom: '1px solid var(--color-border)' }}
                >
                    <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: 'var(--color-text-muted)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-overlay-hover)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        aria-label="Close dialog"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    );
};
