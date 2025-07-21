import React from 'react';
import { Station } from '../types/Station';
import { Play, Pause, Heart, Radio, Loader2, Volume2, VolumeX } from 'lucide-react';


const AudioPlayer: React.FC<{
    currentStation: Station | null;
    isPlaying: boolean;
    volume: number;
    isMuted: boolean;
    onTogglePlay: () => void;
    onVolumeChange: (volume: number) => void;
    onMuteToggle: () => void;
    isLoading: boolean;
}> = ({ currentStation, isPlaying, volume, isMuted, onTogglePlay, onVolumeChange, onMuteToggle, isLoading }) => {
    if (!currentStation) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-t border-gray-700 backdrop-blur-lg bg-opacity-95 z-50">
            <div className="max-w-7xl mx-auto px-4 py-4">
                <div className="flex items-center gap-4">
                    {/* Station Info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
                            <Radio className="w-6 h-6 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h4 className="text-white font-semibold truncate">{currentStation.name}</h4>
                            <p className="text-gray-400 text-sm truncate">{currentStation.description}</p>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onTogglePlay}
                            disabled={isLoading}
                            className="w-12 h-12 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center transition-colors"
                        >
                            {isLoading ? (
                                <Loader2 className="w-6 h-6 text-white animate-spin" />
                            ) : isPlaying ? (
                                <Pause className="w-6 h-6 text-white" />
                            ) : (
                                <Play className="w-6 h-6 text-white ml-1" />
                            )}
                        </button>

                        {/* Volume */}
                        <div className="hidden sm:flex items-center gap-2">
                            <button
                                onClick={onMuteToggle}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                            </button>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={volume}
                                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                                className="w-20 accent-blue-600"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};