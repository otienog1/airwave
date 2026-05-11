import React from 'react';
import { Heart } from 'lucide-react';

interface StationHeaderProps {
  name: string;
  description?: string;
  onFavorite: () => void;
  isFavorite: boolean;
}

export const StationHeader: React.FC<StationHeaderProps> = ({
  name,
  description,
  onFavorite,
  isFavorite,
}) => (
  <div className="flex items-start justify-between mb-4">
    <div className="flex-1">
      <h3 className="font-bold text-lg mb-1 group-hover:text-blue-200 transition-colors">
        {name}
      </h3>
      <p className="text-sm text-blue-100 opacity-90">{description}</p>
    </div>
    <button
      onClick={onFavorite}
      className={`p-2  transition-all duration-200 hover:scale-110 ${isFavorite ? 'text-red-400' : 'text-white/60 hover:text-red-400'
        }`}
    >
      <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
    </button>
  </div>
);