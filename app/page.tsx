import React, { Suspense } from 'react';
import { Layout } from '@/components/layout/Layout';
import ModernAirwave from '@/components/MordernAirwave';

export default function Home() {
    return (
        <Layout>
            <main className="max-w-7xl mx-auto px-4 pt-5 pb-44 sm:pt-8 sm:pb-28">
                <Suspense fallback={null}>
                    <ModernAirwave />
                </Suspense>
            </main>
        </Layout>
    );
}
