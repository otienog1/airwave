'use client';

import React, { useRef, useCallback, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { Heart } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
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

    const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const toastVisible = useRef(false);

    useEffect(() => {
        if (audioError) {
            if (dismissTimer.current) {
                clearTimeout(dismissTimer.current);
                dismissTimer.current = null;
            }
            if (!toastVisible.current) {
                toastVisible.current = true;
                toast.warning(audioError, {
                    id: 'audio-error',
                    duration: Infinity,
                    onDismiss: () => { toastVisible.current = false; clearError(); },
                });
            }
        } else {
            // Delay dismissal — brief null gaps during reconnect retries shouldn't flicker the toast
            dismissTimer.current = setTimeout(() => {
                toastVisible.current = false;
                toast.dismiss('audio-error');
                dismissTimer.current = null;
            }, 5000);
        }
    }, [audioError, clearError]);

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
                trendingSlot={
                    <TrendingStrip
                        stations={stations}
                        currentStation={currentStation}
                        isPlaying={isPlaying}
                        isLoading={isLoading}
                        onPlay={playStation}
                    />
                }
            />

            <div className="mt-5 sm:mt-8 mb-5 sm:mb-8 flex items-center gap-4">
                <div
                    className="h-px flex-1"
                    style={{ background: 'var(--color-border)' }}
                />
                <span
                    className="text-[9px] font-semibold uppercase tracking-widest shrink-0"
                    style={{ color: 'var(--color-text-muted)' }}
                >
                    Stations
                </span>
                <div
                    className="h-px flex-1"
                    style={{ background: 'var(--color-border)' }}
                />
            </div>

            <div className="flex items-center gap-2 mb-5">
                <button
                    onClick={() => router.push('/')}
                    className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-[11px] font-semibold uppercase tracking-widest transition-all duration-150 cursor-pointer"
                    style={
                        !showFavoritesOnly
                            ? {
                                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                  color: '#ffffff',
                                  border: '1px solid transparent',
                                  boxShadow: '0 0 0 1px rgba(99,102,241,0.4)',
                              }
                            : {
                                  background: 'var(--color-surface)',
                                  color: 'var(--color-text-secondary)',
                                  border: '1px solid var(--color-border)',
                              }
                    }
                >
                    <span>📻</span> All
                </button>
                <button
                    onClick={() => router.push('/?view=favorites')}
                    className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-[11px] font-semibold uppercase tracking-widest transition-all duration-150 cursor-pointer"
                    style={
                        showFavoritesOnly
                            ? {
                                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                  color: '#ffffff',
                                  border: '1px solid transparent',
                                  boxShadow: '0 0 0 1px rgba(99,102,241,0.4)',
                              }
                            : {
                                  background: 'var(--color-surface)',
                                  color: 'var(--color-text-secondary)',
                                  border: '1px solid var(--color-border)',
                              }
                    }
                >
                    <Heart className="w-3 h-3" /> Favourites
                </button>
            </div>

            <StationGrid
                stations={displayedStations}
                loading={stationsLoading}
                error={stationsError}
                currentStation={currentStation}
                isPlaying={isPlaying}
                isAudioLoading={isLoading || (!!audioError && !isPlaying)}
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
