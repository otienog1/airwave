import type { Station } from '@/types/Station';

/** "Capital FM" → "capital-fm" */
export function slugify(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

export function findStationBySlug(stations: Station[], slug: string): Station | undefined {
    return stations.find(s => slugify(s.name) === slug);
}

/** "capital-fm" → "Capital Fm" — display fallback when the station list hasn't loaded */
export function deslugify(slug: string): string {
    return slug
        .split('-')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}
