import React from 'react';

interface SkeletonCardProps {
    layout?: 'card' | 'row';
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ layout = 'card' }) => {
    if (layout === 'row') {
        return (
            <div
                className="flex items-center gap-3 px-3 py-3 rounded-2xl animate-pulse"
                style={{ background: 'var(--color-surface)' }}
                aria-hidden="true"
            >
                <div
                    className="w-10 h-10 rounded-xl shrink-0"
                    style={{ background: 'var(--color-surface-raised)' }}
                />
                <div className="flex-1 space-y-2">
                    <div className="h-3 rounded-full w-2/3" style={{ background: 'var(--color-surface-raised)' }} />
                    <div className="h-2.5 rounded-full w-1/3" style={{ background: 'var(--color-surface-raised)' }} />
                </div>
            </div>
        );
    }
    return (
        <div
            className="rounded-2xl overflow-hidden animate-pulse"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            aria-hidden="true"
        >
            <div
                className="w-full"
                style={{ aspectRatio: '1/1', background: 'var(--color-surface-raised)' }}
            />
            <div className="p-3 space-y-2">
                <div className="h-3 rounded-full w-3/4" style={{ background: 'var(--color-surface-raised)' }} />
                <div className="h-2.5 rounded-full w-1/2" style={{ background: 'var(--color-surface-raised)' }} />
            </div>
        </div>
    );
};
