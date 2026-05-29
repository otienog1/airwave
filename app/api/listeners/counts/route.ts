import { NextResponse } from 'next/server';
import { getListenerSessionsCollection } from '@/lib/mongodb';

export async function GET() {
  try {
    const sessions = await getListenerSessionsCollection();

    const agg = await sessions.aggregate<{ _id: number; count: number }>([
      { $match: { endedAt: null } },
      { $group: { _id: '$stationId', count: { $sum: 1 } } },
    ]).toArray();

    const counts: Record<number, number> = {};
    for (const row of agg) {
      counts[row._id] = row.count;
    }

    return NextResponse.json({ counts }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    console.error('[listeners/counts]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
