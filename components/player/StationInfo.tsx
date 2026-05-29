'use client';

import React, { useRef, useEffect } from 'react';
import { StationAvatar } from '@/components/station/StationAvatar';
import { Station } from '../../types/Station';

interface StationInfoProps {
    station: Station;
    isPlaying?: boolean;
    nowPlaying?: string | null;
    liveListeners?: number;
}

export const StationInfo: React.FC<StationInfoProps> = ({ station, isPlaying, nowPlaying, liveListeners = 0 }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const spanRef      = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        if (!containerRef.current || !spanRef.current) return;
        const spanW   = spanRef.current.offsetWidth;
        const parentW = containerRef.current.parentElement?.offsetWidth ?? spanW;
        const isSmallAndOverflow = window.innerWidth < 640 && spanW > window.innerWidth * 0.8;
        containerRef.current.style.width = isSmallAndOverflow ? `${parentW}px` : `${Math.min(spanW, parentW)}px`;
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
                        className="mt-0.5 overflow-hidden now-playing-text now-playing-container"
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
                    <p className="text-xs mt-0.5 tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
                        {liveListeners.toLocaleString()} listening now
                    </p>
                )}
            </div>
        </div>
    );
};
