import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

interface FlaskHealthResponse {
  status: string;
  service: string;
  checks: Record<string, string>;
}

export async function GET() {
  const checks: Record<string, string> = {};

  // Check MongoDB connectivity
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    checks['mongodb'] = 'ok';
  } catch (e) {
    checks['mongodb'] = `error: ${e instanceof Error ? e.message : String(e)}`;
  }

  // Check Flask backend
  let backendStatus = 'unknown';
  let backendChecks: Record<string, string> = {};
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'}/api/health`,
      { signal: AbortSignal.timeout(3000) }
    );
    const data = (await res.json()) as FlaskHealthResponse;
    backendStatus = data.status;
    backendChecks = data.checks ?? {};
  } catch (e) {
    backendStatus = 'unreachable';
    backendChecks['backend'] = `error: ${e instanceof Error ? e.message : String(e)}`;
  }

  const allChecks: Record<string, string> = {
    ...checks,
    backend: backendStatus,
    ...Object.fromEntries(
      Object.entries(backendChecks).map(([k, v]) => [`backend.${k}`, v])
    ),
  };

  const overall =
    Object.values(allChecks).every(v => v === 'ok' || v === 'healthy')
      ? 'healthy'
      : 'degraded';

  return NextResponse.json(
    { status: overall, service: 'airwave-frontend', checks: allChecks },
    {
      status: overall === 'healthy' ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    }
  );
}
