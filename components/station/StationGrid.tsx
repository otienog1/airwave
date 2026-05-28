import React from 'react';
import { StationCard } from '@/components/station/StationCard';
import { Loader2, Radio, AlertCircle } from 'lucide-react';
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
}) => {
    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center space-y-3">
                    <Loader2
                        className="w-8 h-8 mx-auto animate-spin"
                        style={{ color: '#6366f1' }}
                    />
                    <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        Loading stations...
                    </p>
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        Finding the best Kenyan radio for you
                    </p>
                </div>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
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
                    />
                );
            })}
        </div>
    );
};
