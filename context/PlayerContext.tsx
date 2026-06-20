'use client';

import React, { createContext, useContext, useEffect, useCallback, ReactNode } from 'react';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useStreamMetadata } from '@/hooks/useStreamMetadata';
import { useListeners } from '@/hooks/useListeners';
import { useStations } from '@/hooks/useStations';
import { pushRecentStation } from '@/hooks/useRecentStations';
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
    streamListeners: number | null;
    playNextStation: () => void;
    playPrevStation: () => void;
    canSkip: boolean;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
    const player = useAudioPlayer({
        onPlay: (station: Station) => {
            apiService.playStation(station.id).catch(() => {});
            pushRecentStation(station.id);
        },
    });

    const { title: nowPlaying, listeners: streamListeners } = useStreamMetadata(
        player.isPlaying && player.currentStation ? player.currentStation.id : null,
        player.currentStation
    );

    const listenerCounts = useListeners(
        player.currentStation?.id ?? null,
        player.currentStation?.name ?? null,
    );

    // Station list for prev/next skip — shares the module-level cache with
    // the home page's useStations instance, so no duplicate fetch.
    const { stations: allStations } = useStations({ autoFetch: true });

    const skipStation = useCallback((dir: 1 | -1) => {
        const cur = player.currentStation;
        if (allStations.length === 0 || !cur) return;
        const idx = allStations.findIndex(s => s.id === cur.id);
        const next = allStations[(idx + dir + allStations.length) % allStations.length];
        if (next) player.playStation(next);
    }, [allStations, player]);

    const playNextStation = useCallback(() => skipStation(1), [skipStation]);
    const playPrevStation = useCallback(() => skipStation(-1), [skipStation]);

    useEffect(() => {
        const station = player.currentStation;
        if (!station) {
            document.title = 'MBR';
            return;
        }
        const song = nowPlaying ? `${nowPlaying} — ` : '';
        document.title = `${song}${station.name} | MBR`;
    }, [player.currentStation, player.isPlaying, nowPlaying]);

    // ── Media Session: lock-screen / notification metadata + controls ──
    useEffect(() => {
        if (!('mediaSession' in navigator)) return;
        const station = player.currentStation;
        if (!station) {
            navigator.mediaSession.metadata = null;
            return;
        }
        const artwork = station.logo_url
            ? [{ src: station.logo_url }]
            : [
                  { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
                  { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
              ];
        navigator.mediaSession.metadata = new MediaMetadata({
            title: nowPlaying ?? station.name,
            artist: nowPlaying ? station.name : (station.frequency ?? 'Live Radio'),
            album: 'MBR Radio',
            artwork,
        });
    }, [player.currentStation, nowPlaying]);

    useEffect(() => {
        if (!('mediaSession' in navigator)) return;
        navigator.mediaSession.playbackState = player.isPlaying ? 'playing' : 'paused';
    }, [player.isPlaying]);

    useEffect(() => {
        if (!('mediaSession' in navigator)) return;
        const ms = navigator.mediaSession;
        ms.setActionHandler('play', () => { player.togglePlay(); });
        ms.setActionHandler('pause', () => { player.togglePlay(); });
        ms.setActionHandler('previoustrack', playPrevStation);
        ms.setActionHandler('nexttrack', playNextStation);
        return () => {
            (['play', 'pause', 'previoustrack', 'nexttrack'] as MediaSessionAction[])
                .forEach(action => ms.setActionHandler(action, null));
        };
    }, [player, playNextStation, playPrevStation]);

    return (
        <PlayerContext.Provider
            value={{
                ...player,
                nowPlaying: nowPlaying ?? null,
                listenerCounts,
                streamListeners: streamListeners ?? null,
                playNextStation,
                playPrevStation,
                canSkip: allStations.length > 1,
            }}
        >
            {children}
        </PlayerContext.Provider>
    );
}

export function usePlayer(): PlayerContextValue {
    const ctx = useContext(PlayerContext);
    if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
    return ctx;
}
