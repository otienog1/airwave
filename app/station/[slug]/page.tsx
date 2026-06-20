import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { Layout } from '@/components/layout/Layout';
import { StationDetail } from '@/components/station/StationDetail';
import { slugify, deslugify } from '@/lib/slug';
import type { Station } from '@/types/Station';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.airwave.qzz.io/api';

async function fetchStationBySlug(slug: string): Promise<Station | null> {
    try {
        const res = await fetch(`${API_BASE}/stations?per_page=100`, {
            next: { revalidate: 300 },
        });
        if (!res.ok) return null;
        const data = await res.json() as { stations?: Station[] };
        return data.stations?.find(s => slugify(s.name) === slug) ?? null;
    } catch {
        return null;
    }
}

export async function generateMetadata(
    { params }: { params: { slug: string } }
): Promise<Metadata> {
    const station = await fetchStationBySlug(params.slug);
    const name = station?.name ?? deslugify(params.slug);
    const description = station?.description
        ?? `Listen to ${name} live on MBR Radio — Kenya's best radio stations.`;

    return {
        title: `${name} — Live Radio | MBR`,
        description,
        openGraph: {
            title: `${name} — Live on MBR Radio`,
            description,
            type: 'website',
            ...(station?.logo_url ? { images: [{ url: station.logo_url }] } : {}),
        },
    };
}

export default function StationPage({ params }: { params: { slug: string } }) {
    return (
        <Layout>
            <main className="max-w-7xl mx-auto px-4 pt-5 pb-44 sm:pt-8 sm:pb-28">
                <Suspense fallback={null}>
                    <StationDetail slug={params.slug} />
                </Suspense>
            </main>
        </Layout>
    );
}
