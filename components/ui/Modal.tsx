'use client';
import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { gsap } from 'gsap';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
    const [mounted, setMounted] = useState(isOpen);
    const overlayRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            setMounted(true);
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    useEffect(() => {
        if (!mounted) return;
        if (isOpen) {
            gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'power2.out' });
            gsap.fromTo(panelRef.current,
                { opacity: 0, scale: 0.92, y: 10 },
                { opacity: 1, scale: 1, y: 0, duration: 0.25, ease: 'back.out(1.4)' }
            );
        } else {
            const tl = gsap.timeline({ onComplete: () => setMounted(false) });
            tl.to(panelRef.current, { opacity: 0, scale: 0.95, y: 6, duration: 0.15, ease: 'power2.in' });
            tl.to(overlayRef.current, { opacity: 0, duration: 0.12, ease: 'power2.in' }, '-=0.05');
        }
    }, [isOpen, mounted]);

    if (!mounted) return null;

    const sizeClasses = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl' };

    return (
        <div
            ref={overlayRef}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        >
            <div
                ref={panelRef}
                className={`w-full ${sizeClasses[size]} relative max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl`}
                style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border-strong)' }}
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
