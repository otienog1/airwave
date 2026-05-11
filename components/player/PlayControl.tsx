import React from 'react';
import { Play, Pause, Loader2 } from 'lucide-react';

interface PlayControlProps {
  isPlaying: boolean;
  isLoading: boolean;
  onTogglePlay: () => void;
}

export const PlayControl: React.FC<PlayControlProps> = ({
  isPlaying,
  isLoading,
  onTogglePlay,
}) => (
  <button
    onClick={onTogglePlay}
    disabled={isLoading}
    className="w-12 h-12 bg-blue-600 hover:bg-blue-700  flex items-center justify-center transition-colors"
  >
    {isLoading ? (
      <Loader2 className="w-6 h-6 text-white animate-spin" />
    ) : isPlaying ? (
      <Pause className="w-6 h-6 text-white" />
    ) : (
      <Play className="w-6 h-6 text-white ml-1" />
    )}
  </button>
);