'use client';

import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface VolumeControlProps {
    volume: number;
    isMuted: boolean;
    onVolumeChange: (volume: number) => void;
    onMuteToggle: () => void;
}

/**
 * Volume UI follows platform convention: the slider renders only on
 * pointer (mouse/trackpad) devices — touch users adjust volume with
 * hardware buttons. The icon is always a mute toggle.
 */
export const VolumeControl: React.FC<VolumeControlProps> = ({
    volume,
    isMuted,
    onVolumeChange,
    onMuteToggle,
}) => {
    const displayVolume = isMuted ? 0 : volume;

    return (
        <div className="flex items-center gap-2">
            <Tooltip>
                <TooltipTrigger
                    type="button"
                    onClick={onMuteToggle}
                    className="w-11 h-11 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all duration-150 hover:bg-white/10 active:scale-90"
                    style={{ color: isMuted ? 'var(--color-text-muted)' : 'var(--color-accent)' }}
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                    aria-pressed={isMuted}
                >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </TooltipTrigger>
                <TooltipContent side="top" aria-label={`${isMuted ? 'Unmute' : 'Mute'} (M)`}>
                    {isMuted ? 'Unmute' : 'Mute'}
                    <kbd data-slot="kbd">M</kbd>
                </TooltipContent>
            </Tooltip>

            {/* Pointer devices only */}
            <div className="pointer-only volume-wrapper">
                <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={displayVolume}
                    onChange={(e) => onVolumeChange(Number(e.target.value))}
                    className="volume-slider"
                    aria-label="Volume"
                    style={{ '--vol-pct': `${displayVolume * 100}%` } as React.CSSProperties}
                />
            </div>
        </div>
    );
};
