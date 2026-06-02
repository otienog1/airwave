import React from 'react';
import { StationInfo } from './StationInfo';
import { PlayControl } from './PlayControl';
import { VolumeControl } from './VolumeControl';
import { SleepTimer } from './SleepTimer';
import { useSleepTimer } from '@/hooks/useSleepTimer';
import type { Station } from '@/types/Station';

interface AudioPlayerProps {
    currentStation: Station | null;
    isPlaying: boolean;
    volume: number;
    isMuted: boolean;
    onTogglePlay: () => void;
    onStopPlayback: () => void;
    onVolumeChange: (volume: number) => void;
    onMuteToggle: () => void;
    isLoading: boolean;
    nowPlaying?: string | null;
    liveListeners?: number;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
    currentStation,
    isPlaying,
    volume,
    isMuted,
    onTogglePlay,
    onStopPlayback,
    onVolumeChange,
    onMuteToggle,
    isLoading,
    nowPlaying,
    liveListeners = 0,
}) => {
    const { secondsLeft, isActive: timerActive, start: startTimer, cancel: cancelTimer } =
        useSleepTimer(onStopPlayback);

    if (!currentStation) return null;

    return (
        <div
            className="fixed bottom-0 left-0 right-0 z-50"
            style={{
                background: 'var(--color-player-bg)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                borderTop: '1px solid var(--color-border)',
            }}
        >
            {isPlaying && (
                <div
                    className="h-0.5 w-full"
                    style={{
                        background: 'linear-gradient(90deg, transparent, #6366f1, #8b5cf6, #6366f1, transparent)',
                        backgroundSize: '300% 100%',
                        animation: 'shimmer-slide 2.5s linear infinite',
                    }}
                />
            )}

            <div className="max-w-7xl mx-auto px-4 py-3">
                <div className="flex items-center gap-4">
                    <StationInfo station={currentStation} isPlaying={isPlaying} nowPlaying={nowPlaying} liveListeners={liveListeners} />

                    <div className="flex items-center gap-3 shrink-0">
                        <PlayControl
                            isPlaying={isPlaying}
                            isLoading={isLoading}
                            onTogglePlay={onTogglePlay}
                        />
                        <VolumeControl
                            volume={volume}
                            isMuted={isMuted}
                            onVolumeChange={onVolumeChange}
                            onMuteToggle={onMuteToggle}
                        />
                        <SleepTimer
                            secondsLeft={secondsLeft}
                            isActive={timerActive}
                            onStart={startTimer}
                            onCancel={cancelTimer}
                        />
                    </div>
                </div>

            </div>
        </div>
    );
};
