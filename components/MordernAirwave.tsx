'use client';

import React, { useRef, useCallback, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { Heart, Play, Pause } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useStationFilter } from '@/hooks/useStationFilter';
import { useFavorites } from '@/hooks/useFavorites';
import { HeartBurst } from '@/components/ui/HeartBurst';
import { Shelf } from '@/components/ui/Shelf';
import { StationTile } from '@/components/station/StationTile';
import { StationArt } from '@/components/station/StationArt';
import { useAuth } from '@/context/AuthContext';
import { usePlayer } from '@/context/PlayerContext';
import { StationGrid } from '@/components/station/StationGrid';
import { SearchAndFilters } from '@/components/station/SearchAndFilters';
import { TrendingStrip } from '@/components/station/TrendingStrip';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useStations } from '@/hooks/useStations';
import { useRecentStations } from '@/hooks/useRecentStations';
import { getGenreTheme } from '@/lib/genreTheme';
import { slugify } from '@/lib/slug';
import type { Station } from '@/types/Station';

const ModernAirwave: React.FC = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const showFavoritesOnly = searchParams.get('view') === 'favorites';
    const { isAuthenticated } = useAuth();

    const {
        currentStation,
        isPlaying,
        isLoading,
        volume,
        isMuted,
        error: audioError,
        playStation,
        togglePlay,
        handleVolumeChange,
        toggleMute,
        clearError,
        nowPlaying,
        listenerCounts,
    } = usePlayer();

    const { stations, loading: stationsLoading, error: stationsError, refetch: refetchStations } = useStations({ autoFetch: true });

    const searchInputRef = useRef<HTMLInputElement>(null);

    const {
        filteredStations,
        searchTerm,
        setSearchTerm,
        selectedGenre,
        setSelectedGenre,
        selectedRegion,
        setSelectedRegion,
        genres,
        regions,
    } = useStationFilter(stations);

    const { favorites, toggleFavorite, showHeart } = useFavorites(isAuthenticated);

    const displayedStations = useMemo(
        () => showFavoritesOnly ? filteredStations.filter(s => favorites.has(s.id)) : filteredStations,
        [showFavoritesOnly, filteredStations, favorites]
    );

    // Adapter: useKeyboardShortcuts expects (station: Station) but useFavorites gives (stationId: number)
    const toggleFavoriteByStation = useCallback(
        (station: Station) => toggleFavorite(station.id),
        [toggleFavorite]
    );

    const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const toastVisible = useRef(false);

    useEffect(() => {
        if (audioError) {
            if (dismissTimer.current) {
                clearTimeout(dismissTimer.current);
                dismissTimer.current = null;
            }
            if (!toastVisible.current) {
                toastVisible.current = true;
                toast.warning(audioError, {
                    id: 'audio-error',
                    duration: Infinity,
                    onDismiss: () => { toastVisible.current = false; clearError(); },
                });
            }
        } else {
            // Delay dismissal — brief null gaps during reconnect retries shouldn't flicker the toast
            dismissTimer.current = setTimeout(() => {
                toastVisible.current = false;
                toast.dismiss('audio-error');
                dismissTimer.current = null;
            }, 5000);
        }
    }, [audioError, clearError]);

    useKeyboardShortcuts({
        togglePlay,
        toggleMute,
        handleVolumeChange,
        volume,
        playStation,
        filteredStations,
        currentStation,
        favorites,
        toggleFavorite: toggleFavoriteByStation,
        setSearchTerm,
        searchInputRef,
    });

    // ── Hero & shelves ──────────────────────────────────────────────────
    const recents = useRecentStations(stations);

    const recentShelf = useMemo(
        () => recents.filter((s: Station) => s.id !== currentStation?.id).slice(0, 10),
        [recents, currentStation]
    );

    const favoriteShelf = useMemo(
        () => stations.filter((s: Station) => favorites.has(s.id)).slice(0, 10),
        [stations, favorites]
    );

    const browsing =
        !showFavoritesOnly &&
        searchTerm === '' &&
        selectedGenre === 'All' &&
        selectedRegion === 'All';

    const heroColors = getGenreTheme(currentStation?.genre);

    return (
        <>
            {showHeart && <HeartBurst />}

            <SearchAndFilters
                ref={searchInputRef}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                selectedGenre={selectedGenre}
                onGenreChange={setSelectedGenre}
                selectedRegion={selectedRegion}
                onRegionChange={setSelectedRegion}
                genres={genres}
                regions={regions}
                stationCount={displayedStations.length}
                loading={stationsLoading}
                trendingSlot={
                    <TrendingStrip
                        stations={stations}
                        currentStation={currentStation}
                        isPlaying={isPlaying}
                        isLoading={isLoading}
                        onPlay={playStation}
                    />
                }
            />

            {/* Genre hero */}
            {selectedGenre && selectedGenre !== 'All' && (() => {
                const theme = getGenreTheme(selectedGenre);
                const [gradFrom, gradTo] = theme.gradient;
                return (
                    <div
                        className="relative rounded-2xl px-6 py-7 mb-5 overflow-hidden"
                        style={{
                            background: `linear-gradient(135deg, ${gradFrom}28 0%, ${gradTo}14 100%)`,
                            border: '1px solid rgba(255,255,255,0.06)',
                        }}
                    >
                        <div
                            className="absolute inset-0 -z-10 pointer-events-none"
                            style={{
                                background: `radial-gradient(ellipse at 15% 50%, ${gradFrom}33, transparent 65%)`,
                            }}
                            aria-hidden="true"
                        />
                        <p
                            className="text-[10px] font-semibold uppercase tracking-[0.22em] mb-1"
                            style={{ color: theme.accent }}
                        >
                            Genre
                        </p>
                        <h2
                            className="text-2xl font-bold"
                            style={{ color: 'var(--color-text-primary)' }}
                        >
                            {selectedGenre}
                        </h2>
                        <p
                            className="text-sm mt-1 tabular-nums"
                            style={{ color: 'var(--color-text-secondary)' }}
                        >
                            {filteredStations.length} {filteredStations.length === 1 ? 'station' : 'stations'}
                        </p>
                    </div>
                );
            })()}

            {/* Now Playing hero */}
            {browsing && currentStation && (
                <div className="mt-6">
                    <button
                        type="button"
                        onClick={() => router.push(`/station/${slugify(currentStation.name)}`)}
                        className="w-full text-left rounded-3xl overflow-hidden transition-all duration-200 hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] cursor-pointer"
                        style={{
                            background: `radial-gradient(ellipse 80% 120% at 0% 50%, ${heroColors.accent}14 0%, transparent 65%), var(--color-surface)`,
                            border: `1px solid ${heroColors.accent}28`,
                            boxShadow: `0 2px 24px ${heroColors.accent}0a`,
                        }}
                        aria-label={`Now playing: ${currentStation.name}`}
                    >
                        <div className="flex items-center gap-4 p-5">
                            <div className="relative shrink-0">
                                <StationArt
                                    name={currentStation.name}
                                    logoUrl={currentStation.logo_url}
                                    genre={currentStation.genre}
                                    size={72}
                                    radius={16}
                                />
                                {isPlaying && (
                                    <div
                                        className="absolute -inset-[3px] rounded-[19px] pointer-events-none"
                                        style={{ boxShadow: `0 0 0 2px ${heroColors.accent}80` }}
                                        aria-hidden="true"
                                    />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p
                                    className="text-[10px] font-bold uppercase tracking-[0.18em] mb-1"
                                    style={{ color: heroColors.accent }}
                                >
                                    {isPlaying ? 'Now Playing' : 'Paused'}
                                </p>
                                <p
                                    className="text-[18px] font-bold leading-tight truncate"
                                    style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}
                                >
                                    {currentStation.name}
                                </p>
                                {nowPlaying ? (
                                    <p className="text-[13px] mt-0.5 truncate" style={{ color: 'var(--color-text-secondary)' }}>
                                        ♪ {nowPlaying}
                                    </p>
                                ) : currentStation.genre ? (
                                    <p className="text-[13px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                                        {currentStation.genre}{currentStation.frequency ? ` · ${currentStation.frequency}` : ''}
                                    </p>
                                ) : null}
                            </div>
                            <div
                                className="shrink-0 w-11 h-11 flex items-center justify-center rounded-full transition-transform duration-150 active:scale-90"
                                style={{
                                    background: heroColors.accent,
                                    boxShadow: `0 4px 16px ${heroColors.accent}50`,
                                }}
                                onClick={e => { e.stopPropagation(); togglePlay(); }}
                                role="button"
                                aria-label={isPlaying ? 'Pause' : 'Play'}
                                tabIndex={0}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        togglePlay();
                                    }
                                }}
                            >
                                {isPlaying
                                    ? <Pause className="w-5 h-5 text-white" />
                                    : <Play className="w-5 h-5 text-white ml-0.5" />
                                }
                            </div>
                        </div>
                    </button>
                </div>
            )}

            {/* Shelves */}
            {browsing && (recentShelf.length > 0 || favoriteShelf.length > 0) && (
                <div className="mt-8 space-y-7">
                    {recentShelf.length > 0 && (
                        <Shelf title="Jump back in">
                            {recentShelf.map((s: Station) => (
                                <StationTile
                                    key={s.id}
                                    station={s}
                                    isPlaying={isPlaying && currentStation?.id === s.id}
                                />
                            ))}
                        </Shelf>
                    )}
                    {favoriteShelf.length > 0 && (
                        <Shelf title="Your favourites">
                            {favoriteShelf.map((s: Station) => (
                                <StationTile
                                    key={s.id}
                                    station={s}
                                    isPlaying={isPlaying && currentStation?.id === s.id}
                                />
                            ))}
                        </Shelf>
                    )}
                </div>
            )}

            <div className="mt-5 sm:mt-8 mb-5 sm:mb-8 flex items-center gap-4">
                <div
                    className="h-px flex-1"
                    style={{ background: 'var(--color-border)' }}
                />
                <span
                    className="text-[9px] font-semibold uppercase tracking-widest shrink-0"
                    style={{ color: 'var(--color-text-muted)' }}
                >
                    Stations
                </span>
                <div
                    className="h-px flex-1"
                    style={{ background: 'var(--color-border)' }}
                />
            </div>

            <div className="flex items-center gap-2 mb-5">
                <button
                    onClick={() => router.push('/')}
                    className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-[11px] font-semibold uppercase tracking-widest transition-all duration-150 cursor-pointer"
                    style={
                        !showFavoritesOnly
                            ? {
                                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                  color: '#ffffff',
                                  border: '1px solid transparent',
                                  boxShadow: '0 0 0 1px rgba(99,102,241,0.4)',
                              }
                            : {
                                  background: 'var(--color-surface)',
                                  color: 'var(--color-text-secondary)',
                                  border: '1px solid var(--color-border)',
                              }
                    }
                >
                    <span>📻</span> All
                </button>
                <button
                    onClick={() => router.push('/?view=favorites')}
                    className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-[11px] font-semibold uppercase tracking-widest transition-all duration-150 cursor-pointer"
                    style={
                        showFavoritesOnly
                            ? {
                                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                  color: '#ffffff',
                                  border: '1px solid transparent',
                                  boxShadow: '0 0 0 1px rgba(99,102,241,0.4)',
                              }
                            : {
                                  background: 'var(--color-surface)',
                                  color: 'var(--color-text-secondary)',
                                  border: '1px solid var(--color-border)',
                              }
                    }
                >
                    <Heart className="w-3 h-3" /> Favourites
                </button>
            </div>

            <StationGrid
                stations={displayedStations}
                loading={stationsLoading}
                error={stationsError}
                currentStation={currentStation}
                isPlaying={isPlaying}
                isAudioLoading={isLoading || (!!audioError && !isPlaying)}
                favorites={favorites}
                onPlay={playStation}
                onFavorite={toggleFavorite}
                onRetry={refetchStations}
                nowPlaying={nowPlaying}
                listenerCounts={listenerCounts}
            />
        </>
    );
};

export default ModernAirwave;
