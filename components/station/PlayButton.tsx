import React from 'react';
import { Play, Pause } from 'lucide-react';

interface PlayButtonProps {
  isPlaying: boolean;
  isCurrentStation: boolean;
  isLive?: boolean;
  onPlay: () => void;
}

export const PlayButton: React.FC<PlayButtonProps> = ({
  isPlaying,
  isCurrentStation,
  isLive,
  onPlay,
}) => (
  <button
    onClick={onPlay}
    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 py-3 px-4 rounded-xl font-semibold transition-all duration-200 hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
    disabled={!isLive}
  >
    {isCurrentStation && isPlaying ? (
      <>
        <Pause className="w-5 h-5" />
        Now Playing
      </>
    ) : (
      <>
        <Play className="w-5 h-5" />
        {isCurrentStation ? 'Play' : 'Listen'}
      </>
    )}
  </button>
);