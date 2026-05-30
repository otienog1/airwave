import React, { forwardRef, type ReactNode } from 'react';
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
    loading?: boolean;
    trendingSlot?: ReactNode;
}

const PillRow = ({
    items,
    selected,
    onSelect,
    ariaLabel,
    small,
}: {
    items: string[];
    selected: string;
    onSelect: (v: string) => void;
    ariaLabel: string;
    small?: boolean;
}) => (
    <div
        className="relative"
        style={{
            maskImage: 'linear-gradient(to right, black 88%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to right, black 88%, transparent 100%)',
        }}
    >
        <div
            className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5"
            role="group"
            aria-label={ariaLabel}
        >
            {items.map((item) => (
                <button
                    key={item}
                    onClick={() => onSelect(item)}
                    className={`filter-pill shrink-0${selected === item ? ' active' : ''}`}
                    style={small ? { fontSize: '0.75rem', padding: '0.3rem 0.75rem' } : undefined}
                    aria-pressed={selected === item}
                >
                    {item}
                </button>
            ))}
            {/* spacer so last pill clears the fade */}
            <span className="shrink-0 w-8" aria-hidden />
        </div>
    </div>
);

export const SearchAndFilters = forwardRef<HTMLInputElement, SearchAndFiltersProps>(({
    searchTerm,
    onSearchChange,
    selectedGenre,
    onGenreChange,
    selectedRegion,
    onRegionChange,
    genres,
    regions,
    stationCount,
    loading,
    trendingSlot,
}, ref) => {
    const showRegions = regions.length > 2;

    return (
        <div className="mb-6">

            {/* ── Desktop layout (sm+) ──────────────────────────────── */}
            <div className="hidden sm:block space-y-4">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                            Live Stations
                        </h2>
                        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                            {loading ? '…' : `${stationCount} station${stationCount !== 1 ? 's' : ''}`} · Kenya&apos;s Best Radio
                        </p>
                    </div>

                    <div className="relative w-72 shrink-0">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
                        <input
                            ref={ref}
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
                                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center"
                                style={{ color: 'var(--color-text-muted)' }}
                                aria-label="Clear search"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                {trendingSlot}

                <div className="flex items-start gap-4">
                    <PillRow items={genres} selected={selectedGenre} onSelect={onGenreChange} ariaLabel="Filter by genre" />
                    {showRegions && (
                        <PillRow items={regions} selected={selectedRegion} onSelect={onRegionChange} ariaLabel="Filter by region" small />
                    )}
                </div>
            </div>

            {/* ── Mobile layout (< sm) ──────────────────────────────── */}
            <div className="flex flex-col gap-3 sm:hidden">

                {/* Title row */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                            Live Stations
                        </h2>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                            {loading ? '…' : `${stationCount} station${stationCount !== 1 ? 's' : ''}`} · Kenya&apos;s Best Radio
                        </p>
                    </div>
                </div>

                {trendingSlot}

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
                    <input
                        ref={ref}
                        type="search"
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
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ color: 'var(--color-text-muted)' }}
                            aria-label="Clear search"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* Genre pills */}
                <PillRow items={genres} selected={selectedGenre} onSelect={onGenreChange} ariaLabel="Filter by genre" />

                {/* Region pills */}
                {showRegions && (
                    <PillRow items={regions} selected={selectedRegion} onSelect={onRegionChange} ariaLabel="Filter by region" small />
                )}
            </div>

        </div>
    );
});
SearchAndFilters.displayName = 'SearchAndFilters';
