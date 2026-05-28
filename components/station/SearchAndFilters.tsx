import React from 'react';
import { Search, X } from 'lucide-react';

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
    stationCount,
}) => {
    return (
        <div className="mb-8 space-y-4">
            {/* Title row + search */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div>
                    <h2
                        className="text-2xl font-bold tracking-tight"
                        style={{ color: 'var(--color-text-primary)' }}
                    >
                        Live Stations
                    </h2>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                        {stationCount} station{stationCount !== 1 ? 's' : ''} · Kenya&apos;s Best Radio
                    </p>
                </div>

                {/* Search input */}
                <div className="relative w-full sm:w-72 shrink-0">
                    <Search
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                        style={{ color: 'var(--color-text-muted)' }}
                    />
                    <input
                        type="text"
                        placeholder="Search stations..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="input-field"
                        style={{ paddingLeft: '2.5rem', paddingRight: searchTerm ? '2.5rem' : '1rem' }}
                        aria-label="Search stations"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => onSearchChange('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
                            style={{ color: 'var(--color-text-muted)' }}
                            aria-label="Clear search"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Filter row: genre pills on the left, region pills on the right */}
            <div className="flex items-start gap-4">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5 flex-1" role="group" aria-label="Filter by genre">
                    {genres.map((genre) => (
                        <button
                            key={genre}
                            onClick={() => onGenreChange(genre)}
                            className={`filter-pill${selectedGenre === genre ? ' active' : ''}`}
                            aria-pressed={selectedGenre === genre}
                        >
                            {genre}
                        </button>
                    ))}
                </div>

                {regions.length > 2 && (
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5 shrink-0 justify-end" role="group" aria-label="Filter by region">
                        {regions.map((region) => (
                            <button
                                key={region}
                                onClick={() => onRegionChange(region)}
                                className={`filter-pill${selectedRegion === region ? ' active' : ''}`}
                                style={{ fontSize: '0.75rem' }}
                                aria-pressed={selectedRegion === region}
                            >
                                {region}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
