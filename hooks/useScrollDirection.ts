import { useState, useEffect } from 'react';

interface ScrollState {
    direction: 'up' | 'down';
    /** Within the first ~100px of the page */
    atTop: boolean;
}

/**
 * Scroll direction with a small jitter threshold, rAF-throttled.
 * Drives "hide on scroll down, reveal on scroll up" chrome.
 */
export function useScrollDirection(threshold = 8): ScrollState {
    const [state, setState] = useState<ScrollState>({ direction: 'up', atTop: true });

    useEffect(() => {
        let lastY = window.scrollY;
        let ticking = false;

        const onScroll = () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                const y = window.scrollY;
                const atTop = y < 100;
                if (Math.abs(y - lastY) > threshold) {
                    const direction = y > lastY ? 'down' : 'up';
                    lastY = y;
                    setState(prev =>
                        prev.direction !== direction || prev.atTop !== atTop
                            ? { direction, atTop }
                            : prev
                    );
                } else {
                    setState(prev => (prev.atTop !== atTop ? { ...prev, atTop } : prev));
                }
                ticking = false;
            });
        };

        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, [threshold]);

    return state;
}
