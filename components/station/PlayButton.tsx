import React from 'react';
import { Play, Pause, Loader2 } from 'lucide-react';

interface PlayButtonProps {
    isPlaying: boolean;
    isCurrentStation: boolean;
    isLoading?: boolean;
    isLive?: boolean;
    onPlay: () => void;
}

export const PlayButton: React.FC<PlayButtonProps> = ({
    isPlaying,
    isCurrentStation,
    isLoading,
    isLive = true,
    onPlay,
}) => {
    const getButtonText = () => {
        if (isLoading && isCurrentStation) return 'Loading...';
        if (isCurrentStation && isPlaying) return 'Now Playing';
        if (isCurrentStation) return 'Play';
        return 'Listen';
    };

    const getIcon = () => {
        if (isLoading && isCurrentStation) {
            return <Loader2 className="w-5 h-5 animate-spin" />;
        }
        if (isCurrentStation && isPlaying) {
            return <Pause className="w-5 h-5" />;
        }
        return <Play className="w-5 h-5" />;
    };

    return (
        <button
            onClick={onPlay}
            disabled={!isLive || (isLoading && isCurrentStation)}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed py-3 px-4  font-semibold transition-all duration-200 hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
        >
            {getIcon()}
            {getButtonText()}
        </button>
    );
};