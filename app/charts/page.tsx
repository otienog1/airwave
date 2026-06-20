'use client';
import React, { useEffect, useState } from 'react';
import { TrendingUp, Music } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';

interface TrendingEntry {
    title: string;
    artist: string | null;
    playCount: number;
    stations: string[];
    lastSeen: string;
}

const PERIODS = [
    { label: 'Today', hours: 24 },
    { label: '3 Days', hours: 72 },
    { label: 'This Week', hours: 168 },
] as const;

export default function ChartsPage() {
    const [hours, setHours] = useState<number>(24);
    const [entries, setEntries] = useState<TrendingEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        fetch(`/api/analytics/trending?hours=${hours}&limit=20`)
            .then(res => res.json())
            .then((data: { results?: TrendingEntry[] }) => {
                if (!cancelled) {
                    setEntries(data.results ?? []);
                    setLoading(false);
                }
            })
            .catch(() => { if (!cancelled) { setEntries([]); setLoading(false); } });
        return () => { cancelled = true; };
    }, [hours]);

    return (
        <Layout>
            <main className="max-w-3xl mx-auto px-4 pt-5 pb-44 sm:pt-8 sm:pb-28 w-full">
                <div className="flex items-center gap-3 mb-1">
                    <TrendingUp className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
                    <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                        Charts
                    </h1>
                </div>
                <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
                    The most played songs on Kenyan radio
                </p>

                {/* Period filter */}
                <div className="flex gap-2 mb-6" role="tablist" aria-label="Chart period">
                    {PERIODS.map(p => (
                        <button
                            key={p.hours}
                            onClick={() => setHours(p.hours)}
                            className={`filter-pill ${hours === p.hours ? 'active' : ''}`}
                            role="tab"
                            aria-selected={hours === p.hours}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <ul className="space-y-2" aria-hidden="true">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <li
                                key={i}
                                className="h-14 rounded-xl animate-pulse"
                                style={{ background: 'var(--color-surface-raised)' }}
                            />
                        ))}
                    </ul>
                ) : entries.length === 0 ? (
                    <div className="flex flex-col items-center py-16 gap-3 text-center">
                        <Music className="w-8 h-8" style={{ color: 'var(--color-text-muted)' }} />
                        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                            No chart data for this period yet. Check back soon.
                        </p>
                    </div>
                ) : (
                    <ol className="space-y-1">
                        {entries.map((entry, i) => (
                            <li
                                key={`${entry.title}-${i}`}
                                className="flex items-center gap-4 py-3 px-3 -mx-3 rounded-xl transition-colors hover:bg-[var(--color-overlay-hover)]"
                            >
                                <span
                                    className="w-7 text-center font-bold tabular-nums shrink-0"
                                    style={{
                                        color: i < 3 ? 'var(--color-accent)' : 'var(--color-text-muted)',
                                        fontSize: i < 3 ? '1.05rem' : '0.875rem',
                                    }}
                                    aria-hidden="true"
                                >
                                    {i + 1}
                                </span>
                                <span className="flex-1 min-w-0">
                                    <span
                                        className="block text-sm font-semibold truncate"
                                        style={{ color: 'var(--color-text-primary)' }}
                                    >
                                        {entry.title}
                                    </span>
                                    <span className="block text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                                        {entry.stations.slice(0, 3).join(' · ')}
                                    </span>
                                </span>
                                <span
                                    className="text-xs tabular-nums shrink-0"
                                    style={{ color: 'var(--color-text-secondary)' }}
                                    aria-label={`${entry.playCount} plays`}
                                >
                                    {entry.playCount} {entry.playCount === 1 ? 'play' : 'plays'}
                                </span>
                            </li>
                        ))}
                    </ol>
                )}
            </main>
        </Layout>
    );
}
