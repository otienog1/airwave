'use client';
import React, { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { StationCard } from '@/components/station/StationCard';
import { Radio, AlertCircle } from 'lucide-react';
import type { Station } from '@/types/Station';

interface StationGridProps {
    stations: Station[];
    loading: boolean;
    error: string | null;
    currentStation: Station | null;
    isPlaying: boolean;
    isAudioLoading?: boolean;
    favorites: Set<number>;
    onPlay: (station: Station) => void;
    onFavorite: (stationId: number) => void;
    onRetry?: () => void;
    nowPlaying?: string | null;
    listenerCounts?: Record<number, number>;
}

export const StationGrid: React.FC<StationGridProps> = ({
    stations,
    loading,
    error,
    currentStation,
    isPlaying,
    isAudioLoading,
    favorites,
    onPlay,
    onFavorite,
    onRetry,
    nowPlaying,
    listenerCounts,
}) => {
    const gridRef = useRef<HTMLDivElement>(null);
    const hasAnimated = useRef(false);

    useEffect(() => {
        if (!gridRef.current || stations.length === 0 || hasAnimated.current) return;
        hasAnimated.current = true;
        const cards = Array.from(gridRef.current.children);
        gsap.fromTo(
            cards,
            { opacity: 0, y: 16 },
            { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out', stagger: 0.04, clearProps: 'transform' }
        );
    }, [stations]);

    if (loading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div
                        key={i}
                        className="rounded-2xl p-4 animate-pulse"
                        style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}
                    >
                        {/* Top row: avatar + name/desc + heart */}
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-9 h-9 rounded-xl shrink-0" style={{ background: 'var(--color-overlay-hover)' }} />
                            <div className="flex-1 space-y-2">
                                <div className="h-3.5 rounded-md w-3/4" style={{ background: 'var(--color-overlay-hover)' }} />
                                <div className="h-3 rounded-md w-1/2" style={{ background: 'var(--color-overlay-hover)' }} />
                            </div>
                            <div className="w-4 h-4 rounded-full shrink-0" style={{ background: 'var(--color-overlay-hover)' }} />
                        </div>
                        {/* Meta row: LIVE · genre */}
                        <div className="h-3 rounded-md w-2/3 mb-3" style={{ background: 'var(--color-overlay-hover)' }} />
                        {/* Play button */}
                        <div className="h-10 rounded-lg w-full" style={{ background: 'var(--color-overlay-hover)' }} />
                    </div>
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center py-20">
                <div
                    className="text-center max-w-sm p-8 rounded-2xl space-y-4"
                    style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                >
                    <AlertCircle className="w-10 h-10 mx-auto" style={{ color: '#f87171' }} />
                    <div>
                        <p className="font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                            Something went wrong
                        </p>
                        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                            {error}
                        </p>
                    </div>
                    {onRetry && (
                        <button
                            onClick={onRetry}
                            className="btn-primary mx-auto"
                        >
                            Try Again
                        </button>
                    )}
                </div>
            </div>
        );
    }

    if (stations.length === 0) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center space-y-3">
                    <Radio className="w-10 h-10 mx-auto" style={{ color: 'var(--color-text-muted)' }} />
                    <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        No stations found
                    </p>
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        Try adjusting your search or filters
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {stations.map((station) => {
                const isCurrent = currentStation?.id === station.id;
                return (
                    <StationCard
                        key={station.id}
                        station={station}
                        isPlaying={isPlaying && isCurrent}
                        isCurrentStation={isCurrent}
                        isLoading={isAudioLoading && isCurrent}
                        onPlay={() => onPlay(station)}
                        onFavorite={() => onFavorite(station.id)}
                        isFavorite={favorites.has(station.id)}
                        nowPlaying={isCurrent ? nowPlaying : null}
                        liveListeners={listenerCounts?.[station.id] ?? 0}
                    />
                );
            })}
        </div>
    );
};
