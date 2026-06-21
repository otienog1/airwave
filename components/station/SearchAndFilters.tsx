'use client';

import React, { forwardRef, useState, type ReactNode } from 'react';
import { Search, X, SlidersHorizontal, LayoutGrid, LayoutList } from 'lucide-react';

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
    layout?: 'grid' | 'list';
    onLayoutChange?: (layout: 'grid' | 'list') => void;
}

function Chip({
    label,
    active,
    onClick,
}: {
    label: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            aria-pressed={active}
            className="shrink-0 cursor-pointer rounded-xl px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest transition-all duration-150"
            style={
                active
                    ? {
                          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                          color: '#ffffff',
                          border: '1px solid transparent',
                          boxShadow: '0 0 0 1px rgba(99,102,241,0.4)',
                      }
                    : {
                          background: 'var(--color-surface)',
                          color: 'var(--color-text-secondary)',
                          border: '1px solid var(--color-border)',
                      }
            }
        >
            {label}
        </button>
    );
}

function FilterSection({
    label,
    items,
    selected,
    onSelect,
    scroll = false,
}: {
    label: string;
    items: string[];
    selected: string;
    onSelect: (v: string) => void;
    scroll?: boolean;
}) {
    return (
        <div className="space-y-2">
            <p
                className="text-[9px] font-semibold uppercase tracking-widest"
                style={{ color: 'var(--color-text-muted)' }}
            >
                {label}
            </p>
            <div
                className={scroll ? 'flex gap-1.5 overflow-x-auto pb-0.5' : 'flex flex-wrap gap-1.5'}
                style={scroll ? { scrollbarWidth: 'none' } : undefined}
            >
                {items.map((item) => (
                    <Chip
                        key={item}
                        label={item}
                        active={selected === item}
                        onClick={() => onSelect(item)}
                    />
                ))}
            </div>
        </div>
    );
}

