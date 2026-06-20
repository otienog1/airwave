'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Play, Pause, Loader2 } from 'lucide-react';
import { Station } from '../../types/Station';
import { StationArt } from './StationArt';
import { getGenreTheme } from '@/lib/genreTheme';
import { slugify } from '@/lib/slug';
import { Badge } from '@/components/ui/Badge';
import { Waveform } from '@/components/ui/Waveform';

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
    const router = useRouter();
    const colors = getGenreTheme(station.genre);
    const isActive = isCurrentStation && isPlaying;
    const showSpinner = Boolean(isLoading && isCurrentStation);

    return (
        <div
            className="group flex flex-col rounded-2xl overflow-hidden transition-all duration-200 ease-out hover:-translate-y-px"
            style={{
                background: 'var(--color-surface)',
                border: `1px solid ${isCurrentStation ? colors.accent + '45' : 'var(--color-border)'}`,
                boxShadow: isCurrentStation
                    ? `0 0 0 1px ${colors.accent}18, 0 12px 48px ${colors.accent}14`
                    : '0 1px 4px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
            }}
        >
            {/* Art */}
            <button
                type="button"
                onClick={() => router.push(`/station/${slugify(station.name)}`)}
                className="relative block w-full overflow-hidden cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                style={{ aspectRatio: '1 / 1' }}
                aria-label={`Open ${station.name} detail page`}
            >
                <StationArt
                    name={station.name}
                    logoUrl={station.logo_url}
                    genre={station.genre}
                    fill
                    radius={0}
                    className="absolute inset-0"
                />

                <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    style={{ background: 'rgba(0,0,0,0.12)' }}
                    aria-hidden="true"
                />

                {isActive && (
                    <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ background: `${colors.accent}1e` }}
                        aria-hidden="true"
                    >
                        <div
                            className="px-4 py-2.5 rounded-2xl"
                            style={{
                                background: 'rgba(0,0,0,0.55)',
                                backdropFilter: 'blur(16px)',
                                WebkitBackdropFilter: 'blur(16px)',
                                border: '1px solid rgba(255,255,255,0.1)',
                            }}
                        >
                            <Waveform isAnimating={true} bars={6} color="#ffffff" height={20} />
                        </div>
                    </div>
                )}

                {station.is_live && (
                    <Badge variant="live" pulse className="absolute top-2.5 left-2.5 font-bold uppercase tracking-widest">
                        Live
                    </Badge>
                )}

                {liveListeners > 0 && (
                    <Badge variant="listeners" className="absolute bottom-2.5 left-2.5 tabular-nums">
                        {liveListeners.toLocaleString()} listening
                    </Badge>
                )}
            </button>

            {/* Info + controls */}
            <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-3">
                <div className="flex-1 min-w-0 mr-1">
                    <p className="font-semibold text-[13px] leading-snug truncate" style={{ color: 'var(--color-text-primary)' }}>
                        {station.name}
                    </p>
                    {nowPlaying ? (
                        <p className="text-[11px] mt-[3px] truncate" style={{ color: colors.accent }}>♪ {nowPlaying}</p>
                    ) : (
                        <p className="text-[11px] mt-[3px] truncate" style={{ color: 'var(--color-text-muted)' }}>
                            {[station.genre, station.frequency].filter(Boolean).join(' · ')}
                        </p>
                    )}
                </div>

                <button
                    onClick={(e) => { e.stopPropagation(); onFavorite(); }}
                    className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-150 hover:scale-110 active:scale-95 cursor-pointer"
                    style={{ color: isFavorite ? '#f87171' : 'var(--color-text-muted)' }}
                    aria-label={isFavorite ? 'Remove from favourites' : 'Add to favourites'}
                    aria-pressed={isFavorite}
                >
                    <Heart className={`w-[15px] h-[15px] transition-transform duration-150 ${isFavorite ? 'fill-current scale-110' : ''}`} />
                </button>

                <button
                    onClick={onPlay}
                    disabled={!station.is_live || showSpinner}
                    className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-150 active:scale-95 cursor-pointer"
                    style={{
                        background: isActive ? `${colors.accent}1c` : colors.accent,
                        color: isActive ? colors.accent : '#fff',
                        border: `1px solid ${isActive ? colors.accent + '40' : 'transparent'}`,
                        opacity: (!station.is_live || showSpinner) ? 0.38 : 1,
                        cursor: (!station.is_live || showSpinner) ? 'not-allowed' : 'pointer',
                    }}
                    aria-label={isActive ? 'Pause' : 'Play'}
                >
                    {showSpinner ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isActive ? (
                        <Pause className="w-4 h-4" />
                    ) : (
                        <Play className="w-4 h-4 ml-[2px]" />
                    )}
                </button>
            </div>
        </div>
    );
};
