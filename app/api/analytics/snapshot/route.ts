import { NextRequest, NextResponse } from 'next/server';
import { insertSnapshot } from '@/lib/analytics';
import type { Station } from '@/types/Station';

/**
 * POST /api/analytics/snapshot
 * Body: { station: Station, isOnline: boolean, lastMetaSource: string | null, listeners: number | null }
 * Fire-and-forget health snapshot written on every metadata poll.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      station: Station;
      isOnline: boolean;
      lastMetaSource: 'zetta' | 'icecast' | 'icy' | null;
      listeners: number | null;
    };
    const { station, isOnline, lastMetaSource, listeners } = body;

    if (!station?.id) {
      return NextResponse.json({ error: 'Missing station.id' }, { status: 400 });
    }

    await insertSnapshot(station, isOnline, lastMetaSource, listeners);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[snapshot POST]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
