import { NextRequest, NextResponse } from 'next/server';
import { getSnapshotsCollection, getPlaysCollection } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

/**
 * GET /api/analytics/metadata-quality?days=7
 * Per-station metadata health: uptime, metadata source mix, and how recently
 * a song title was actually detected. Surfaces stations whose streams are up
 * but stopped reporting now-playing data.
 */
export async function GET(req: NextRequest) {
  try {
    const days = Math.min(parseInt(req.nextUrl.searchParams.get('days') ?? '7'), 30);
    const snapshots = await getSnapshotsCollection();
    const plays = await getPlaysCollection();
    const periodStart = new Date(Date.now() - days * 86_400_000);

    const stationRows = await snapshots
      .aggregate<{
        station_id: number;
        station_name: string;
        total: number;
        online: number;
        zetta: number;
        icecast: number;
        icy: number;
        none: number;
      }>([
        { $match: { snapshotAt: { $gte: periodStart } } },
        {
          $group: {
            _id: '$stationId',
            station_name: { $first: '$stationName' },
            total: { $sum: 1 },
            online: { $sum: { $cond: ['$isOnline', 1, 0] } },
            zetta: { $sum: { $cond: [{ $eq: ['$lastMetaSource', 'zetta'] }, 1, 0] } },
            icecast: { $sum: { $cond: [{ $eq: ['$lastMetaSource', 'icecast'] }, 1, 0] } },
            icy: { $sum: { $cond: [{ $eq: ['$lastMetaSource', 'icy'] }, 1, 0] } },
            none: { $sum: { $cond: [{ $eq: ['$lastMetaSource', null] }, 1, 0] } },
          },
        },
        { $project: { _id: 0, station_id: '$_id', station_name: 1, total: 1, online: 1, zetta: 1, icecast: 1, icy: 1, none: 1 } },
        { $sort: { total: -1 } },
      ])
      .toArray();

    // Latest title detection per station
    const lastTitles = await plays
      .aggregate<{ _id: number; last_title_at: Date }>([
        { $group: { _id: '$stationId', last_title_at: { $max: '$detectedAt' } } },
      ])
      .toArray();
    const lastTitleMap = new Map(lastTitles.map(r => [r._id, r.last_title_at]));

    const stations = stationRows.map(row => {
      const sourceCounts = { zetta: row.zetta, icecast: row.icecast, icy: row.icy, none: row.none };
      const primary = (Object.entries(sourceCounts) as [string, number][])
        .sort((a, b) => b[1] - a[1])[0][0];
      const lastTitleAt = lastTitleMap.get(row.station_id) ?? null;
      return {
        station_id: row.station_id,
        station_name: row.station_name,
        uptime_pct: row.total > 0 ? Math.round((row.online / row.total) * 1000) / 10 : 0,
        metadata_rate_pct:
          row.total > 0 ? Math.round(((row.total - row.none) / row.total) * 1000) / 10 : 0,
        primary_source: primary === 'none' ? null : primary,
        sources: sourceCounts,
        last_title_at: lastTitleAt,
        // Online but no title detected in 24h → metadata pipeline is stale
        stale:
          row.online > 0 &&
          (!lastTitleAt || Date.now() - new Date(lastTitleAt).getTime() > 86_400_000),
      };
    });

    return NextResponse.json(
      { days, stations },
      { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' } }
    );
  } catch (err) {
    console.error('[metadata-quality GET]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
