import React from 'react';
import { Play, Pause, Loader2 } from 'lucide-react';

interface PlayButtonProps {
    isPlaying: boolean;
    isCurrentStation: boolean;
    isLoading?: boolean;
    isLive?: boolean;
    onPlay: () => void;
    accentColor?: string;
    gradient?: string;
}

export const PlayButton: React.FC<PlayButtonProps> = ({
    isPlaying,
    isCurrentStation,
    isLoading,
    isLive = true,
    onPlay,
    accentColor = '#6366f1',
}) => {
    const isActive = isCurrentStation && isPlaying;
    const showSpinner = Boolean(isLoading && isCurrentStation);
    const isDisabled = !isLive || showSpinner;

    const getLabel = () => {
        if (showSpinner) return 'Loading...';
        if (isActive) return 'Pause';
        if (isCurrentStation) return 'Resume';
        return 'Listen Now';
    };

    return (
        <button
            onClick={onPlay}
            disabled={isDisabled}
            className="w-full py-2.5 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.97]"
            style={{
                background: isDisabled
                    ? 'var(--color-surface-raised)'
                    : isActive
                    ? accentColor + '18'
                    : accentColor,
                color: isDisabled
                    ? 'var(--color-text-muted)'
                    : isActive
                    ? accentColor
                    : '#fff',
                border: isActive ? `1px solid ${accentColor}40` : '1px solid transparent',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                opacity: isDisabled ? 0.45 : 1,
            }}
            aria-label={getLabel()}
        >
            {showSpinner ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : isActive ? (
                <Pause className="w-3.5 h-3.5" />
            ) : isCurrentStation ? (
                <Play className="w-3.5 h-3.5" style={{ marginLeft: '1px' }} />
            ) : (
                <Play className="w-3.5 h-3.5" style={{ marginLeft: '1px' }} />
            )}
            {getLabel()}
        </button>
    );
};
