import React from 'react';
import { FaPlay, FaPause, FaRedo, FaVolumeUp, FaVolumeMute } from 'react-icons/fa';

interface AudioPlayerProps {
    stationName: string | null;
    isPlaying: boolean;
    onTogglePlay: () => void;
    onReload: () => void;
    volume: number;
    onVolumeChange: (newVolume: number) => void;
    isMuted: boolean;
    onMuteToggle: () => void;
    metadata: string | null;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({
    stationName,
    isPlaying,
    onTogglePlay,
    onReload,
    volume,
    onVolumeChange,
    isMuted,
    onMuteToggle,
    metadata
}) => {
    return (
        <>
            <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 shadow-lg p-4">
                <div className="flex items-center justify-between max-w-4xl mx-auto">
                    <button onClick={onTogglePlay}>
                        {isPlaying ? <FaPause /> : <FaPlay />}
                    </button>
                    <button onClick={onReload}>
                        <FaRedo />
                    </button>
                    <button onClick={onMuteToggle}>
                        {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
                    </button>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                    />
                    <div>{stationName ? `Now playing: ${stationName}` : 'Select a station'}</div>
                </div>
            </div>
            {metadata && (
                <div className="fixed bottom-16 left-0 right-0 bg-black bg-opacity-50 text-white p-2 text-center">
                    {metadata}
                </div>
            )}
        </>
    );
};

export default AudioPlayer;