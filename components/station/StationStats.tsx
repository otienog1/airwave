import React from 'react';

interface StationStatsProps {
  isLive?: boolean;
  listeners?: number;
  genre: string;
}

export const StationStats: React.FC<StationStatsProps> = ({ isLive, listeners, genre }) => (
  <div className="flex items-center gap-4 mb-4 text-sm">
    <span className="flex items-center gap-1">
      <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
      {isLive ? 'Live' : 'Offline'}
    </span>
    <span className="text-blue-100">{listeners?.toLocaleString()} listeners</span>
    <span className="bg-white/20 px-2 py-1 rounded-full text-xs">{genre}</span>
  </div>
);