'use client';
import React from 'react';
import { Play, Pause } from 'lucide-react';
import { StationArt } from '@/components/station/StationArt';
import { usePlayer } from '@/context/PlayerContext';
import { getGenreTheme } from '@/lib/genreTheme';
import { slugify } from '@/lib/slug';
import { useRouter } from 'next/navigation';
import type { Station } from '@/types/Station';

interface StationTileProps {
    station: Station;
    /** True when this tile is the currently active + playing station */
    isPlaying: boolean;
}

const TILE_SIZE = 96;

/**
 * Compact square tile for horizontal shelf layouts.
 * Tapping plays the station; tapping the mini play/pause button
 * on an active tile toggles playback without navigating.
 */
export const StationTile: React.FC<StationTileProps> = ({ station, isPlaying }) => {
    const router = useRouter();
    const { playStation, togglePlay } = usePlayer();
    const theme = getGenreTheme(station.genre);

    const handleClick = () => {
        router.push(`/station/${slugify(station.name)}`);
    };

    const handlePlayToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isPlaying) {
            togglePlay();
        } else {
            playStation(station);
        }
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            className="group shrink-0 flex flex-col gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] rounded-2xl"
            style={{ width: TILE_SIZE }}
            aria-label={`Play ${station.name}`}
        >
            {/* Art square */}
            <div
                className="relative overflow-hidden rounded-2xl"
                style={{
                    width: TILE_SIZE,
                    height: TILE_SIZE,
                    boxShadow: isPlaying
                        ? `0 0 0 2px ${theme.accent}90, 0 4px 16px ${theme.accent}30`
                        : '0 2px 8px rgba(0,0,0,0.15)',
                }}
            >
                <StationArt
                    name={station.name}
                    logoUrl={station.logo_url}
                    genre={station.genre}
                    size={TILE_SIZE}
                    radius={0}
                />

                {/* Hover / active overlay */}
                <div
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                    style={{ background: 'rgba(0,0,0,0.35)' }}
                    onClick={handlePlayToggle}
                    role="button"
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                    tabIndex={-1}
                >
                    <div
                        className="w-9 h-9 rounded-full flex items-center justify-center"
                        style={{ background: theme.accent }}
                    >
                        {isPlaying
                            ? <Pause className="w-4 h-4 text-white" />
                            : <Play className="w-4 h-4 text-white ml-0.5" />
                        }
                    </div>
                </div>

                {/* Active ring indicator */}
                {isPlaying && (
                    <div
                        className="absolute inset-0 rounded-2xl pointer-events-none"
                        style={{ boxShadow: `inset 0 0 0 2px ${theme.accent}` }}
                        aria-hidden="true"
                    />
                )}
            </div>

            {/* Label */}
            <p
                className="text-[11px] font-semibold leading-tight line-clamp-2 px-0.5"
                style={{ color: 'var(--color-text-primary)', width: TILE_SIZE }}
            >
                {station.name}
            </p>
        </button>
    );
};
