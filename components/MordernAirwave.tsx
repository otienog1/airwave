'use client';

import React from 'react';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useStationFilter } from '@/hooks/useStationFilter';
import { useFavorites } from '@/hooks/useFavorites';
import { HeartBurst } from '@/components/ui/HeartBurst';
import { useStreamMetadata } from '@/hooks/useStreamMetadata';
import { useAuth } from '@/context/AuthContext';
import { AudioPlayer } from '@/components/player';
import { StationGrid } from '@/components/station/StationGrid';
import { SearchAndFilters } from '@/components/station/SearchAndFilters';
import { stations as mockStations } from '@/lib/stations';

const ModernAirwave: React.FC = () => {
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
    } = useStationFilter(mockStations);

    const { favorites, toggleFavorite, showHeart } = useFavorites(isAuthenticated);

    const { title: nowPlaying } = useStreamMetadata(
        isPlaying && currentStation ? currentStation.id : null,
        currentStation
    );

    return (
        <>
            {showHeart && <HeartBurst />}
            <SearchAndFilters
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
                loading={false}
                error={null}
                currentStation={currentStation}
                isPlaying={isPlaying}
                isAudioLoading={isLoading}
                favorites={favorites}
                onPlay={playStation}
                onFavorite={toggleFavorite}
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
        </>
    );
};

export default ModernAirwave;
