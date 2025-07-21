import React from 'react';
import { Station } from '../types/Station';
import { Play, Pause, Heart } from 'lucide-react';

const StationCard: React.FC<{
    station: Station;
    isPlaying: boolean;
    isCurrentStation: boolean;
    onPlay: () => void;
    onFavorite: () => void;
    isFavorite: boolean;
}> = ({ station, isPlaying, isCurrentStation, onPlay, onFavorite, isFavorite }) => {
    return (
        <div className={`group relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${isCurrentStation ? 'ring-2 ring-blue-500 shadow-blue-500/25' : ''
            }`}>
            {/* Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600 opacity-90" />

            {/* Glass morphism overlay */}
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />

            {/* Content */}
            <div className="relative p-6 text-white">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                        <h3 className="font-bold text-lg mb-1 group-hover:text-blue-200 transition-colors">
                            {station.name}
                        </h3>
                        <p className="text-sm text-blue-100 opacity-90">{station.description}</p>
                    </div>
                    <button
                        onClick={onFavorite}
                        className={`p-2 rounded-full transition-all duration-200 hover:scale-110 ${isFavorite ? 'text-red-400' : 'text-white/60 hover:text-red-400'
                            }`}
                    >
                        <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
                    </button>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 mb-4 text-sm">
                    <span className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${station.isLive ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
                        {station.isLive ? 'Live' : 'Offline'}
                    </span>
                    <span className="text-blue-100">{station.listeners?.toLocaleString()} listeners</span>
                    <span className="bg-white/20 px-2 py-1 rounded-full text-xs">{station.genre}</span>
                </div>

                {/* Play Button */}
                <button
                    onClick={onPlay}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 py-3 px-4 rounded-xl font-semibold transition-all duration-200 hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                    disabled={!station.isLive}
                >
                    {isCurrentStation && isPlaying ? (
                        <>
                            <Pause className="w-5 h-5" />
                            Now Playing
                        </>
                    ) : (
                        <>
                            <Play className="w-5 h-5" />
                            {isCurrentStation ? 'Play' : 'Listen'}
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default StationCard;
