'use client';

import React, { useState } from 'react';
import { AudioPlayer } from './AudioPlayer';
import { NowPlayingSheet } from './NowPlayingSheet';
import { usePlayer } from '@/context/PlayerContext';

export const PersistentAudioPlayer: React.FC = () => {
    const {
        currentStation,
        isPlaying,
        volume,
        isMuted,
        isLoading,
        error,
        nowPlaying,
        listenerCounts,
        streamListeners,
        togglePlay,
        stopPlayback,
        handleVolumeChange,
        toggleMute,
    } = usePlayer();

<<<<<<< HEAD
    const liveListeners = currentStation
        ? (streamListeners ?? listenerCounts[currentStation.id] ?? 0)
        : 0;
=======
    const [sheetOpen, setSheetOpen] = useState(false);

    const touchStartYRef = React.useRef<number>(0);

    const handlePlayerTouchStart = (e: React.TouchEvent) => {
        touchStartYRef.current = e.touches[0].clientY;
    };

    const handlePlayerTouchEnd = (e: React.TouchEvent) => {
        const delta = touchStartYRef.current - e.changedTouches[0].clientY;
        if (delta > 48) setSheetOpen(true); // swipe up ≥ 48px opens the sheet
    };

    const liveListeners = streamListeners
        ?? (currentStation ? (listenerCounts[currentStation.id] ?? 0) : 0);

    const statusText: string | null = error ?? (isLoading ? 'Buffering…' : null);
    const statusLevel: 'info' | 'error' = error ? 'error' : 'info';
>>>>>>> 0fd1aed (feat: show buffering and error status in player bar)

    return (
        <>
            {/* Screen readers announce track changes without stealing focus */}
            <div aria-live="polite" className="sr-only">
                {nowPlaying && currentStation
                    ? `Now playing: ${nowPlaying} on ${currentStation.name}`
                    : ''}
            </div>

            <div
                onTouchStart={handlePlayerTouchStart}
                onTouchEnd={handlePlayerTouchEnd}
                style={{ touchAction: 'pan-x' }}
            >
                <AudioPlayer
                    currentStation={currentStation}
                    isPlaying={isPlaying}
                    volume={volume}
                    isMuted={isMuted}
                    onTogglePlay={togglePlay}
                    onStopPlayback={stopPlayback}
                    onVolumeChange={handleVolumeChange}
                    onMuteToggle={toggleMute}
                    isLoading={isLoading}
                    nowPlaying={nowPlaying}
                    liveListeners={liveListeners}
                    onExpand={() => setSheetOpen(true)}
                    statusText={statusText}
                    statusLevel={statusLevel}
                />
            </div>

            <NowPlayingSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
        </>
    );
};
