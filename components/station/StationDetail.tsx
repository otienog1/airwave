'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Play, Pause, Heart, Radio } from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';
import { useAuth } from '@/context/AuthContext';
import { useStations } from '@/hooks/useStations';
import { useFavorites } from '@/hooks/useFavorites';
import { StationArt } from './StationArt';
import { StationTile } from './StationTile';
import { RecentTracks } from './RecentTracks';
import { Shelf } from '@/components/ui/Shelf';
import { HeartBurst } from '@/components/ui/HeartBurst';
import { getGenreTheme } from '@/lib/genreTheme';
import { findStationBySlug } from '@/lib/slug';

interface StationDetailProps {
    slug: string;
}

export const StationDetail: React.FC<StationDetailProps> = ({ slug }) => {
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const { stations, loading } = useStations({ autoFetch: true });
    const { favorites, toggleFavorite, showHeart } = useFavorites(isAuthenticated);
    const {
        currentStation,
        isPlaying,
        isLoading,
        nowPlaying,
        listenerCounts,
        streamListeners,
        playStation,
    } = usePlayer();

    const station = findStationBySlug(stations, slug);

    if (loading && !station) {
        return (
            <div className="flex items-center gap-4 animate-pulse pt-4">
                <div className="w-28 h-28 rounded-2xl" style={{ background: 'var(--color-surface-raised)' }} />
                <div className="space-y-2 flex-1">
                    <div className="h-5 w-1/2 rounded-md" style={{ background: 'var(--color-surface-raised)' }} />
                    <div className="h-3 w-1/3 rounded-md" style={{ background: 'var(--color-surface-raised)' }} />
                </div>
            </div>
        );
    }

    if (!station) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <Radio className="w-10 h-10" style={{ color: 'var(--color-text-muted)' }} />
                <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Station not found</p>
                <button onClick={() => router.push('/')} className="btn-primary">Browse stations</button>
            </div>
        );
    }

    const theme = getGenreTheme(station.genre);
    const isCurrent = currentStation?.id === station.id;
    const liveListeners = isCurrent
        ? (streamListeners ?? listenerCounts[station.id] ?? 0)
        : (listenerCounts[station.id] ?? 0);
    const isFavorite = favorites.has(station.id);

    const similar = stations
        .filter(s => s.id !== station.id && (s.genre === station.genre || s.region === station.region))
        .sort((a, b) => {
            const aGenre = a.genre === station.genre ? 1 : 0;
            const bGenre = b.genre === station.genre ? 1 : 0;
            return bGenre - aGenre;
        })
        .slice(0, 8);

    return (
        <>
            {showHeart && <HeartBurst />}

            <button
                onClick={() => router.back()}
                className="flex items-center gap-1.5 text-sm mb-6 transition-colors cursor-pointer"
                style={{ color: 'var(--color-text-secondary)' }}
            >
                <ArrowLeft className="w-4 h-4" /> Back
            </button>

            {/* Hero */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8">
                <div className="rounded-3xl" style={{ boxShadow: `0 16px 48px ${theme.glow}` }}>
                    <StationArt
                        name={station.name}
                        logoUrl={station.logo_url}
                        genre={station.genre}
                        size={128}
                        radius={20}
                    />
                </div>

                <div className="flex-1 min-w-0 text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start gap-2.5 flex-wrap">
                        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                            {station.name}
                        </h1>
                        {station.is_live && <span className="live-badge">● LIVE</span>}
                    </div>

                    <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                        {[station.frequency, station.genre, station.region, station.language]
                            .filter(Boolean)
                            .join(' · ')}
                    </p>

                    {station.description && (
                        <p className="text-sm mt-2 max-w-lg" style={{ color: 'var(--color-text-muted)' }}>
                            {station.description}
                        </p>
                    )}

                    {liveListeners > 0 && (
                        <p
                            className="text-xs mt-2 tabular-nums"
                            style={{ color: theme.accent }}
                            aria-label={`${liveListeners.toLocaleString()} people listening now`}
                        >
                            {liveListeners.toLocaleString()} listening now
                        </p>
                    )}

                    {isCurrent && nowPlaying && (
                        <p key={nowPlaying} className="text-sm font-medium mt-2 truncate now-playing-enter" style={{ color: theme.accent }}>
                            ♪ {nowPlaying}
                        </p>
                    )}

                    <div className="flex items-center justify-center sm:justify-start gap-3 mt-4">
                        <button
                            onClick={() => playStation(station)}
                            className="flex items-center gap-2 px-6 h-12 rounded-full font-semibold text-sm text-white transition-transform active:scale-95 cursor-pointer"
                            style={{
                                background: `linear-gradient(135deg, ${theme.gradient[0]}, ${theme.gradient[1]})`,
                                boxShadow: `0 8px 24px ${theme.glow}`,
                            }}
                            aria-label={isCurrent && isPlaying ? `Pause ${station.name}` : `Play ${station.name}`}
                        >
                            {isLoading && isCurrent ? (
                                <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" aria-hidden="true" />
                            ) : isCurrent && isPlaying ? (
                                <Pause className="w-4 h-4" fill="currentColor" />
                            ) : (
                                <Play className="w-4 h-4" fill="currentColor" />
                            )}
                            {isCurrent && isPlaying ? 'Pause' : 'Play'}
                        </button>

                        <button
                            onClick={() => toggleFavorite(station.id)}
                            className="w-12 h-12 flex items-center justify-center rounded-full transition-all hover:scale-110 active:scale-95 cursor-pointer"
                            style={{
                                border: '1px solid var(--color-border-strong)',
                                color: isFavorite ? '#f87171' : 'var(--color-text-muted)',
                            }}
                            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                            aria-pressed={isFavorite}
                        >
                            <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Recent tracks */}
            <div className="mb-8 max-w-lg">
                <RecentTracks
                    stationId={station.id}
                    stationName={station.name}
                    accentColor={theme.accent}
                    excludeTitle={isCurrent ? nowPlaying : null}
                    limit={8}
                />
            </div>

            {/* Similar stations */}
            {similar.length > 0 && (
                <Shelf title="Similar stations">
                    {similar.map(s => (
                        <StationTile
                            key={s.id}
                            station={s}
                            isPlaying={currentStation?.id === s.id && isPlaying}
                        />
                    ))}
                </Shelf>
            )}
        </>
    );
};
