'use client';

import React, { useEffect } from 'react';
import { ChevronDown, Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';
import { StationArt } from '@/components/station/StationArt';
import { RecentTracks } from '@/components/station/RecentTracks';
import { VolumeControl } from './VolumeControl';
import { getGenreTheme } from '@/lib/genreTheme';
import { ShareButton } from '@/components/ui/ShareButton';
import { slugify } from '@/lib/slug';

interface NowPlayingSheetProps {
    open: boolean;
    onClose: () => void;
}

export const NowPlayingSheet: React.FC<NowPlayingSheetProps> = ({ open, onClose }) => {
    const {
        currentStation,
        isPlaying,
        isLoading,
        nowPlaying,
        streamListeners,
        listenerCounts,
        volume,
        isMuted,
        togglePlay,
        handleVolumeChange,
        toggleMute,
        playNextStation,
        playPrevStation,
        canSkip,
    } = usePlayer();

    // Esc closes the sheet
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    // Lock background scroll while open
    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, [open]);

    const sheetTouchStartYRef = React.useRef<number>(0);

    const handleSheetTouchStart = (e: React.TouchEvent) => {
        sheetTouchStartYRef.current = e.touches[0].clientY;
    };

    const handleSheetTouchEnd = (e: React.TouchEvent) => {
        const delta = e.changedTouches[0].clientY - sheetTouchStartYRef.current;
        if (delta > 80) onClose(); // swipe down ≥ 80px from drag handle area
    };

    if (!open || !currentStation) return null;

    const theme = getGenreTheme(currentStation.genre);
    const [gradFrom, gradTo] = theme.gradient;
    const liveListeners = streamListeners ?? listenerCounts[currentStation.id] ?? 0;

    return (
        <div
            className="fixed inset-0 z-[60] flex flex-col now-playing-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={`Now playing: ${currentStation.name}`}
            style={{
                background: `linear-gradient(170deg, ${gradFrom}33 0%, var(--color-bg) 38%)`,
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
            }}
        >
            {/* Solid base under the gradient tint */}
            <div className="absolute inset-0 -z-10" style={{ background: 'var(--color-bg)' }} />

            <div className="flex-1 overflow-y-auto">
                <div className="max-w-md mx-auto w-full px-6 pb-10 flex flex-col min-h-full">
                    {/* Drag handle */}
                    <div className="flex justify-center pt-3 pb-1" aria-hidden="true">
                        <div
                            className="w-10 h-1 rounded-full"
                            style={{ background: 'var(--color-border-strong, rgba(255,255,255,0.15))' }}
                        />
                    </div>

                    {/* Top bar */}
                    <div
                        className="flex items-center justify-between pt-4 pb-2"
                        style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}
                        onTouchStart={handleSheetTouchStart}
                        onTouchEnd={handleSheetTouchEnd}
                    >
                        <button
                            onClick={onClose}
                            className="w-11 h-11 -ml-2 flex items-center justify-center rounded-xl transition-colors hover:bg-white/10"
                            style={{ color: 'var(--color-text-secondary)' }}
                            aria-label="Close now playing"
                        >
                            <ChevronDown className="w-6 h-6" />
                        </button>
                        <span
                            className="text-[10px] font-semibold uppercase tracking-[0.2em]"
                            style={{ color: 'var(--color-text-muted)' }}
                        >
                            Now Playing
                        </span>
                        <ShareButton
                            stationName={currentStation.name}
                            stationSlug={slugify(currentStation.name)}
                        />
                    </div>

                    {/* Artwork */}
                    <div className="flex justify-center mt-6 mb-8">
                        <div style={{ boxShadow: `0 24px 64px ${theme.glow}, var(--shadow-2)` }} className="rounded-3xl">
                            <StationArt
                                name={currentStation.name}
                                logoUrl={currentStation.logo_url}
                                genre={currentStation.genre}
                                size={240}
                                radius={24}
                            />
                        </div>
                    </div>

                    {/* Station identity */}
                    <div className="text-center space-y-1.5">
                        <div className="flex items-center justify-center gap-2">
                            <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                                {currentStation.name}
                            </h2>
                            {currentStation.is_live && <span className="live-badge">● LIVE</span>}
                        </div>
                        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                            {[currentStation.frequency, currentStation.genre, currentStation.region]
                                .filter(Boolean)
                                .join(' · ')}
                        </p>
                        {nowPlaying && (
                            <p
                                key={nowPlaying}
                                className="text-sm font-medium now-playing-enter truncate px-4"
                                style={{ color: theme.accent }}
                            >
                                ♪ {nowPlaying}
                            </p>
                        )}
                        {liveListeners > 0 && (
                            <div className="flex items-center justify-center gap-2 pt-1">
                                {isPlaying && (
                                    <span className="flex items-end gap-0.5" style={{ height: 12 }} aria-hidden="true">
                                        {[0, 1, 2].map(i => (
                                            <span
                                                key={i}
                                                className="waveform-bar"
                                                style={{ background: theme.accent, width: 2, height: 12, animationDelay: `${i * 0.15}s` }}
                                            />
                                        ))}
                                    </span>
                                )}
                                <span
                                    className="text-xs tabular-nums"
                                    style={{ color: 'var(--color-text-secondary)' }}
                                    aria-label={`${liveListeners.toLocaleString()} people listening`}
                                >
                                    {liveListeners.toLocaleString()} listening
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Transport controls */}
                    <div className="flex items-center justify-center gap-8 mt-8">
                        <button
                            onClick={playPrevStation}
                            disabled={!canSkip}
                            className="w-12 h-12 flex items-center justify-center rounded-full transition-all hover:bg-white/10 active:scale-90 disabled:opacity-40"
                            style={{ color: 'var(--color-text-primary)' }}
                            aria-label="Previous station"
                        >
                            <SkipBack className="w-6 h-6" />
                        </button>

                        <button
                            onClick={togglePlay}
                            className="w-16 h-16 flex items-center justify-center rounded-full transition-transform active:scale-95 text-white"
                            style={{
                                background: `linear-gradient(135deg, ${gradFrom} 0%, ${gradTo} 100%)`,
                                boxShadow: `0 8px 24px ${theme.glow}`,
                            }}
                            aria-label={isPlaying ? 'Pause' : 'Play'}
                        >
                            {isLoading ? (
                                <span
                                    className="w-6 h-6 rounded-full border-2 border-white/40 border-t-white animate-spin"
                                    aria-hidden="true"
                                />
                            ) : isPlaying ? (
                                <Pause className="w-7 h-7" fill="currentColor" />
                            ) : (
                                <Play className="w-7 h-7 ml-1" fill="currentColor" />
                            )}
                        </button>

                        <button
                            onClick={playNextStation}
                            disabled={!canSkip}
                            className="w-12 h-12 flex items-center justify-center rounded-full transition-all hover:bg-white/10 active:scale-90 disabled:opacity-40"
                            style={{ color: 'var(--color-text-primary)' }}
                            aria-label="Next station"
                        >
                            <SkipForward className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Volume (pointer devices only) */}
                    <div className="flex justify-center mt-4">
                        <VolumeControl
                            volume={volume}
                            isMuted={isMuted}
                            onVolumeChange={handleVolumeChange}
                            onMuteToggle={toggleMute}
                        />
                    </div>

                    {/* Recently played on this station */}
                    <div className="mt-8">
                        <RecentTracks
                            stationId={currentStation.id}
                            stationName={currentStation.name}
                            accentColor={theme.accent}
                            excludeTitle={nowPlaying}
                            limit={6}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
