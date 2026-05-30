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
        togglePlay,
        handleVolumeChange,
        toggleMute,
    } = usePlayer();

    return (
        <AudioPlayer
            currentStation={currentStation}
            isPlaying={isPlaying}
            volume={volume}
            isMuted={isMuted}
            onTogglePlay={togglePlay}
            onVolumeChange={handleVolumeChange}
            onMuteToggle={toggleMute}
            isLoading={isLoading}
            nowPlaying={nowPlaying}
            liveListeners={currentStation ? (listenerCounts[currentStation.id] ?? 0) : 0}
        />
    );
};
