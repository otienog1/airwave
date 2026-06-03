'use client';

import React from 'react';
import { AudioPlayer } from './AudioPlayer';
import { usePlayer } from '@/context/PlayerContext';

export const PersistentAudioPlayer: React.FC = () => {
    const {
        currentStation,
        isPlaying,
        volume,
        isMuted,
        isLoading,
        nowPlaying,
        listenerCounts,
        streamListeners,
        togglePlay,
        stopPlayback,
        handleVolumeChange,
        toggleMute,
    } = usePlayer();

    const liveListeners = currentStation
        ? (streamListeners ?? listenerCounts[currentStation.id] ?? 0)
        : 0;

    return (
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
        />
    );
};