export const SearchAndFilters = forwardRef<HTMLInputElement, SearchAndFiltersProps>(
    (
        {
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
            layout = 'grid',
            onLayoutChange,
        },
        ref
    ) => {
        const [showFilters, setShowFilters] = useState(false);
        const showRegions = regions.length > 2;
        const filtersActive = selectedGenre !== 'All' || selectedRegion !== 'All';

        return (
            <div className="mb-0 sm:mb-6">
                {/* ── Desktop ─────────────────────────────────────────── */}
                <div className="hidden sm:block space-y-4">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h2
                                className="text-sm font-semibold uppercase"
                                style={{ color: 'var(--color-text-primary)', letterSpacing: '0.2em' }}
                            >
                                Live Stations
                            </h2>
                            <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                                {loading ? '…' : `${stationCount} station${stationCount !== 1 ? 's' : ''}`}{' '}
                                · Kenya&apos;s Best Radio
                            </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            {/* Layout toggle */}
                            {onLayoutChange && (
                                <div
                                    className="flex items-center rounded-xl p-1 gap-0.5"
                                    style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                                >
                                    <button
                                        onClick={() => onLayoutChange('grid')}
                                        className="p-2 rounded-lg transition-colors cursor-pointer"
                                        style={layout === 'grid'
                                            ? { background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: '#fff' }
                                            : { color: 'var(--color-text-muted)' }}
                                        aria-label="Grid view"
                                        title="Grid view"
                                    >
                                        <LayoutGrid className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => onLayoutChange('list')}
                                        className="p-2 rounded-lg transition-colors cursor-pointer"
                                        style={layout === 'list'
                                            ? { background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: '#fff' }
                                            : { color: 'var(--color-text-muted)' }}
                                        aria-label="List view"
                                        title="List view"
                                    >
                                        <LayoutList className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                            <div className="relative w-72">
                                <Search
                                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                                    style={{ color: 'var(--color-text-muted)' }}
                                />
                                <input
                                    ref={ref}
                                    type="text"
                                    placeholder="Search stations..."
                                    value={searchTerm}
                                    onChange={(e) => onSearchChange(e.target.value)}
                                    className="input-field"
                                    style={{
                                        paddingLeft: '2.5rem',
                                        paddingRight: searchTerm ? '2.5rem' : '1rem',
                                    }}
                                    aria-label="Search stations"
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => onSearchChange('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center cursor-pointer"
                                        style={{ color: 'var(--color-text-muted)' }}
                                        aria-label="Clear search"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>

                            <button
                                onClick={() => setShowFilters((f) => !f)}
                                aria-expanded={showFilters}
                                aria-label="Toggle filters"
                                className="relative flex items-center justify-center p-3.5 rounded-xl cursor-pointer transition-all duration-200 shrink-0"
                                style={
                                    showFilters
                                        ? {
                                              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                              color: '#ffffff',
                                              border: '1px solid transparent',
                                          }
                                        : {
                                              background: 'var(--color-surface)',
                                              color: 'var(--color-text-secondary)',
                                              border: '1px solid var(--color-border)',
                                          }
                                }
                            >
                                <SlidersHorizontal className="w-4 h-4" />
                                {filtersActive && !showFilters && (
                                    <span
                                        className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
                                        style={{ background: '#6366f1', border: '2px solid var(--color-bg)' }}
                                    />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Filter panel */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateRows: showFilters ? '1fr' : '0fr',
                            opacity: showFilters ? 1 : 0,
                            transition: 'grid-template-rows 280ms ease, opacity 200ms ease',
                        }}
                    >
                        <div style={{ overflow: 'hidden' }}>
                            <div
                                className="rounded-2xl p-4 mt-3"
                                style={{
                                    background: 'var(--color-surface-raised)',
                                    border: '1px solid var(--color-border)',
                                }}
                            >
                                <div className="flex items-start gap-6">
                                    <div className="flex-1 min-w-0">
                                        <FilterSection
                                            label="Genre"
                                            items={genres}
                                            selected={selectedGenre}
                                            onSelect={onGenreChange}
                                        />
                                    </div>
                                    {showRegions && (
                                        <div className="shrink-0">
                                            <FilterSection
                                                label="Region"
                                                items={regions}
                                                selected={selectedRegion}
                                                onSelect={onRegionChange}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {trendingSlot}
                </div>

                {/* ── Mobile ──────────────────────────────────────────── */}
                <div className="flex flex-col sm:hidden">
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <Search
                                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                                style={{ color: 'var(--color-text-muted)' }}
                            />
                            <input
                                type="search"
                                placeholder="Search stations..."
                                value={searchTerm}
                                onChange={(e) => onSearchChange(e.target.value)}
                                className="input-field"
                                style={{
                                    paddingLeft: '2.5rem',
                                    paddingRight: searchTerm ? '2.5rem' : '1rem',
                                }}
                                aria-label="Search stations"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => onSearchChange('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center cursor-pointer"
                                    style={{ color: 'var(--color-text-muted)' }}
                                    aria-label="Clear search"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        <button
                            onClick={() => setShowFilters((f) => !f)}
                            aria-expanded={showFilters}
                            aria-label="Toggle filters"
                            className="relative flex items-center justify-center p-3.5 rounded-xl cursor-pointer transition-all duration-200 shrink-0"
                            style={
                                showFilters
                                    ? {
                                          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                          color: '#ffffff',
                                          border: '1px solid transparent',
                                      }
                                    : {
                                          background: 'var(--color-surface)',
                                          color: 'var(--color-text-muted)',
                                          border: '1px solid var(--color-border)',
                                      }
                            }
                        >
                            <SlidersHorizontal className="w-4 h-4" />
                            {filtersActive && !showFilters && (
                                <span
                                    className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
                                    style={{ background: '#6366f1', border: '2px solid var(--color-bg)' }}
                                />
                            )}
                        </button>
                    </div>

                    {/* Filter panel */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateRows: showFilters ? '1fr' : '0fr',
                            opacity: showFilters ? 1 : 0,
                            transition: 'grid-template-rows 280ms ease, opacity 200ms ease',
                        }}
                    >
                        <div style={{ overflow: 'hidden' }}>
                            <div
                                className="rounded-2xl p-4 mt-3"
                                style={{
                                    background: 'var(--color-surface-raised)',
                                    border: '1px solid var(--color-border)',
                                }}
                            >
                                <div className="flex flex-col gap-3">
                                    <FilterSection
                                        label="Genre"
                                        items={genres}
                                        selected={selectedGenre}
                                        onSelect={onGenreChange}
                                        scroll
                                    />
                                    {showRegions && (
                                        <FilterSection
                                            label="Region"
                                            items={regions}
                                            selected={selectedRegion}
                                            onSelect={onRegionChange}
                                            scroll
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-5">
                        <div className="flex items-center gap-4 mb-5">
                            <div className="h-px flex-1" style={{ background: 'var(--color-border)' }} />
                            <span
                                className="text-[9px] font-semibold uppercase tracking-widest shrink-0"
                                style={{ color: 'var(--color-text-muted)' }}
                            >
                                Trending Now
                            </span>
                            <div className="h-px flex-1" style={{ background: 'var(--color-border)' }} />
                        </div>
                        {trendingSlot}
                    </div>
                </div>
            </div>
        );
    }
);
SearchAndFilters.displayName = 'SearchAndFilters';
