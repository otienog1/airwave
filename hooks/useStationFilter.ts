import { useState, useMemo } from 'react';
import type { Station } from '@/types/Station';

export function useStationFilter(stations: Station[]) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [selectedRegion, setSelectedRegion] = useState('All');

  const genres = useMemo(
    () => ['All', ...Array.from(new Set(stations.map(s => s.genre).filter(Boolean)))],
    [stations]
  );

  const regions = useMemo(
    () => ['All', ...Array.from(new Set(stations.map(s => s.region).filter(Boolean)))],
    [stations]
  );

  const filteredStations = useMemo(() => {
    let result = stations;
    if (searchTerm)
      result = result.filter(
        s =>
          s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    if (selectedGenre !== 'All') result = result.filter(s => s.genre === selectedGenre);
    if (selectedRegion !== 'All') result = result.filter(s => s.region === selectedRegion);
    return result;
  }, [stations, searchTerm, selectedGenre, selectedRegion]);

  return {
    filteredStations,
    searchTerm,
    setSearchTerm,
    selectedGenre,
    setSelectedGenre,
    selectedRegion,
    setSelectedRegion,
    genres,
    regions,
  };
}
