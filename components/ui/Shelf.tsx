'use client';
import React, { useRef } from 'react';

interface ShelfProps {
    title: string;
    children: React.ReactNode;
}

/**
 * Horizontal scrolling shelf with a label. Children are laid out in a
 * single row with gap and hidden scrollbar, draggable by mouse.
 */
export const Shelf: React.FC<ShelfProps> = ({ title, children }) => {
    const trackRef = useRef<HTMLDivElement>(null);
    const drag = useRef({ active: false, startX: 0, scrollLeft: 0 });

    const onMouseDown = (e: React.MouseEvent) => {
        const el = trackRef.current;
        if (!el) return;
        drag.current = { active: true, startX: e.pageX - el.offsetLeft, scrollLeft: el.scrollLeft };
        el.style.cursor = 'grabbing';
    };

    const onMouseMove = (e: React.MouseEvent) => {
        if (!drag.current.active) return;
        const el = trackRef.current;
        if (!el) return;
        const x = e.pageX - el.offsetLeft;
        el.scrollLeft = drag.current.scrollLeft - (x - drag.current.startX);
    };

    const stopDrag = () => {
        drag.current.active = false;
        if (trackRef.current) trackRef.current.style.cursor = 'grab';
    };

    return (
        <section aria-label={title}>
            <h2
                className="text-[11px] font-bold uppercase tracking-[0.14em] mb-3 px-0.5"
                style={{ color: 'var(--color-text-muted)' }}
            >
                {title}
            </h2>
            <div
                ref={trackRef}
                className="flex gap-3 overflow-x-auto pb-1 select-none"
                style={{
                    cursor: 'grab',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                }}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={stopDrag}
                onMouseLeave={stopDrag}
            >
                {children}
            </div>
        </section>
    );
};
