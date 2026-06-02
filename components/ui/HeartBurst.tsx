'use client';
import React, { useRef, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { gsap } from 'gsap';

export const HeartBurst: React.FC = () => {
    const wrapperRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const el = wrapperRef.current;
        if (!el) return;
        const tl = gsap.timeline();
        tl.fromTo(el, { scale: 0, opacity: 0 }, { scale: 1.4, opacity: 1, duration: 0.2, ease: 'back.out(2)', transformOrigin: 'center' });
        tl.to(el, { scale: 1, duration: 0.15, ease: 'power2.out' });
        tl.to(el, { opacity: 0, scale: 0.8, duration: 0.25, ease: 'power2.in', delay: 0.2 });
        return () => { tl.kill(); };
    }, []);

    return (
        <div
            className="fixed inset-0 flex items-center justify-center pointer-events-none"
            style={{ zIndex: 9999 }}
        >
            <span ref={wrapperRef} style={{ display: 'inline-block' }}>
                <Heart
                    style={{
                        width: 120,
                        height: 120,
                        color: '#f43f5e',
                        fill: '#f43f5e',
                        filter: 'drop-shadow(0 0 24px rgba(244,63,94,0.6))',
                    }}
                />
            </span>
        </div>
    );
};
