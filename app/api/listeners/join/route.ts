import { NextRequest, NextResponse } from 'next/server';
import { getListenerSessionsCollection } from '@/lib/mongodb';

export async function POST(req: NextRequest) {
  try {
    const { sessionId, stationId, stationName } = await req.json() as {
      sessionId: string;
      stationId: number;
      stationName: string;
    };

    if (!sessionId || !stationId) {
      return NextResponse.json({ error: 'Missing sessionId or stationId' }, { status: 400 });
    }

    const sessions = await getListenerSessionsCollection();
    const now = new Date();

    await sessions.updateOne(
      { sessionId },
      {
        $set: { stationId, stationName, lastHeartbeat: now, endedAt: null },
        $setOnInsert: { startedAt: now },
      },
      { upsert: true }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[listeners/join]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
