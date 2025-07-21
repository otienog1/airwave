import React from 'react';
import { Radio } from 'lucide-react';
import { Station } from '../../types/Station';

interface StationInfoProps {
  station: Station;
}

export const StationInfo: React.FC<StationInfoProps> = ({ station }) => (
  <div className="flex items-center gap-3 flex-1 min-w-0">
    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
      <Radio className="w-6 h-6 text-white" />
    </div>
    <div className="min-w-0 flex-1">
      <h4 className="text-white font-semibold truncate">{station.name}</h4>
      <p className="text-gray-400 text-sm truncate">{station.description}</p>
    </div>
  </div>
);