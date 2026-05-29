import { NextRequest, NextResponse } from 'next/server';
import { getListenerSessionsCollection } from '@/lib/mongodb';

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json() as { sessionId: string };

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    const sessions = await getListenerSessionsCollection();
    await sessions.updateOne(
      { sessionId, endedAt: null },
      { $set: { lastHeartbeat: new Date() } }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[listeners/heartbeat]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
