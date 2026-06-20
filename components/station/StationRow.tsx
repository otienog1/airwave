'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { Play, Pause, Heart } from 'lucide-react';
import { StationArt } from './StationArt';
import { Badge } from '@/components/ui/Badge';
import { Waveform } from '@/components/ui/Waveform';
import { getGenreTheme } from '@/lib/genreTheme';
import { slugify } from '@/lib/slug';
import type { Station } from '@/types/Station';

interface StationRowProps {
    station: Station;
    isPlaying: boolean;
    isCurrentStation: boolean;
    isLoading?: boolean;
    onPlay: () => void;
    onFavorite?: () => void;
    isFavorite?: boolean;
    liveListeners?: number;
    nowPlaying?: string | null;
}

/** Compact list row: art · name/meta · listeners · heart · play. */
export const StationRow: React.FC<StationRowProps> = ({
    station,
    isPlaying,
    isCurrentStation,
    isLoading,
    onPlay,
    onFavorite,
    isFavorite = false,
    liveListeners = 0,
    nowPlaying,
}) => {
    const router = useRouter();
    const theme = getGenreTheme(station.genre);

    return (
        <div
            className="flex items-center gap-3 py-2 px-3 -mx-3 rounded-xl transition-colors hover:bg-[var(--color-overlay-hover)]"
            style={isCurrentStation ? { background: 'var(--color-overlay-hover)' } : undefined}
        >
            <button
                type="button"
                onClick={() => router.push(`/station/${slugify(station.name)}`)}
                className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer"
                aria-label={`Open ${station.name}`}
            >
                <StationArt
                    name={station.name}
                    logoUrl={station.logo_url}
                    genre={station.genre}
                    size={44}
                    radius={12}
                />
                <span className="flex-1 min-w-0">
                    <span
                        className="block text-sm font-semibold truncate"
                        style={{ color: isCurrentStation ? theme.accent : 'var(--color-text-primary)' }}
                    >
                        {station.name}
                    </span>
                    {isCurrentStation && nowPlaying ? (
                        <span className="flex items-center gap-1.5 text-xs truncate" style={{ color: theme.accent }}>
                            <Waveform isAnimating={isPlaying} bars={3} height={12} color="var(--color-accent)" />
                            {nowPlaying}
                        </span>
                    ) : (
                        <span className="block text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                            {[station.frequency, station.genre].filter(Boolean).join(' · ')}
                        </span>
                    )}
                </span>
            </button>

            {liveListeners > 0 && (
                <span className="flex items-center gap-1.5 shrink-0">
                    <Badge variant="live" pulse>Live</Badge>
                    <span
                        className="text-xs tabular-nums"
                        style={{ color: 'var(--color-text-muted)' }}
                        aria-label={`${liveListeners.toLocaleString()} listening`}
                    >
                        {liveListeners.toLocaleString()}
                    </span>
                </span>
            )}

            {onFavorite && (
                <button
                    type="button"
                    onClick={onFavorite}
                    className="shrink-0 w-11 h-11 -m-1 flex items-center justify-center rounded-lg transition-all hover:scale-110 active:scale-95"
                    style={{ color: isFavorite ? '#f87171' : 'var(--color-text-muted)' }}
                    aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    aria-pressed={isFavorite}
                >
                    <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                </button>
            )}

            <button
                type="button"
                onClick={onPlay}
                className="shrink-0 w-11 h-11 flex items-center justify-center rounded-full text-white transition-transform active:scale-90"
                style={{ background: `linear-gradient(135deg, ${theme.gradient[0]}, ${theme.gradient[1]})` }}
                aria-label={isCurrentStation && isPlaying ? `Pause ${station.name}` : `Play ${station.name}`}
            >
                {isLoading && isCurrentStation ? (
                    <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" aria-hidden="true" />
                ) : isCurrentStation && isPlaying ? (
                    <Pause className="w-4 h-4" fill="currentColor" />
                ) : (
                    <Play className="w-4 h-4 ml-0.5" fill="currentColor" />
                )}
            </button>
        </div>
    );
};
