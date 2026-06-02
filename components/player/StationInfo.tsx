'use client';

import React, { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { StationAvatar } from '@/components/station/StationAvatar';
import { Station } from '../../types/Station';

const GENRE_COLORS: Record<string, string> = {
    Pop:          '#ec4899',
    Soul:         '#f59e0b',
    'Hip Hop':    '#7c3aed',
    Urban:        '#4f46e5',
    Contemporary: '#059669',
    Talk:         '#3b82f6',
    News:         '#1d4ed8',
    Dance:        '#0891b2',
};

interface StationInfoProps {
    station: Station;
    isPlaying?: boolean;
    nowPlaying?: string | null;
    liveListeners?: number;
}

export const StationInfo: React.FC<StationInfoProps> = ({ station, isPlaying, nowPlaying, liveListeners = 0 }) => {
    const accentColor = (station.genre ? GENRE_COLORS[station.genre] : undefined) ?? '#6366f1';
    const containerRef = useRef<HTMLDivElement>(null);
    const spanRef      = useRef<HTMLSpanElement>(null);

    // Resize container to fit text (marquee width calculation)
    useEffect(() => {
        if (!containerRef.current || !spanRef.current) return;
        const spanW   = spanRef.current.offsetWidth;
        const parentW = containerRef.current.parentElement?.offsetWidth ?? spanW;
        const isSmallAndOverflow = window.innerWidth < 640 && spanW > window.innerWidth * 0.8;
        containerRef.current.style.width = isSmallAndOverflow ? `${parentW}px` : `${Math.min(spanW, parentW)}px`;
    }, [nowPlaying]);

    // Animate in on each new song
    useEffect(() => {
        if (!containerRef.current || !nowPlaying) return;
        gsap.fromTo(
            containerRef.current,
            { opacity: 0, y: 4 },
            { opacity: 1, y: 0, duration: 0.22, ease: 'power2.out' }
        );
    }, [nowPlaying]);

    return (
        <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative">
                <StationAvatar
                    name={station.name}
                    logoUrl={station.logo_url}
                    size={44}
                    hideInitials={isPlaying}
                />
                {isPlaying && (
                    <div
                        className="absolute inset-0 rounded-xl flex items-center justify-center"
                        style={{ background: 'rgba(99,102,241,0.15)' }}
                    >
                        <div className="flex items-end gap-0.5" style={{ height: '18px' }}>
                            {[0, 1, 2, 3].map(i => (
                                <div
                                    key={i}
                                    className="waveform-bar"
                                    style={{ background: '#6366f1', animationDelay: `${i * 0.15}s` }}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="min-w-0 flex-1">
                <h4
                    className="font-semibold text-sm leading-tight truncate"
                    style={{ color: 'var(--color-text-primary)' }}
                >
                    {station.name}
                </h4>
                {nowPlaying && (
                    <div
                        key={nowPlaying}
                        ref={containerRef}
                        className="mt-0.5 overflow-hidden now-playing-container"
                    >
                        <div className="now-playing-track">
                            <span ref={spanRef} className="text-xs pr-10" style={{ color: 'var(--color-accent)' }}>
                                <span className="music-note-icon">♪</span>{' '}{nowPlaying}
                            </span>
                            <span className="text-xs pr-10 now-playing-copy" style={{ color: 'var(--color-accent)' }}>
                                <span className="music-note-icon">♪</span>{' '}{nowPlaying}
                            </span>
                        </div>
                    </div>
                )}
                {liveListeners > 0 && (
                    <div className="flex items-center gap-1 mt-0.5">
                        <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ background: accentColor, opacity: 0.8 }}
                        />
                        <span className="text-xs tabular-nums" style={{ color: accentColor }}>
                            {liveListeners.toLocaleString()} listening now
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};
