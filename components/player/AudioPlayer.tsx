import React from 'react';
import { Station } from '../../types/Station';
import { StationInfo } from './StationInfo';
import { PlayControl } from './PlayControl';
import { VolumeControl } from './VolumeControl';

interface AudioPlayerProps {
  currentStation: Station | null;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  onTogglePlay: () => void;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
  isLoading: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  currentStation,
  isPlaying,
  volume,
  isMuted,
  onTogglePlay,
  onVolumeChange,
  onMuteToggle,
  isLoading,
}) => {
  if (!currentStation) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-t border-gray-700 backdrop-blur-lg bg-opacity-95 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center gap-4">
          <StationInfo station={currentStation} />
          
          <div className="flex items-center gap-4">
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
          </div>
        </div>
      </div>
    </div>
  );
};