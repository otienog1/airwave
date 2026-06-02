'use client';

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useStreamMetadata } from '@/hooks/useStreamMetadata';
import { useListeners } from '@/hooks/useListeners';
import { apiService } from '@/lib/api';
import type { Station } from '@/types/Station';

interface PlayerContextValue {
    currentStation: Station | null;
    isPlaying: boolean;
    isLoading: boolean;
    volume: number;
    isMuted: boolean;
    error: string | null;
    playStation: (station: Station) => Promise<void>;
    togglePlay: () => Promise<void>;
    stopPlayback: () => Promise<void>;
    handleVolumeChange: (volume: number) => void;
    toggleMute: () => void;
    clearError: () => void;
    nowPlaying: string | null;
    listenerCounts: Record<number, number>;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
    const player = useAudioPlayer({
        onPlay: (station: Station) => {
            apiService.playStation(station.id).catch(() => {});
        },
    });

    const { title: nowPlaying } = useStreamMetadata(
        player.isPlaying && player.currentStation ? player.currentStation.id : null,
        player.currentStation
    );

    const listenerCounts = useListeners(
        player.currentStation?.id ?? null,
        player.currentStation?.name ?? null,
    );

    useEffect(() => {
        const station = player.currentStation;
        if (!station) {
            document.title = 'MBR';
            return;
        }
        const song = nowPlaying ? `${nowPlaying} — ` : '';
        document.title = `${song}${station.name} | MBR`;
    }, [player.currentStation, player.isPlaying, nowPlaying]);

    return (
        <PlayerContext.Provider value={{ ...player, nowPlaying: nowPlaying ?? null, listenerCounts }}>
            {children}
        </PlayerContext.Provider>
    );
}

export function usePlayer(): PlayerContextValue {
    const ctx = useContext(PlayerContext);
    if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
    return ctx;
}
