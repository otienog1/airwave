import { NextRequest, NextResponse } from 'next/server';
import { getListenerSessionsCollection, getListenerVisitsCollection, ensureIndexes } from '@/lib/mongodb';

let indexed = false;

export async function POST(req: NextRequest) {
  try {
    const { sessionId, deviceId, stationId, stationName } = await req.json() as {
      sessionId: string;
      deviceId?: string;
      stationId: number;
      stationName: string;
    };

    if (!sessionId || !stationId) {
      return NextResponse.json({ error: 'Missing sessionId or stationId' }, { status: 400 });
    }

    // Ensure indexes on first request — cheap no-op after first run
    if (!indexed) { await ensureIndexes(); indexed = true; }

    const now = new Date();
    const sessions = await getListenerSessionsCollection();

    await sessions.updateOne(
      { sessionId },
      {
        $set: { stationId, stationName, lastHeartbeat: now, endedAt: null },
        $setOnInsert: { startedAt: now },
      },
      { upsert: true }
    );

    // Write a durable visit for retention cohorts — one doc per device per UTC
    // day, upserted so repeated joins on the same day are cheap no-ops.
    if (deviceId) {
      const day = now.toISOString().slice(0, 10); // "YYYY-MM-DD"
      const dayStart = new Date(`${day}T00:00:00Z`);
      const visits = await getListenerVisitsCollection();

      await visits.updateOne(
        { deviceId, day },
        {
          $setOnInsert: { deviceId, day, date: dayStart, firstSeenAt: now },
          $set: { lastSeenAt: now },
        },
        { upsert: true }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[listeners/join]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
