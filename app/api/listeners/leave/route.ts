import { NextRequest, NextResponse } from 'next/server';
import { getListenerSessionsCollection } from '@/lib/mongodb';

export async function POST(req: NextRequest) {
  let sessionId: string | undefined;
  try {
    const body = await req.json() as { sessionId?: string };
    sessionId = body.sessionId;
  } catch {
    // sendBeacon can deliver an empty body on page unload — nothing to clean up
    return NextResponse.json({ ok: true });
  }

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
  }

  try {
    const sessions = await getListenerSessionsCollection();
    await sessions.deleteOne({ sessionId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[listeners/leave]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
