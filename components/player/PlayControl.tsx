'use client';

import React from 'react';
import { Play, Pause, Loader2 } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface PlayControlProps {
    isPlaying: boolean;
    isLoading: boolean;
    onTogglePlay: () => void;
}

export const PlayControl: React.FC<PlayControlProps> = ({
    isPlaying,
    isLoading,
    onTogglePlay,
}) => {
    return (
        <Tooltip>
            <TooltipTrigger asChild disabled={isLoading}>
                <button
                    onClick={onTogglePlay}
                    disabled={isLoading}
                    className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 shrink-0"
                    style={{
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        boxShadow: '0 4px 16px rgba(99, 102, 241, 0.4)',
                        opacity: isLoading ? 0.7 : 1,
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                    }}
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                    {isLoading ? (
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                    ) : isPlaying ? (
                        <Pause className="w-5 h-5 text-white" />
                    ) : (
                        <Play className="w-5 h-5 text-white" style={{ marginLeft: '2px' }} />
                    )}
                </button>
            </TooltipTrigger>
            <TooltipContent side="top" aria-label={`${isPlaying ? 'Pause' : 'Play'} (Space)`}>
                {isPlaying ? 'Pause' : 'Play'}
                <kbd data-slot="kbd">Space</kbd>
            </TooltipContent>
        </Tooltip>
    );
};
