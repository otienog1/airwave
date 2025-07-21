'use client';

import React, { useState, useEffect } from 'react';
import { AudioPlayer } from '@/components/player';
import { StationCard } from '@/components/station/StationCard'
import { Station } from '@/types/Station';
import { Radio, Search, Filter } from 'lucide-react';
import { useRef } from 'react';

const mockStations: Station[] = [
    { id: 1, name: 'Capital FM', url: 'https://atunwadigital.streamguys1.com/capitalfm', genre: 'Pop', region: 'Nairobi', listeners: 15420, isLive: true, description: 'Kenya\'s Number One Hit Music Station' },
    { id: 2, name: 'Classic 105', url: 'https://atunwadigital.streamguys1.com/classic105', genre: 'Soul', region: 'Nairobi', listeners: 12350, isLive: true, description: 'No.1 for Soul and Great Hits' },
    { id: 3, name: 'Kiss 100', url: 'https://atunwadigital.streamguys1.com/kiss100fm', genre: 'Hip Hop', region: 'Nairobi', listeners: 18920, isLive: true, description: 'Tha Beat of Nairobi' },
    { id: 4, name: 'Homeboyz Radio', url: 'https://atunwadigital.streamguys1.com/homeboyzradio', genre: 'Urban', region: 'Nairobi', listeners: 9800, isLive: true, description: '103.5 Homeboyz Radio' },
    { id: 5, name: 'Hot 96', url: 'https://hot96-atunwadigital.streamguys1.com/hot96', genre: 'Contemporary', region: 'Nairobi', listeners: 11240, isLive: true, description: 'We Play What We Want' },
    { id: 6, name: 'Ramogi FM', url: 'https://ramogifm-atunwadigital.streamguys1.com/ramogifm', genre: 'Talk', region: 'Nairobi', listeners: 7650, isLive: true, description: 'Vernacular Radio Station' },
    { id: 7, name: 'Ghetto Radio', url: 'https://stream-158.zeno.fm/eghcv7h647zuv', genre: 'Hip Hop', region: 'Nairobi', listeners: 5420, isLive: true, description: 'Mtaani Radio' },
];

const genres = ['All', 'Pop', 'Soul', 'Hip Hop', 'Urban', 'Contemporary', 'Talk'];
const regions = ['All', 'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru'];

const ModernAirwave: React.FC = () => {
    const [stations, setStations] = useState<Station[]>(mockStations);
    const [filteredStations, setFilteredStations] = useState<Station[]>(mockStations);
    const [currentStation, setCurrentStation] = useState<Station | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [volume, setVolume] = useState(0.8);
    const [isMuted, setIsMuted] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedGenre, setSelectedGenre] = useState('All');
    const [selectedRegion, setSelectedRegion] = useState('All');
    const [favorites, setFavorites] = useState<Set<number>>(new Set());

    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Initialize audio
    useEffect(() => {
        audioRef.current = new Audio();
        audioRef.current.crossOrigin = 'anonymous';

        const audio = audioRef.current;

        const handleCanPlay = () => {
            setIsLoading(false);
            if (isPlaying) {
                audio.play().catch(console.error);
            }
        };

        const handleError = () => {
            setIsLoading(false);
            setIsPlaying(false);
        };

        audio.addEventListener('canplay', handleCanPlay);
        audio.addEventListener('error', handleError);

        return () => {
            audio.removeEventListener('canplay', handleCanPlay);
            audio.removeEventListener('error', handleError);
            audio.pause();
        };
    }, []);

    // Filter stations
    useEffect(() => {
        let filtered = stations;

        if (searchTerm) {
            filtered = filtered.filter(station =>
                station.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                station.description?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (selectedGenre !== 'All') {
            filtered = filtered.filter(station => station.genre === selectedGenre);
        }

        if (selectedRegion !== 'All') {
            filtered = filtered.filter(station => station.region === selectedRegion);
        }

        setFilteredStations(filtered);
    }, [stations, searchTerm, selectedGenre, selectedRegion]);

    const playStation = (station: Station) => {
        if (!audioRef.current) return;

        const audio = audioRef.current;

        if (currentStation?.id === station.id) {
            if (isPlaying) {
                audio.pause();
                setIsPlaying(false);
            } else {
                audio.play().catch(console.error);
                setIsPlaying(true);
            }
            return;
        }

        setIsLoading(true);
        setCurrentStation(station);
        setIsPlaying(true);

        audio.src = station.url;
        audio.volume = isMuted ? 0 : volume;
        audio.load();
    };

    const togglePlay = () => {
        if (!audioRef.current || !currentStation) return;

        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.play().catch(console.error);
            setIsPlaying(true);
        }
    };

    const handleVolumeChange = (newVolume: number) => {
        setVolume(newVolume);
        if (audioRef.current) {
            audioRef.current.volume = isMuted ? 0 : newVolume;
        }
        if (newVolume === 0) {
            setIsMuted(true);
        } else if (isMuted) {
            setIsMuted(false);
        }
    };

    const toggleMute = () => {
        setIsMuted(!isMuted);
        if (audioRef.current) {
            audioRef.current.volume = !isMuted ? 0 : volume;
        }
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
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-black/20 backdrop-blur-lg border-b border-white/10">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        {/* Logo */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                                <Radio className="w-6 h-6 text-white" />
                            </div>
                            <h1 className="text-2xl font-bold text-white">AirWave</h1>
                            <span className="text-sm text-gray-400 hidden sm:inline">Kenyan Radio</span>
                        </div>

                        {/* Search */}
                        <div className="flex-1 max-w-md">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="Search stations..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="text-right">
                            <p className="text-white font-semibold">{filteredStations.length} Stations</p>
                            <p className="text-gray-400 text-sm">Kenya's Best Radio</p>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-white/10">
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-400 text-sm">Filter:</span>
                        </div>

                        <select
                            value={selectedGenre}
                            onChange={(e) => setSelectedGenre(e.target.value)}
                            className="bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {genres.map(genre => (
                                <option key={genre} value={genre} className="bg-gray-800">{genre}</option>
                            ))}
                        </select>

                        <select
                            value={selectedRegion}
                            onChange={(e) => setSelectedRegion(e.target.value)}
                            className="bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {regions.map(region => (
                                <option key={region} value={region} className="bg-gray-800">{region}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 py-8 pb-24">
                {filteredStations.length === 0 ? (
                    <div className="text-center py-16">
                        <Radio className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">No stations found</h3>
                        <p className="text-gray-400">Try adjusting your search or filters</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredStations.map((station) => (
                            <StationCard
                                key={station.id}
                                station={station}
                                isPlaying={isPlaying && currentStation?.id === station.id}
                                isCurrentStation={currentStation?.id === station.id}
                                onPlay={() => playStation(station)}
                                onFavorite={() => toggleFavorite(station.id)}
                                isFavorite={favorites.has(station.id)}
                            />
                        ))}
                    </div>
                )}
            </main>

            {/* Audio Player */}
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
        </div>
    );
};

export default ModernAirwave;