import { NextRequest, NextResponse } from 'next/server';
import { getTrending } from '@/lib/analytics';

/**
 * GET /api/analytics/trending?hours=24&limit=10
 * Returns top songs by play count across all stations in the last N hours.
 */
export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const hours  = Math.min(parseInt(params.get('hours')  ?? '24'), 168);
    const limit  = Math.min(parseInt(params.get('limit')  ?? '10'), 50);

    const trending = await getTrending(hours, limit);

    return NextResponse.json({ hours, limit, results: trending }, {
      headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' },
    });
  } catch (err) {
    console.error('[trending GET]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
