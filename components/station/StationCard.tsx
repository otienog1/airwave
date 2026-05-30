import React from 'react';
import { Station } from '../../types/Station';
import { Heart } from 'lucide-react';
import { PlayButton } from './PlayButton';
import { StationAvatar } from './StationAvatar';

const GENRE_COLORS: Record<string, { glow: string; accent: string }> = {
    Pop:          { glow: 'rgba(236, 72, 153, 0.10)',  accent: '#ec4899' },
    Soul:         { glow: 'rgba(245, 158, 11, 0.10)', accent: '#f59e0b' },
    'Hip Hop':    { glow: 'rgba(124, 58, 237, 0.10)', accent: '#7c3aed' },
    Urban:        { glow: 'rgba(79, 70, 229, 0.10)',  accent: '#4f46e5' },
    Contemporary: { glow: 'rgba(5, 150, 105, 0.10)',  accent: '#059669' },
    Talk:         { glow: 'rgba(71, 85, 105, 0.10)',  accent: '#3b82f6' },
    News:         { glow: 'rgba(29, 78, 216, 0.10)',  accent: '#1d4ed8' },
    Dance:        { glow: 'rgba(8, 145, 178, 0.10)',  accent: '#0891b2' },
};

const DEFAULT_COLOR = { glow: 'rgba(99, 102, 241, 0.10)', accent: '#6366f1' };

interface StationCardProps {
    station: Station;
    isPlaying: boolean;
    isCurrentStation: boolean;
    isLoading?: boolean;
    onPlay: () => void;
    onFavorite: () => void;
    isFavorite: boolean;
    nowPlaying?: string | null;
    liveListeners?: number;
}

export const StationCard: React.FC<StationCardProps> = ({
    station,
    isPlaying,
    isCurrentStation,
    isLoading,
    onPlay,
    onFavorite,
    isFavorite,
    nowPlaying,
    liveListeners = 0,
}) => {
    const colors = (station.genre ? GENRE_COLORS[station.genre] : undefined) ?? DEFAULT_COLOR;

    const genre = station.genre ?? null;
    const frequency = station.frequency ?? null;

    return (
        <div
            className="station-card"
            style={{
                borderLeft: `3px solid ${isCurrentStation ? colors.accent : 'transparent'}`,
                ...(isCurrentStation
                    ? { boxShadow: `0 8px 32px ${colors.glow}` }
                    : undefined),
            }}
        >
            <div className="p-4">
                {/* Top row: icon + name + heart */}
                <div className="flex items-center gap-3 mb-3">
                    <div className="relative">
                        <StationAvatar
                            name={station.name}
                            logoUrl={station.logo_url}
                            accentColor={colors.accent}
                            size={36}
                            hideInitials={isPlaying && isCurrentStation}
                        />
                        {isPlaying && isCurrentStation && (
                            <div
                                className="absolute inset-0 rounded-xl flex items-center justify-center"
                                style={{ background: colors.glow }}
                            >
                                <div className="flex items-end gap-0.5" style={{ height: '14px' }}>
                                    {[0, 1, 2, 3].map(i => (
                                        <div
                                            key={i}
                                            className="waveform-bar"
                                            style={{ background: colors.accent, animationDelay: `${i * 0.15}s`, width: '2px', height: '14px' }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <h3
                            className="font-semibold text-sm leading-tight truncate"
                            style={{ color: 'var(--color-text-primary)' }}
                        >
                            {station.name}
                        </h3>
                        <p
                            className="text-xs truncate mt-0.5"
                            style={{ color: 'var(--color-text-secondary)' }}
                        >
                            {station.description}
                        </p>
                    </div>

                    <button
                        onClick={(e) => { e.stopPropagation(); onFavorite(); }}
                        className="shrink-0 p-1.5 rounded-lg transition-all duration-150 hover:scale-110 active:scale-95"
                        style={{ color: isFavorite ? '#f87171' : 'var(--color-text-muted)' }}
                        aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                        <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                    </button>
                </div>

                {/* Meta row: live · genre | now playing marquee | frequency */}
                <div className="flex items-center gap-2 mb-3">
                    {station.is_live && (
                        <>
                            <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{
                                    background: '#4ade80',
                                    animation: 'pulse-glow 1.5s ease-in-out infinite',
                                }}
                            />
                            <span className="text-xs font-medium shrink-0" style={{ color: '#4ade80' }}>LIVE</span>
                            {genre && <span className="text-xs shrink-0" style={{ color: 'var(--color-text-muted)' }}>·</span>}
                        </>
                    )}
                    {genre && (
                        <span className="text-xs shrink-0" style={{ color: 'var(--color-text-muted)' }}>
                            {genre}
                        </span>
                    )}

                    {/* Inline marquee between genre and frequency */}
                    {nowPlaying && (
                        <>
                            <span className="text-xs shrink-0" style={{ color: 'var(--color-text-muted)' }}>·</span>
                            <span className="flex-1 min-w-0 overflow-hidden">
                                <span
                                    className="flex whitespace-nowrap"
                                    style={{ width: 'max-content', animation: 'marquee-scroll 12s linear infinite' }}
                                >
                                    <span className="text-xs pr-8" style={{ color: colors.accent }}>♪ {nowPlaying}</span>
                                    <span className="text-xs pr-8" style={{ color: colors.accent }}>♪ {nowPlaying}</span>
                                </span>
                            </span>
                        </>
                    )}

                    {frequency && (
                        <span className="text-xs ml-auto shrink-0 tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
                            {frequency}
                        </span>
                    )}
                </div>

                {/* Play button */}
                <PlayButton
                    isPlaying={isPlaying}
                    isCurrentStation={isCurrentStation}
                    isLoading={isLoading}
                    isLive={station.is_live}
                    onPlay={onPlay}
                    accentColor={colors.accent}
                />
            </div>
        </div>
    );
};
