'use client';
import React, { useEffect, useState } from 'react';
import { Music } from 'lucide-react';

interface HistoryEntry {
    _id: string;
    title: string;
    artist: string | null;
    detectedAt: string;
}

interface RecentTracksProps {
    stationId: number;
    stationName: string;
    accentColor: string;
    /** Hide this track (the one currently playing) */
    excludeTitle?: string | null;
    limit?: number;
}

export function timeAgo(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

/** Recently played tracks on a station, from the plays collection. */
export const RecentTracks: React.FC<RecentTracksProps> = ({
    stationId,
    stationName,
    accentColor,
    excludeTitle,
    limit = 6,
}) => {
    const [history, setHistory] = useState<HistoryEntry[]>([]);

    useEffect(() => {
        let cancelled = false;
        fetch(`/api/analytics/station/${stationId}?limit=${limit + 2}`)
            .then(res => res.json())
            .then((data: { history?: HistoryEntry[] }) => {
                if (!cancelled) setHistory(data.history ?? []);
            })
            .catch(() => { if (!cancelled) setHistory([]); });
        return () => { cancelled = true; };
    }, [stationId, limit]);

    const tracks = history.filter(h => h.title !== excludeTitle).slice(0, limit);
    if (tracks.length === 0) return null;

    return (
        <div>
            <h3
                className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-3"
                style={{ color: 'var(--color-text-muted)' }}
            >
                Recently on {stationName}
            </h3>
            <ul className="space-y-1">
                {tracks.map(track => (
                    <li key={track._id} className="flex items-center gap-3 py-2 px-3 -mx-3 rounded-xl">
                        <Music className="w-3.5 h-3.5 shrink-0" style={{ color: accentColor }} aria-hidden="true" />
                        <span
                            className="flex-1 min-w-0 truncate text-sm"
                            style={{ color: 'var(--color-text-primary)' }}
                        >
                            {track.title}
                        </span>
                        <span
                            className="text-xs shrink-0 tabular-nums"
                            style={{ color: 'var(--color-text-muted)' }}
                        >
                            {timeAgo(track.detectedAt)}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
};
