import React from 'react';
import { Station } from '../../types/Station';
import { StationHeader } from './StationHeader';
import { StationStats } from './StationStats';
import { PlayButton } from './PlayButton';

interface StationCardProps {
  station: Station;
  isPlaying: boolean;
  isCurrentStation: boolean;
  onPlay: () => void;
  onFavorite: () => void;
  isFavorite: boolean;
}

export const StationCard: React.FC<StationCardProps> = ({
  station,
  isPlaying,
  isCurrentStation,
  onPlay,
  onFavorite,
  isFavorite,
}) => (
  <div
    className={`group relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${
      isCurrentStation ? 'ring-2 ring-blue-500 shadow-blue-500/25' : ''
    }`}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600 opacity-90" />
    <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
    <div className="relative p-6 text-white">
      <StationHeader
        name={station.name}
        description={station.description}
        onFavorite={onFavorite}
        isFavorite={isFavorite}
      />
      <StationStats
        isLive={station.isLive}
        listeners={station.listeners}
        genre={station.genre}
      />
      <PlayButton
        isPlaying={isPlaying}
        isCurrentStation={isCurrentStation}
        isLive={station.isLive}
        onPlay={onPlay}
      />
    </div>
  </div>
);