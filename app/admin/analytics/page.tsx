'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, BarChart2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Layout } from '@/components/layout/Layout';
import { LiveStatusBar } from '@/components/analytics/LiveStatusBar';
import { PeriodFilter } from '@/components/analytics/PeriodFilter';
import { OverviewTab } from '@/components/analytics/tabs/OverviewTab';
import { StationsTab } from '@/components/analytics/tabs/StationsTab';
import { SongsTab } from '@/components/analytics/tabs/SongsTab';
import { GenresTab } from '@/components/analytics/tabs/GenresTab';
import { HealthTab } from '@/components/analytics/tabs/HealthTab';
import { fetchRealTime, type RealTimeResponse } from '@/lib/analyticsApi';

type Tab = 'overview' | 'stations' | 'songs' | 'genres' | 'health';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview',  label: 'Overview' },
  { id: 'stations',  label: 'Stations' },
  { id: 'songs',     label: 'Songs & Artists' },
  { id: 'genres',    label: 'Genres & Regions' },
  { id: 'health',    label: 'Station Health' },
];

const VALID_PERIODS = [1, 7, 30, 90];

export default function AnalyticsPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading } = useAuth();

  const tab = (params.get('tab') as Tab) || 'overview';
  const period = VALID_PERIODS.includes(Number(params.get('period')))
    ? Number(params.get('period'))
    : 7;

  const [realtime, setRealtime] = useState<RealTimeResponse | null>(null);

  useEffect(() => {
    if (!loading && !user?.is_admin) router.replace('/');
  }, [user, loading, router]);

  useEffect(() => {
    fetchRealTime().then(setRealtime).catch(() => {});
    const t = setInterval(
      () => fetchRealTime().then(setRealtime).catch(() => {}),
      15_000
    );
    return () => clearInterval(t);
  }, []);

  if (loading || !user?.is_admin) return null;

  const setTab = (t: Tab) => {
    const next = new URLSearchParams(params.toString());
    next.set('tab', t);
    router.replace(`?${next.toString()}`);
  };

  return (
    <Layout>
      <div className="flex flex-col min-h-screen pb-24">
        <LiveStatusBar />

        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Link
                href="/admin"
                className="flex items-center gap-1.5 text-sm transition-colors"
                style={{ color: 'var(--color-text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-primary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}
              >
                <ArrowLeft className="w-4 h-4" />
                Stations
              </Link>
              <span style={{ color: 'var(--color-border)' }}>/</span>
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
                >
                  <BarChart2 className="w-4 h-4" style={{ color: 'white' }} />
                </div>
                <h1
                  className="text-lg font-bold"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  Analytics
                </h1>
              </div>
            </div>
            <PeriodFilter current={period} />
          </div>

          {/* Tab nav */}
          <div className="flex gap-1 overflow-x-auto" role="tablist">
            {TABS.map(t => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap shrink-0"
                style={{
                  background: tab === t.id ? 'rgba(99,102,241,0.12)' : 'transparent',
                  color: tab === t.id ? '#6366f1' : 'var(--color-text-secondary)',
                  border: `1px solid ${tab === t.id ? 'rgba(99,102,241,0.3)' : 'transparent'}`,
                  cursor: 'pointer',
                  transition: 'background 150ms ease, color 150ms ease',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div role="tabpanel">
            {tab === 'overview'  && <OverviewTab period={period} realtime={realtime} />}
            {tab === 'stations'  && <StationsTab period={period} realtime={realtime} />}
            {tab === 'songs'     && <SongsTab period={period} />}
            {tab === 'genres'    && <GenresTab period={period} />}
            {tab === 'health'    && <HealthTab period={period} realtime={realtime} />}
          </div>
        </main>
      </div>
    </Layout>
  );
}
