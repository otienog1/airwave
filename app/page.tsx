import React, { Suspense } from 'react';
import { Layout } from '@/components/layout/Layout';
import ModernAirwave from '@/components/MordernAirwave';

export default function Home() {
    return (
        <Layout>
            <main className="max-w-7xl mx-auto px-4 py-8 pb-24">
                <Suspense fallback={null}>
                    <ModernAirwave />
                </Suspense>
            </main>
        </Layout>
    );
}
