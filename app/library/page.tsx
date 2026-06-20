'use client';
import React, { Suspense } from 'react';
import { Library, Heart, History } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/layout/Layout';
import { StationRow } from '@/components/station/StationRow';
import { HeartBurst } from '@/components/ui/HeartBurst';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/context/AuthContext';
import { usePlayer } from '@/context/PlayerContext';
import { useStations } from '@/hooks/useStations';
import { useFavorites } from '@/hooks/useFavorites';
import { useRecentStations } from '@/hooks/useRecentStations';
import type { Station } from '@/types/Station';

function LibraryContent() {
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const { stations, loading } = useStations({ autoFetch: true });
    const { favorites, toggleFavorite, showHeart } = useFavorites(isAuthenticated);
    const recents = useRecentStations(stations);
    const {
        currentStation,
        isPlaying,
        isLoading,
        listenerCounts,
        playStation,
    } = usePlayer();

    const favoriteStations = stations.filter(s => favorites.has(s.id));

    const renderRows = (list: Station[]) => (
        <ul className="space-y-0.5">
            {list.map(station => (
                <li key={station.id}>
                    <StationRow
                        station={station}
                        isPlaying={isPlaying && currentStation?.id === station.id}
                        isCurrentStation={currentStation?.id === station.id}
                        isLoading={isLoading && currentStation?.id === station.id}
                        onPlay={() => playStation(station)}
                        onFavorite={() => toggleFavorite(station.id)}
                        isFavorite={favorites.has(station.id)}
                        liveListeners={listenerCounts[station.id] ?? 0}
                    />
                </li>
            ))}
        </ul>
    );

    return (
        <>
            {showHeart && <HeartBurst />}

            <div className="flex items-center gap-3 mb-1">
                <Library className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
                <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                    Your Library
                </h1>
            </div>
            <p className="text-sm mb-8" style={{ color: 'var(--color-text-secondary)' }}>
                Favorites and stations you&apos;ve listened to
            </p>

            {loading ? (
                <ul className="space-y-2" aria-hidden="true">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <li key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'var(--color-surface-raised)' }} />
                    ))}
                </ul>
            ) : (
                <div className="space-y-10 max-w-2xl">
                    <section>
                        <h2
                            className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] mb-3"
                            style={{ color: 'var(--color-text-muted)' }}
                        >
                            <Heart className="w-3.5 h-3.5" /> Favorites
                        </h2>
                        {favoriteStations.length > 0 ? (
                            renderRows(favoriteStations)
                        ) : (
                            <EmptyState
                                icon={<Heart className="w-7 h-7" />}
                                heading="No favorites yet"
                                body="Tap the heart on any station to save it here."
                                action={{ label: 'Browse Stations', onClick: () => router.push('/') }}
                            />
                        )}
                    </section>

                    <section>
                        <h2
                            className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] mb-3"
                            style={{ color: 'var(--color-text-muted)' }}
                        >
                            <History className="w-3.5 h-3.5" /> Recently played
                        </h2>
                        {recents.length > 0 ? (
                            renderRows(recents)
                        ) : (
                            <EmptyState
                                icon={<History className="w-7 h-7" />}
                                heading="Nothing played yet"
                                body="Stations you listen to will appear here."
                                action={{ label: 'Start Listening', onClick: () => router.push('/') }}
                            />
                        )}
                    </section>
                </div>
            )}
        </>
    );
}

export default function LibraryPage() {
    return (
        <Layout>
            <main className="max-w-3xl mx-auto px-4 pt-5 pb-44 sm:pt-8 sm:pb-28 w-full">
                <Suspense fallback={null}>
                    <LibraryContent />
                </Suspense>
            </main>
        </Layout>
    );
}
