import { useState, useEffect, useCallback } from 'react';
import type { Station } from '@/types/Station';

const LS_KEY = 'airwave_recent_stations';
const MAX_RECENTS = 12;

function loadIds(): number[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(LS_KEY);
        return raw ? (JSON.parse(raw) as number[]) : [];
    } catch {
        return [];
    }
}

/** Record a station play. Most recent first, deduped, capped. */
export function pushRecentStation(stationId: number): void {
    try {
        const ids = [stationId, ...loadIds().filter(id => id !== stationId)].slice(0, MAX_RECENTS);
        localStorage.setItem(LS_KEY, JSON.stringify(ids));
        window.dispatchEvent(new Event('recents:changed'));
    } catch {}
}

/**
 * Recently played stations, resolved against the live station list
 * (so names/logos stay fresh). Re-renders when a new play is recorded.
 */
export function useRecentStations(stations: Station[]): Station[] {
    const [ids, setIds] = useState<number[]>([]);

    const refresh = useCallback(() => setIds(loadIds()), []);

    useEffect(() => {
        refresh();
        window.addEventListener('recents:changed', refresh);
        return () => window.removeEventListener('recents:changed', refresh);
    }, [refresh]);

    return ids
        .map(id => stations.find(s => s.id === id))
        .filter((s): s is Station => !!s);
}
