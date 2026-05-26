'use client';

import React from 'react';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useStationFilter } from '@/hooks/useStationFilter';
import { useFavorites } from '@/hooks/useFavorites';
import { useStreamMetadata } from '@/hooks/useStreamMetadata';
import { useAuth } from '@/context/AuthContext';
import { AudioPlayer } from '@/components/player';
import { StationGrid } from '@/components/station/StationGrid';
import { SearchAndFilters } from '@/components/station/SearchAndFilters';
import type { Station } from '@/types/Station';

const mockStations: Station[] = [
    {
        id: 1,
        name: 'Capital FM',
        description: "Kenya's No. 1 Hit Music Station",
        url: 'https://atunwadigital.streamguys1.com/capitalfm',
        genre: 'Pop',
        region: 'Nairobi',
        frequency: '98.4 FM',
        current_listeners: 15420,
        is_live: true,
        language: 'English',
        total_plays: 125430
    },
    {
        id: 2,
        name: 'Classic 105',
        description: 'No.1 for Soul and Great Hits',
        url: 'https://atunwadigital.streamguys1.com/classic105',
        genre: 'Soul',
        region: 'Nairobi',
        frequency: '105.2 FM',
        current_listeners: 12350,
        is_live: true,
        language: 'English',
        total_plays: 98760
    },
    {
        id: 3,
        name: 'Kiss 100',
        description: 'Tha Beat of Nairobi',
        url: 'https://atunwadigital.streamguys1.com/kiss100fm',
        genre: 'Hip Hop',
        region: 'Nairobi',
        frequency: '100.3 FM',
        current_listeners: 18920,
        is_live: true,
        language: 'English',
        total_plays: 156890
    },
    {
        id: 4,
        name: 'Homeboyz Radio',
        description: '103.5 Homeboyz Radio',
        url: 'https://atunwadigital.streamguys1.com/homeboyzradio',
        genre: 'Urban',
        region: 'Nairobi',
        frequency: '103.5 FM',
        current_listeners: 9800,
        is_live: true,
        language: 'English',
        total_plays: 87230
    },
    {
        id: 5,
        name: 'Hot 96',
        description: 'We Play What We Want',
        url: 'https://hot96-atunwadigital.streamguys1.com/hot96',
        genre: 'Contemporary',
        region: 'Nairobi',
        frequency: '96.0 FM',
        current_listeners: 11240,
        is_live: true,
        language: 'English',
        total_plays: 76540
    },
    {
        id: 6,
        name: 'Ramogi FM',
        description: 'Vernacular Radio Station',
        url: 'https://ramogifm-atunwadigital.streamguys1.com/ramogifm',
        genre: 'Talk',
        region: 'Nairobi',
        frequency: '107.1 FM',
        current_listeners: 7650,
        is_live: true,
        language: 'Luo',
        total_plays: 45320
    },
    {
        id: 7,
        name: 'Ghetto Radio',
        description: 'Mtaani Radio',
        url: 'https://stream-158.zeno.fm/eghcv7h647zuv',
        genre: 'Hip Hop',
        region: 'Nairobi',
        current_listeners: 5420,
        is_live: true,
        language: 'Swahili',
        total_plays: 34210
    },
    {
        id: 8,
        name: 'Radio Citizen',
        description: 'Citizen Radio - Mzalendo',
        url: 'https://radiocitizen-atunwadigital.streamguys1.com/radiocitizen',
        genre: 'News',
        region: 'Nairobi',
        frequency: '106.7 FM',
        current_listeners: 13450,
        is_live: true,
        language: 'English',
        total_plays: 89760
    },
    {
        id: 9,
        name: 'Radio Maisha',
        description: 'Maisha ni Yetu',
        url: 'https://radiomaisha-atunwadigital.streamguys1.com/radiomaisha',
        genre: 'Contemporary',
        region: 'Nairobi',
        frequency: '102.7 FM',
        current_listeners: 16780,
        is_live: true,
        language: 'Swahili',
        total_plays: 112340
    },
    {
        id: 10,
        name: 'NRG Radio',
        description: 'Energy to the Max',
        url: 'https://uksouth.streaming.broadcast.radio/nrg',
        genre: 'Dance',
        region: 'Nairobi',
        frequency: '100.9 FM',
        current_listeners: 8920,
        is_live: true,
        language: 'English',
        total_plays: 67890
    },
    {
        id: 11,
        name: 'Kass FM',
        description: 'Kalenjin Community Radio',
        url: 'https://stream-158.zeno.fm/mr4w3nu1qzzuv',
        genre: 'Talk',
        region: 'Nakuru',
        frequency: '89.1 FM',
        current_listeners: 4320,
        is_live: true,
        language: 'Kalenjin',
        total_plays: 28760
    },
    {
        id: 12,
        name: 'Radio Jambo',
        description: 'Redio ya Kwanza Kenya',
        url: 'https://atunwadigital.streamguys1.com/radiojambo',
        genre: 'Talk',
        region: 'Nairobi',
        frequency: '97.5 FM',
        current_listeners: 9870,
        is_live: true,
        language: 'Swahili',
        total_plays: 78650
    },
    {
        id: 13,
        name: 'Hope FM',
        description: "Nairobi's Inspirational Radio",
        url: 'https://a5.asurahosting.com:7530/radio.mp3',
        genre: 'Contemporary',
        region: 'Nairobi',
        frequency: '93.3 FM',
        is_live: true,
        language: 'English',
        current_listeners: 6200,
        total_plays: 41500
    },
    {
        id: 14,
        name: 'Inooro FM',
        description: 'Gîkûyû Community Radio',
        url: 'https://inoorofm-atunwadigital.streamguys1.com/inoorofm',
        genre: 'Talk',
        region: 'Nairobi',
        frequency: '88.9 FM',
        is_live: true,
        language: 'Kikuyu',
        current_listeners: 8100,
        total_plays: 62300
    },
    {
        id: 15,
        name: 'Family Radio',
        description: 'Wholesome Family Entertainment',
        url: 'https://uksoutha.streaming.broadcast.radio/familyradio',
        genre: 'Contemporary',
        region: 'Nairobi',
        frequency: '103.9 FM',
        is_live: true,
        language: 'English',
        current_listeners: 5400,
        total_plays: 38900
    },
    {
        id: 16,
        name: 'Waumini FM',
        description: 'Catholic Radio Kenya',
        url: 'https://stream-282.zeno.fm/gvk894g072quv',
        genre: 'Talk',
        region: 'Nairobi',
        frequency: '88.3 FM',
        is_live: true,
        language: 'Swahili',
        current_listeners: 3800,
        total_plays: 27100
    },
    {
        id: 17,
        name: 'Mulembe FM',
        description: 'Luhya Community Radio',
        url: 'https://atunwadigital.streamguys1.com/mulembefm',
        genre: 'Talk',
        region: 'Nairobi',
        frequency: '97.9 FM',
        is_live: true,
        language: 'Luhya',
        current_listeners: 4600,
        total_plays: 31200
    },
    {
        id: 18,
        name: 'KBC English Service',
        description: "Kenya's National Broadcaster",
        url: 'https://stream-285.zeno.fm/c0myzdb71s8uv',
        genre: 'News',
        region: 'Nairobi',
        frequency: '95.6 FM',
        is_live: true,
        language: 'English',
        current_listeners: 11200,
        total_plays: 84700
    }
];

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

    const { favorites, toggleFavorite } = useFavorites(isAuthenticated);

    const { title: nowPlaying } = useStreamMetadata(
        isPlaying && currentStation ? currentStation.url : null,
        currentStation
    );

    return (
        <>
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
