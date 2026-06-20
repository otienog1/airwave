import React from 'react';
import { StationInfo } from './StationInfo';
import { PlayControl } from './PlayControl';
import { VolumeControl } from './VolumeControl';
import { SleepTimer } from './SleepTimer';
import { useSleepTimer } from '@/hooks/useSleepTimer';
import { useScrollDirection } from '@/hooks/useScrollDirection';
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
    onExpand?: () => void;
    statusText?: string | null;
    statusLevel?: 'info' | 'error';
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
    onExpand,
    statusText,
    statusLevel,
}) => {
    const { secondsLeft, isActive: timerActive, start: startTimer, cancel: cancelTimer } =
        useSleepTimer(onStopPlayback);
    const { direction, atTop } = useScrollDirection();
    // When the mobile tab bar slides away on scroll-down, dock to the bottom edge
    const tabBarHidden = direction === 'down' && !atTop;

    if (!currentStation) return null;

    return (
        <div
            className={`fixed left-0 right-0 z-50 sm:!bottom-0 transition-[bottom] duration-300 ease-out-expo ${
                tabBarHidden
                    ? 'bottom-[env(safe-area-inset-bottom)]'
                    : 'bottom-[calc(4rem+env(safe-area-inset-bottom))]'
            }`}
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
                    <button
                        type="button"
                        onClick={onExpand}
                        className="flex-1 min-w-0 text-left cursor-pointer rounded-xl -m-1 p-1 transition-colors hover:bg-white/5"
                        aria-label={`Open now playing view for ${currentStation.name}`}
                    >
                        <StationInfo station={currentStation} isPlaying={isPlaying} nowPlaying={nowPlaying} liveListeners={liveListeners} statusText={statusText} statusLevel={statusLevel} />
                    </button>

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
