'use client';
import React, { useState } from 'react';
import { getGenreTheme } from '@/lib/genreTheme';

interface StationArtProps {
    name: string;
    logoUrl?: string | null;
    genre?: string | null;
    size?: number;
    className?: string;
    /** Hide initials (e.g. when a waveform overlay is shown on top) */
    hideInitials?: boolean;
    /** Square corner radius in px; defaults scale with size */
    radius?: number;
    /** Fill parent container (overrides size with 100%/100%) */
    fill?: boolean;
}

function getInitials(name: string): string {
    return name
        .split(/\s+/)
        .slice(0, 2)
        .map(w => w[0])
        .join('')
        .toUpperCase();
}

/** Small deterministic hash so each station gets a stable gradient angle. */
function nameHash(name: string): number {
    let h = 0;
    for (let i = 0; i < name.length; i++) {
        h = (h * 31 + name.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
}

/**
 * Station artwork with a deterministic genre-gradient fallback.
 * Replaces StationAvatar: when no logo exists the tile is a branded
 * gradient (stable per station) instead of a flat initials box.
 */
export const StationArt: React.FC<StationArtProps> = ({
    name,
    logoUrl,
    genre,
    size = 36,
    className = '',
    hideInitials = false,
    radius,
    fill = false,
}) => {
    const [imgError, setImgError] = useState(false);
    const showImage = !!logoUrl && !imgError;
    const theme = getGenreTheme(genre);

    // Stable per-station angle in a pleasant range (105°–165°)
    const angle = 105 + (nameHash(name) % 60);
    const [from, to] = theme.gradient;
    const borderRadius = fill ? (radius ?? 0) : (radius ?? Math.max(8, Math.round(size * 0.28)));

    return (
        <div
            className={`flex items-center justify-center shrink-0 overflow-hidden ${className}`}
            style={{
                width: fill ? '100%' : size,
                height: fill ? '100%' : size,
                borderRadius,
                background: showImage
                    ? 'var(--color-surface-raised)'
                    : `linear-gradient(${angle}deg, ${from} 0%, ${to} 100%)`,
                border: showImage ? '1px solid var(--color-border)' : 'none',
            }}
        >
            {showImage ? (
                <img
                    src={logoUrl!}
                    alt={`${name} logo`}
                    width={size}
                    height={size}
                    className="object-contain w-full h-full"
                    onError={() => setImgError(true)}
                />
            ) : !hideInitials ? (
                <span
                    className="font-bold select-none text-white"
                    style={{ fontSize: size * 0.34, textShadow: '0 1px 2px rgba(0,0,0,0.25)' }}
                >
                    {getInitials(name)}
                </span>
            ) : null}
        </div>
    );
};
