'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface VolumeControlProps {
    volume: number;
    isMuted: boolean;
    onVolumeChange: (volume: number) => void;
    onMuteToggle: () => void;
}

export const VolumeControl: React.FC<VolumeControlProps> = ({
    volume,
    isMuted,
    onVolumeChange,
    onMuteToggle,
}) => {
    const [showSlider, setShowSlider] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const displayVolume = isMuted ? 0 : volume;

    // Close popup when clicking outside on small screens
    useEffect(() => {
        if (!showSlider) return;
        const handleOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setShowSlider(false);
            }
        };
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, [showSlider]);

    const handleIconClick = () => {
        if (window.innerWidth < 640) {
            setShowSlider(s => !s);
        } else {
            onMuteToggle();
        }
    };

    const sliderInput = (
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
    );

    return (
        <div ref={containerRef} className="relative flex items-center gap-2">
            <Tooltip>
                <TooltipTrigger
                    onClick={handleIconClick}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 hover:bg-white/10 active:scale-90"
                    style={{ color: isMuted ? 'var(--color-text-muted)' : 'var(--color-accent)' }}
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </TooltipTrigger>
                <TooltipContent side="top">
                    {isMuted ? 'Unmute' : 'Mute'}
                    <kbd data-slot="kbd">M</kbd>
                </TooltipContent>
            </Tooltip>

            {/* Large screens: inline horizontal slider */}
            <div className="hidden sm:block volume-wrapper">
                {sliderInput}
            </div>

            {/* Small screens: popup vertical slider above icon */}
            {showSlider && (
                <div
                    className="sm:hidden absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50
                               flex items-center justify-center rounded-xl p-2"
                    style={{
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        boxShadow: '0 -6px 20px rgba(0,0,0,0.15)',
                    }}
                >
                    <div className="volume-wrapper">
                        {sliderInput}
                    </div>
                </div>
            )}
        </div>
    );
};
