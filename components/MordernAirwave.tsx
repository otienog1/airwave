'use client';

import React, { useRef, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';
import { useStationFilter } from '@/hooks/useStationFilter';
import { useFavorites } from '@/hooks/useFavorites';
import { HeartBurst } from '@/components/ui/HeartBurst';
import { useAuth } from '@/context/AuthContext';
import { usePlayer } from '@/context/PlayerContext';
import { StationGrid } from '@/components/station/StationGrid';
import { SearchAndFilters } from '@/components/station/SearchAndFilters';
import { TrendingStrip } from '@/components/station/TrendingStrip';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useStations } from '@/hooks/useStations';
import type { Station } from '@/types/Station';

const ModernAirwave: React.FC = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const showFavoritesOnly = searchParams.get('view') === 'favorites';
    const { isAuthenticated } = useAuth();

    const {
        currentStation,
        isPlaying,
        isLoading,
        volume,
        isMuted,
        error: audioError,
        playStation,
        togglePlay,
        handleVolumeChange,
        toggleMute,
        clearError,
        nowPlaying,
        listenerCounts,
    } = usePlayer();

    const { stations, loading: stationsLoading, error: stationsError, refetch: refetchStations } = useStations({ autoFetch: true });

    const searchInputRef = useRef<HTMLInputElement>(null);

    const {
        filteredStations,
        searchTerm,
        setSearchTerm,
        selectedGenre,
        setSelectedGenre,
        selectedRegion,
        setSelectedRegion,
        genres,
        regions,
    } = useStationFilter(stations);

    const { favorites, toggleFavorite, showHeart } = useFavorites(isAuthenticated);

    const displayedStations = useMemo(
        () => showFavoritesOnly ? filteredStations.filter(s => favorites.has(s.id)) : filteredStations,
        [showFavoritesOnly, filteredStations, favorites]
    );

    // Adapter: useKeyboardShortcuts expects (station: Station) but useFavorites gives (stationId: number)
    const toggleFavoriteByStation = useCallback(
        (station: Station) => toggleFavorite(station.id),
        [toggleFavorite]
    );

    useKeyboardShortcuts({
        togglePlay,
        toggleMute,
        handleVolumeChange,
        volume,
        playStation,
        filteredStations,
        currentStation,
        favorites,
        toggleFavorite: toggleFavoriteByStation,
        setSearchTerm,
        searchInputRef,
    });

    return (
        <>
            {showHeart && <HeartBurst />}

            <TrendingStrip
                stations={stations}
                currentStation={currentStation}
                onPlay={playStation}
            />

            <SearchAndFilters
                ref={searchInputRef}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                selectedGenre={selectedGenre}
                onGenreChange={setSelectedGenre}
                selectedRegion={selectedRegion}
                onRegionChange={setSelectedRegion}
                genres={genres}
                regions={regions}
                stationCount={displayedStations.length}
                loading={stationsLoading}
            />

            {showFavoritesOnly && (
                <div
                    className="mb-5 rounded-xl px-4 py-3 flex items-center gap-3"
                    style={{
                        background: 'rgba(248,113,113,0.08)',
                        border: '1px solid rgba(248,113,113,0.2)',
                    }}
                >
                    <Heart className="w-4 h-4 fill-current shrink-0" style={{ color: '#f87171' }} />
                    <span className="text-sm font-medium" style={{ color: '#f87171' }}>
                        My Favorites &mdash; {displayedStations.length} station{displayedStations.length !== 1 ? 's' : ''}
                    </span>
                    <button
                        onClick={() => router.push('/')}
                        className="ml-auto text-xs opacity-70 hover:opacity-100 transition-opacity"
                        style={{ color: '#f87171' }}
                    >
                        View all
                    </button>
                </div>
            )}

            {audioError && (
                <div
                    className="mb-5 rounded-xl p-3.5 flex items-center gap-3 text-sm"
                    style={{
                        background: 'rgba(251, 191, 36, 0.08)',
                        border: '1px solid rgba(251, 191, 36, 0.2)',
                    }}
                >
                    <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: '#fbbf24', animation: 'pulse-glow 1.5s ease-in-out infinite' }}
                    />
                    <span style={{ color: '#fbbf24' }}>{audioError}</span>
                    <button
                        onClick={clearError}
                        className="ml-auto text-xs opacity-60 hover:opacity-100"
                        style={{ color: '#fbbf24' }}
                    >
                        ✕
                    </button>
                </div>
            )}

            <StationGrid
                stations={displayedStations}
                loading={stationsLoading}
                error={stationsError}
                currentStation={currentStation}
                isPlaying={isPlaying}
                isAudioLoading={isLoading}
                favorites={favorites}
                onPlay={playStation}
                onFavorite={toggleFavorite}
                onRetry={refetchStations}
                nowPlaying={nowPlaying}
                listenerCounts={listenerCounts}
            />
        </>
    );
};

export default ModernAirwave;
