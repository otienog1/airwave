'use client';
import React from 'react';
import { StationCard } from '@/components/station/StationCard';
import { StationRow } from '@/components/station/StationRow';
import { Radio, AlertCircle } from 'lucide-react';
import type { Station } from '@/types/Station';
import { SkeletonCard } from '@/components/ui/SkeletonCard';

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
    layout?: 'grid' | 'list';
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
    layout = 'grid',
}) => {
    const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (loading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonCard key={i} layout="card" />
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

    const rowProps = (station: Station, index: number) => {
        const isCurrent = currentStation?.id === station.id;
        return {
            station,
            isPlaying: isPlaying && isCurrent,
            isCurrentStation: isCurrent,
            isLoading: !!(isAudioLoading && isCurrent),
            onPlay: () => onPlay(station),
            onFavorite: () => onFavorite(station.id),
            isFavorite: favorites.has(station.id),
            nowPlaying: isCurrent ? nowPlaying : null,
            liveListeners: listenerCounts?.[station.id] ?? 0,
        };
    };

    return (
        <>
            {/* Mobile: always list */}
            <div className="sm:hidden space-y-0.5">
                {stations.map((station, index) => (
                    <div
                        key={station.id}
                        style={{
                            animation: 'card-enter 0.35s ease-out both',
                            animationDelay: prefersReducedMotion ? '0ms' : `${index * 30}ms`,
                        }}
                    >
                        <StationRow {...rowProps(station, index)} />
                    </div>
                ))}
            </div>

            {/* Desktop: grid or list */}
            <div className={`hidden sm:block`}>
                {layout === 'list' ? (
                    <div className="space-y-0.5">
                        {stations.map((station, index) => (
                            <div
                                key={station.id}
                                style={{
                                    animation: 'card-enter 0.35s ease-out both',
                                    animationDelay: prefersReducedMotion ? '0ms' : `${index * 30}ms`,
                                }}
                            >
                                <StationRow {...rowProps(station, index)} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {stations.map((station, index) => {
                            const isCurrent = currentStation?.id === station.id;
                            return (
                                <div
                                    key={station.id}
                                    style={{
                                        animation: 'card-enter 0.35s ease-out both',
                                        animationDelay: prefersReducedMotion ? '0ms' : `${index * 40}ms`,
                                    }}
                                >
                                    <StationCard
                                        station={station}
                                        isPlaying={isPlaying && isCurrent}
                                        isCurrentStation={isCurrent}
                                        isLoading={!!(isAudioLoading && isCurrent)}
                                        onPlay={() => onPlay(station)}
                                        onFavorite={() => onFavorite(station.id)}
                                        isFavorite={favorites.has(station.id)}
                                        nowPlaying={isCurrent ? nowPlaying : null}
                                        liveListeners={listenerCounts?.[station.id] ?? 0}
                                    />
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );
};
