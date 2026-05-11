'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AudioPlayer } from '@/components/player';
import { StationGrid } from '@/components/station/StationGrid';
import { SearchAndFilters } from '@/components/station/SearchAndFilters';
import type { Station } from '@/types/Station';

// Mock Station Data
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
    }
];

const ModernAirwave: React.FC = () => {
    // State management
    const [stations] = useState<Station[]>(mockStations);
    const [filteredStations, setFilteredStations] = useState<Station[]>(mockStations);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedGenre, setSelectedGenre] = useState('All');
    const [selectedRegion, setSelectedRegion] = useState('All');
    const [favorites, setFavorites] = useState<Set<number>>(new Set());
    const [currentStation, setCurrentStation] = useState<Station | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [volume, setVolume] = useState(0.8);
    const [isMuted, setIsMuted] = useState(false);
    const [audioError, setAudioError] = useState<string | null>(null);
    const [audioInitialized, setAudioInitialized] = useState(false);

    // Audio refs
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const playAttemptRef = useRef<boolean>(false);

    // Extract unique genres and regions from mock data
    const genres = ['All', ...Array.from(new Set(stations.map(station => station.genre)))];
    const regions = ['All', ...Array.from(new Set(stations.map(station => station.region)))];

    // Filter stations based on search and filters
    useEffect(() => {
        let filtered = stations;

        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(station =>
                station.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                station.description?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Apply genre filter
        if (selectedGenre !== 'All') {
            filtered = filtered.filter(station => station.genre === selectedGenre);
        }

        // Apply region filter
        if (selectedRegion !== 'All') {
            filtered = filtered.filter(station => station.region === selectedRegion);
        }

        setFilteredStations(filtered);
    }, [stations, searchTerm, selectedGenre, selectedRegion]);

    // Initialize audio only when needed (lazy initialization)
    const initializeAudio = () => {
        if (audioInitialized || audioRef.current) return;

        console.log('Initializing audio element...');

        audioRef.current = new Audio();
        audioRef.current.crossOrigin = 'anonymous';
        audioRef.current.preload = 'none';

        // Important: Don't set src here - leave it empty to avoid the error

        const audio = audioRef.current;

        const handleLoadStart = () => {
            setIsLoading(true);
            setAudioError(null);
        };

        const handleCanPlay = () => {
            console.log('Audio can play');
            setIsLoading(false);

            // If we initiated a play attempt, try to play now
            if (playAttemptRef.current) {
                playAttemptRef.current = false;
                audio.play().then(() => {
                    setIsPlaying(true);
                    console.log('Audio playing successfully');
                }).catch((error) => {
                    console.error('Autoplay failed:', error);
                    setIsPlaying(false);
                    setAudioError('Click play to start listening');
                });
            }
        };

        const handlePlay = () => {
            setIsPlaying(true);
            setIsLoading(false);
            setAudioError(null);
        };

        const handlePause = () => {
            setIsPlaying(false);
        };

        const handleEnded = () => {
            setIsPlaying(false);
        };

        const handleError = (e: Event) => {
            // Only log errors if we actually have a src set
            if (audio.src && audio.src !== window.location.href) {
                console.error('Audio error:', audio.error);
                setIsLoading(false);
                setIsPlaying(false);
                setAudioError('Failed to load audio stream');
            }
        };

        const handleWaiting = () => {
            // Only show loading if we have a valid src
            if (audio.src && audio.src !== window.location.href) {
                setIsLoading(true);
            }
        };

        const handleCanPlayThrough = () => {
            setIsLoading(false);
        };

        // Add all event listeners
        audio.addEventListener('loadstart', handleLoadStart);
        audio.addEventListener('canplay', handleCanPlay);
        audio.addEventListener('play', handlePlay);
        audio.addEventListener('pause', handlePause);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('error', handleError);
        audio.addEventListener('waiting', handleWaiting);
        audio.addEventListener('canplaythrough', handleCanPlayThrough);

        setAudioInitialized(true);
    };

    // Cleanup audio on component unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                const audio = audioRef.current;

                // Remove all event listeners
                audio.removeEventListener('loadstart', () => { });
                audio.removeEventListener('canplay', () => { });
                audio.removeEventListener('play', () => { });
                audio.removeEventListener('pause', () => { });
                audio.removeEventListener('ended', () => { });
                audio.removeEventListener('error', () => { });
                audio.removeEventListener('waiting', () => { });
                audio.removeEventListener('canplaythrough', () => { });

                // Clean stop
                audio.pause();
                audio.src = '';
                audio.load(); // Clear the audio element
            }
        };
    }, []);

    // Update volume when it changes
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = isMuted ? 0 : volume;
        }
    }, [volume, isMuted]);

    const playStation = async (station: Station) => {
        // Initialize audio on first use
        initializeAudio();

        if (!audioRef.current) return;

        const audio = audioRef.current;

        console.log('Playing station:', station.name);

        // If same station, just toggle play/pause
        if (currentStation?.id === station.id) {
            if (isPlaying) {
                audio.pause();
            } else {
                // Only try to play if we have a valid src
                if (audio.src && audio.src !== window.location.href) {
                    audio.play().catch(error => {
                        console.error('Play failed:', error);
                        setAudioError('Failed to play audio');
                    });
                } else {
                    setAudioError('No audio source available');
                }
            }
            return;
        }

        // Stop current audio if playing
        if (currentStation) {
            audio.pause();
        }

        // Set new station
        setCurrentStation(station);
        setIsPlaying(false);
        setIsLoading(true);
        setAudioError(null);
        playAttemptRef.current = true;

        // Set audio source and load
        audio.src = station.url;
        audio.volume = isMuted ? 0 : volume;
        audio.load();
    };

    const togglePlay = () => {
        if (!audioRef.current || !currentStation) return;

        const audio = audioRef.current;

        if (isPlaying) {
            audio.pause();
        } else {
            // Clear any previous error
            setAudioError(null);

            // Only try to play if we have a valid src
            if (audio.src && audio.src !== window.location.href) {
                audio.play().then(() => {
                    setIsPlaying(true);
                }).catch(error => {
                    console.error('Play failed:', error);
                    setIsPlaying(false);
                    setAudioError('Failed to play audio. Try clicking again.');
                });
            } else {
                setAudioError('No audio source available');
            }
        }
    };

    const handleVolumeChange = (newVolume: number) => {
        setVolume(newVolume);
        if (newVolume === 0) {
            setIsMuted(true);
        } else if (isMuted) {
            setIsMuted(false);
        }
    };

    const toggleMute = () => {
        setIsMuted(!isMuted);
    };

    const toggleFavorite = (stationId: number) => {
        setFavorites(prev => {
            const newFavorites = new Set(prev);
            if (newFavorites.has(stationId)) {
                newFavorites.delete(stationId);
            } else {
                newFavorites.add(stationId);
            }
            return newFavorites;
        });
    };

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

            {/* Audio Error Display */}
            {audioError && (
                <div className="mb-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                    <p className="text-yellow-400 text-sm flex items-center gap-2">
                        <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
                        {audioError}
                    </p>
                </div>
            )}

            <StationGrid
                stations={filteredStations}
                loading={false} // No API loading since we're using mock data
                error={null}    // No API errors since we're using mock data
                currentStation={currentStation}
                isPlaying={isPlaying}
                favorites={favorites}
                onPlay={playStation}
                onFavorite={toggleFavorite}
                onRetry={() => { }} // No retry needed for mock data
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
            />
        </>
    );
};

export default ModernAirwave;