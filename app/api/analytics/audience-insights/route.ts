import { NextRequest, NextResponse } from 'next/server';
import { getSnapshotsCollection } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

/**
 * GET /api/analytics/audience-insights?days=7
 * Peak concurrent stream listeners and week-over-week growth per station,
 * aggregated from stationSnapshots (15s health snapshots, 30d TTL).
 */
export async function GET(req: NextRequest) {
  try {
    const days = Math.min(parseInt(req.nextUrl.searchParams.get('days') ?? '7'), 30);
    const snapshots = await getSnapshotsCollection();
    const now = Date.now();
    const periodStart = new Date(now - days * 86_400_000);

    // Peak: bucket snapshots per minute, sum listeners across stations,
    // take the largest bucket (approximate concurrent peak)
    const peakRows = await snapshots
      .aggregate<{ _id: string; total: number }>([
        { $match: { snapshotAt: { $gte: periodStart }, listeners: { $ne: null } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d %H:%M', date: '$snapshotAt' } },
            total: { $sum: '$listeners' },
          },
        },
        { $sort: { total: -1 } },
        { $limit: 1 },
      ])
      .toArray();

    const peak = peakRows[0] ?? null;

    // Movers: avg listeners per station, current half vs previous half of
    // the period (for days=7 that's this-week-ish vs last-week-ish)
    const halfMs = (days * 86_400_000) / 2;
    const midpoint = new Date(now - halfMs);
    const prevStart = new Date(now - 2 * halfMs);

    const movers = await snapshots
      .aggregate<{
        station_id: number;
        station_name: string;
        current: number;
        previous: number;
      }>([
        { $match: { snapshotAt: { $gte: prevStart }, listeners: { $ne: null } } },
        {
          $group: {
            _id: '$stationId',
            station_name: { $first: '$stationName' },
            current: {
              $avg: { $cond: [{ $gte: ['$snapshotAt', midpoint] }, '$listeners', null] },
            },
            previous: {
              $avg: { $cond: [{ $lt: ['$snapshotAt', midpoint] }, '$listeners', null] },
            },
          },
        },
        {
          $project: {
            _id: 0,
            station_id: '$_id',
            station_name: 1,
            current: { $round: [{ $ifNull: ['$current', 0] }, 1] },
            previous: { $round: [{ $ifNull: ['$previous', 0] }, 1] },
          },
        },
      ])
      .toArray();

    const withGrowth = movers
      .map(m => ({
        ...m,
        growth_pct:
          m.previous > 0
            ? Math.round(((m.current - m.previous) / m.previous) * 1000) / 10
            : m.current > 0 ? 100 : 0,
      }))
      .filter(m => m.current > 0 || m.previous > 0)
      .sort((a, b) => b.growth_pct - a.growth_pct);

    return NextResponse.json(
      {
        days,
        peak: peak ? { listeners: peak.total, at: peak._id } : null,
        movers: withGrowth,
      },
      { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' } }
    );
  } catch (err) {
    console.error('[audience-insights GET]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
