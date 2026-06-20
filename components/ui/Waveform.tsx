'use client';
import React from 'react';

interface WaveformProps {
    isAnimating?: boolean;
    bars?: number;
    height?: number;
    color?: string;
    className?: string;
}

// [animationDelay (s), idleScaleY when paused]
const BAR_CONFIGS: [number, number][] = [
    [0.00, 0.55],
    [0.15, 0.90],
    [0.07, 0.70],
    [0.22, 1.00],
    [0.12, 0.65],
    [0.30, 0.45],
];

export const Waveform: React.FC<WaveformProps> = ({
    isAnimating = false,
    bars = 5,
    height = 14,
    color = 'currentColor',
    className = '',
}) => {
    const configs = BAR_CONFIGS.slice(0, bars);

    return (
        <span
            className={`inline-flex items-end gap-[2.5px] ${className}`}
            aria-hidden="true"
            style={{ height, lineHeight: 0 }}
        >
            {configs.map(([animDelay, idleFrac], i) => (
                <span
                    key={i}
                    style={{
                        display: 'inline-block',
                        width: 3,
                        height,
                        background: color,
                        borderRadius: 2,
                        transformOrigin: 'bottom center',
                        transform: isAnimating ? undefined : `scaleY(${idleFrac})`,
                        animation: isAnimating
                            ? `waveform-bar 0.9s ease-in-out ${animDelay}s infinite`
                            : 'none',
                        transition: 'transform 0.4s ease',
                    }}
                />
            ))}
        </span>
    );
};
