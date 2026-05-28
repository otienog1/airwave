import { NextRequest, NextResponse } from 'next/server';
import { getStationHistory } from '@/lib/analytics';

/**
 * GET /api/analytics/station/[id]?limit=50
 * Returns the most recent plays for a station, newest first.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const stationId = parseInt(params.id);
    if (isNaN(stationId)) {
      return NextResponse.json({ error: 'Invalid station id' }, { status: 400 });
    }

    const limit = Math.min(
      parseInt(req.nextUrl.searchParams.get('limit') ?? '50'),
      200
    );

    const history = await getStationHistory(stationId, limit);

    return NextResponse.json({ stationId, history }, {
      headers: { 'Cache-Control': 's-maxage=15, stale-while-revalidate=30' },
    });
  } catch (err) {
    console.error('[station history GET]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
