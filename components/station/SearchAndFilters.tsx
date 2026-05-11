import React from 'react';
import { Search, Filter } from 'lucide-react';

interface SearchAndFiltersProps {
    searchTerm: string;
    onSearchChange: (value: string) => void;
    selectedGenre: string;
    onGenreChange: (value: string) => void;
    selectedRegion: string;
    onRegionChange: (value: string) => void;
    genres: string[];
    regions: string[];
    stationCount: number;
}

export const SearchAndFilters: React.FC<SearchAndFiltersProps> = ({
    searchTerm,
    onSearchChange,
    selectedGenre,
    onGenreChange,
    selectedRegion,
    onRegionChange,
    genres,
    regions,
    stationCount
}) => {
    return (
        <div className="mb-8">
            {/* Search and Stats */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-6">
                {/* Search */}
                <div className="relative flex-1 max-w-md w-full">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search stations..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="input-field w-full pl-10"
                    />
                </div>

                {/* Stats */}
                <div className="text-center sm:text-right">
                    <p className="text-white font-semibold">{stationCount} Stations</p>
                    <p className="text-gray-400 text-sm">Kenya&apos;s Best Radio</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-400 text-sm">Filter:</span>
                </div>

                <select
                    value={selectedGenre}
                    onChange={(e) => onGenreChange(e.target.value)}
                    className="input-field text-sm min-w-0"
                >
                    {genres.map(genre => (
                        <option key={genre} value={genre} className="bg-gray-800">
                            {genre}
                        </option>
                    ))}
                </select>

                <select
                    value={selectedRegion}
                    onChange={(e) => onRegionChange(e.target.value)}
                    className="input-field text-sm min-w-0"
                >
                    {regions.map(region => (
                        <option key={region} value={region} className="bg-gray-800">
                            {region}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
};