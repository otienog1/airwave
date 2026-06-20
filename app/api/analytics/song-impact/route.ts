import { NextRequest, NextResponse } from 'next/server';
import { getPlaysCollection } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

/**
 * GET /api/analytics/song-impact?days=7&limit=12
 * Listener delta while each song aired: stream listeners at the song's end
 * (snapshot nearest endedAt) minus listeners at detection (stored on the
 * play). Grouped per song — surfaces tracks that grow or lose audience.
 */
export async function GET(req: NextRequest) {
  try {
    const days = Math.min(parseInt(req.nextUrl.searchParams.get('days') ?? '7'), 30);
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '12'), 30);
    const plays = await getPlaysCollection();
    const periodStart = new Date(Date.now() - days * 86_400_000);

    const rows = await plays
      .aggregate<{
        title: string;
        artist: string | null;
        avg_delta: number;
        plays: number;
        avg_start: number;
      }>([
        {
          $match: {
            detectedAt: { $gte: periodStart },
            endedAt: { $ne: null },
            listeners: { $ne: null },
            // Plausible full songs only: 1–15 minutes on air
            playDuration: { $gte: 60, $lte: 900 },
          },
        },
        { $sort: { detectedAt: -1 } },
        { $limit: 600 },
        {
          // Stream listeners near the song's end, from the same station's snapshots
          $lookup: {
            from: 'stationSnapshots',
            let: { sid: '$stationId', ended: '$endedAt' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$stationId', '$$sid'] },
                      { $ne: ['$listeners', null] },
                      { $gte: ['$snapshotAt', { $subtract: ['$$ended', 30_000] }] },
                      { $lte: ['$snapshotAt', { $add: ['$$ended', 30_000] }] },
                    ],
                  },
                },
              },
              { $limit: 1 },
              { $project: { listeners: 1 } },
            ],
            as: 'endSnap',
          },
        },
        { $match: { 'endSnap.0': { $exists: true } } },
        {
          $project: {
            title: 1,
            artist: 1,
            delta: { $subtract: [{ $arrayElemAt: ['$endSnap.listeners', 0] }, '$listeners'] },
            start: '$listeners',
          },
        },
        {
          $group: {
            _id: '$title',
            artist: { $first: '$artist' },
            avg_delta: { $avg: '$delta' },
            plays: { $sum: 1 },
            avg_start: { $avg: '$start' },
          },
        },
        { $match: { plays: { $gte: 1 } } },
        {
          $project: {
            _id: 0,
            title: '$_id',
            artist: 1,
            avg_delta: { $round: ['$avg_delta', 1] },
            plays: 1,
            avg_start: { $round: ['$avg_start', 0] },
          },
        },
      ])
      .toArray();

    const sorted = [...rows].sort((a, b) => b.avg_delta - a.avg_delta);
    const gainers = sorted.slice(0, limit);
    const losers = sorted.slice(-limit).reverse().filter(r => r.avg_delta < 0);

    return NextResponse.json(
      { days, gainers, losers, sample_size: rows.length },
      { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' } }
    );
  } catch (err) {
    console.error('[song-impact GET]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
