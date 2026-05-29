'use client';

import React, { useRef, useState, useCallback } from 'react';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useStationFilter } from '@/hooks/useStationFilter';
import { useFavorites } from '@/hooks/useFavorites';
import { HeartBurst } from '@/components/ui/HeartBurst';
import { useStreamMetadata } from '@/hooks/useStreamMetadata';
import { useAuth } from '@/context/AuthContext';
import { AudioPlayer } from '@/components/player';
import { StationGrid } from '@/components/station/StationGrid';
import { SearchAndFilters } from '@/components/station/SearchAndFilters';
import { ShortcutCheatsheet } from '@/components/ui/ShortcutCheatsheet';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useStations } from '@/hooks/useStations';
import type { Station } from '@/types/Station';

const ModernAirwave: React.FC = () => {
    const { isAuthenticated } = useAuth();

    const { stations, loading: stationsLoading, error: stationsError } = useStations({ autoFetch: true });

    const searchInputRef = useRef<HTMLInputElement>(null);
    const [isCheatsheetOpen, setIsCheatsheetOpen] = useState(false);
    const closeCheatsheet = useCallback(() => setIsCheatsheetOpen(false), []);
    const toggleCheatsheet = useCallback(() => setIsCheatsheetOpen(prev => !prev), []);

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
    } = useAudioPlayer();

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

    const { title: nowPlaying } = useStreamMetadata(
        isPlaying && currentStation ? currentStation.id : null,
        currentStation
    );

    // Adapter: useKeyboardShortcuts expects (station: Station) but useFavorites gives (stationId: number)
    const toggleFavoriteByStation = useCallback(
        (station: Station) => toggleFavorite(station.id),
        [toggleFavorite]
    );

    const shortcuts = useKeyboardShortcuts({
        togglePlay,
        toggleMute,
        handleVolumeChange,
        volume,
        playStation,
        filteredStations,
        currentStation,
        toggleFavorite: toggleFavoriteByStation,
        setSearchTerm,
        searchInputRef,
        isCheatsheetOpen,
        onToggleCheatsheet: toggleCheatsheet,
        onCloseCheatsheet: closeCheatsheet,
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
                stationCount={filteredStations.length}
            />

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
                stations={filteredStations}
                loading={stationsLoading}
                error={stationsError}
                currentStation={currentStation}
                isPlaying={isPlaying}
                isAudioLoading={isLoading}
                favorites={favorites}
                onPlay={playStation}
                onFavorite={toggleFavorite}  // raw (stationId: number) — adapter only needed for keyboard hook
                onRetry={() => {}}
                nowPlaying={nowPlaying}
            />

            <AudioPlayer
                currentStation={currentStation}
                isPlaying={isPlaying}
                volume={volume}
                isMuted={isMuted}
                onTogglePlay={togglePlay}
                onVolumeChange={handleVolumeChange}
                onMuteToggle={toggleMute}
                isLoading={isLoading}
                nowPlaying={nowPlaying}
            />
            <ShortcutCheatsheet
                isOpen={isCheatsheetOpen}
                onClose={closeCheatsheet}
                shortcuts={shortcuts}
            />
        </>
    );
};

export default ModernAirwave;
