import { NextRequest, NextResponse } from 'next/server';
import { insertPlay, closePlay } from '@/lib/analytics';
import { ensureIndexes } from '@/lib/mongodb';
import type { Station } from '@/types/Station';
import type { TrackInfo } from '@/lib/analytics';

let indexesEnsured = false;

async function ensureOnce() {
  if (!indexesEnsured) {
    await ensureIndexes();
    indexesEnsured = true;
  }
}

/** POST /api/analytics/play-event
 *  Body: { station: Station, track: TrackInfo }
 *  Returns: { playId: string }
 */
export async function POST(req: NextRequest) {
  try {
    await ensureOnce();
    const body = await req.json() as { station: Station; track: TrackInfo };
    const { station, track } = body;

    if (!station?.id || !track?.title) {
      return NextResponse.json({ error: 'Missing station.id or track.title' }, { status: 400 });
    }

    const playId = await insertPlay(station, track);
    return NextResponse.json({ playId });
  } catch (err) {
    console.error('[play-event POST]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/** PATCH /api/analytics/play-event
 *  Body: { playId: string }
 *  Closes the play (sets endedAt, computes playDuration).
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json() as { playId: string };
    const { playId } = body;

    if (!playId) {
      return NextResponse.json({ error: 'Missing playId' }, { status: 400 });
    }

    await closePlay(playId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[play-event PATCH]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
