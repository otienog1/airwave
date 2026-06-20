import { NextResponse } from 'next/server';
import { getListenerSessionsCollection, getPlaysCollection } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

/**
 * GET /api/analytics/live-pulse
 * Real-time in-app listening snapshot built from active heartbeat sessions
 * (listenerSessions has a 45s TTL, so every doc here is a live listener)
 * joined with each station's current song from the plays collection.
 */
export async function GET() {
  try {
    const sessions = await getListenerSessionsCollection();
    const plays = await getPlaysCollection();
    const now = Date.now();

    const active = await sessions
      .find({})
      .sort({ startedAt: -1 })
      .limit(500)
      .toArray();

    // Group active sessions per station
    const byStation = new Map<number, { stationName: string; count: number }>();
    let totalSessionAgeMs = 0;
    for (const s of active) {
      const entry = byStation.get(s.stationId) ?? { stationName: s.stationName, count: 0 };
      entry.count += 1;
      byStation.set(s.stationId, entry);
      totalSessionAgeMs += now - new Date(s.startedAt).getTime();
    }

    // Current song per active station (latest open play, fall back to latest play)
    const stationIds = Array.from(byStation.keys());
    const currentSongs = new Map<number, string>();
    if (stationIds.length > 0) {
      const latest = await plays
        .aggregate<{ _id: number; title: string }>([
          { $match: { stationId: { $in: stationIds } } },
          { $sort: { detectedAt: -1 } },
          { $group: { _id: '$stationId', title: { $first: '$title' } } },
        ])
        .toArray();
      for (const row of latest) currentSongs.set(row._id, row.title);
    }

    const stations = stationIds
      .map(id => ({
        station_id: id,
        station_name: byStation.get(id)!.stationName,
        listeners: byStation.get(id)!.count,
        now_playing: currentSongs.get(id) ?? null,
      }))
      .sort((a, b) => b.listeners - a.listeners);

    const oneHourAgo = new Date(now - 60 * 60 * 1000);
    const startedLastHour = active.filter(s => new Date(s.startedAt) > oneHourAgo).length;

    // Join feed: newest sessions first
    const feed = active.slice(0, 12).map(s => ({
      station_name: s.stationName,
      started_at: s.startedAt,
    }));

    return NextResponse.json({
      total_listeners: active.length,
      stations_active: stations.length,
      started_last_hour: startedLastHour,
      avg_session_minutes: active.length > 0
        ? Math.round(totalSessionAgeMs / active.length / 60_000)
        : 0,
      stations,
      feed,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[live-pulse GET]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
