import React from 'react';
import { StationCard } from '@/components/station/StationCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Radio } from 'lucide-react';
import type { Station } from '@/types/Station';

interface StationGridProps {
    stations: Station[];
    loading: boolean;
    error: string | null;
    currentStation: Station | null;
    isPlaying: boolean;
    favorites: Set<number>;
    onPlay: (station: Station) => void;
    onFavorite: (stationId: number) => void;
    onRetry?: () => void;
}

export const StationGrid: React.FC<StationGridProps> = ({
    stations,
    loading,
    error,
    currentStation,
    isPlaying,
    favorites,
    onPlay,
    onFavorite,
    onRetry
}) => {
    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="text-center">
                    <LoadingSpinner size="lg" className="text-blue-500 mx-auto mb-4" />
                    <p className="text-white text-lg">Loading stations...</p>
                    <p className="text-gray-400 text-sm">Finding the best Kenyan radio stations for you</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="max-w-md">
                    <ErrorMessage
                        message={error}
                        onRetry={onRetry}
                        className="w-full"
                    />
                </div>
            </div>
        );
    }

    if (stations.length === 0) {
        return (
            <div className="text-center py-16">
                <Radio className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No stations found</h3>
                <p className="text-gray-400">Try adjusting your search or filters</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {stations.map((station) => (
                <StationCard
                    key={station.id}
                    station={station}
                    isPlaying={isPlaying && currentStation?.id === station.id}
                    isCurrentStation={currentStation?.id === station.id}
                    onPlay={() => onPlay(station)}
                    onFavorite={() => onFavorite(station.id)}
                    isFavorite={favorites.has(station.id)}
                />
            ))}
        </div>
    );
};