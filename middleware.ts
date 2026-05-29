import { NextRequest, NextResponse } from 'next/server';

const hits = new Map<string, number[]>();

const LIMITS: Record<string, { windowMs: number; max: number }> = {
  '/api/stream-metadata':      { windowMs: 60_000, max: 20 },
  '/api/analytics/play-event': { windowMs: 60_000, max: 30 },
  '/api/analytics/trending':   { windowMs: 60_000, max: 10 },
  '/api/analytics/snapshot':   { windowMs: 60_000, max: 30 },
};

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const entry = Object.entries(LIMITS).find(([p]) => pathname.startsWith(p));
  if (!entry) return NextResponse.next();

  const [, limit] = entry;
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  const key = `${ip}:${pathname}`;
  const now = Date.now();

  const timestamps = (hits.get(key) ?? []).filter(t => now - t < limit.windowMs);
  timestamps.push(now);
  hits.set(key, timestamps);

  if (timestamps.length > limit.max) {
    return NextResponse.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(limit.windowMs / 1000)),
          'X-RateLimit-Limit': String(limit.max),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/stream-metadata', '/api/analytics/:path*'],
};
