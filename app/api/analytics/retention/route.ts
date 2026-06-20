import { NextRequest, NextResponse } from 'next/server';
import { getListenerVisitsCollection } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

/**
 * GET /api/analytics/retention?weeks=8
 *
 * Weekly retention cohorts from the listenerVisits collection.
 * Each cohort is the set of devices whose first visit fell in that
 * calendar week (Mon–Sun UTC). For each subsequent week we count
 * how many of those devices returned.
 *
 * Returns:
 * {
 *   weeks: 8,
 *   cohorts: [
 *     {
 *       week: "2026-06-02",      // Monday that starts the cohort week
 *       size: 120,               // devices whose first-ever visit was this week
 *       retention: [             // one entry per subsequent week (index 0 = cohort week itself)
 *         { week: "2026-06-02", returned: 120, pct: 100 },
 *         { week: "2026-06-09", returned: 67,  pct: 55.8 },
 *         ...
 *       ]
 *     },
 *     ...
 *   ]
 * }
 */
export async function GET(req: NextRequest) {
  try {
    const weeks = Math.min(parseInt(req.nextUrl.searchParams.get('weeks') ?? '8'), 16);
    const visits = await getListenerVisitsCollection();

    const now = new Date();
    // Start of the current ISO week (Monday)
    const todayDay = now.getUTCDay(); // 0=Sun … 6=Sat
    const daysToMon = (todayDay === 0 ? -6 : 1 - todayDay);
    const thisWeekStart = new Date(Date.UTC(
      now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysToMon
    ));

    // We look back `weeks` weeks from the start of the current week
    const windowStart = new Date(thisWeekStart.getTime() - (weeks - 1) * 7 * 86_400_000);

    // All visits in the window (and up through now for return visits)
    const allVisits = await visits
      .find(
        { date: { $gte: windowStart } },
        { projection: { deviceId: 1, day: 1, firstSeenAt: 1, _id: 0 } }
      )
      .toArray();

    // Map deviceId → ISO week of first-ever visit (within our window)
    const firstVisitWeek = new Map<string, string>();
    for (const v of allVisits) {
      const vDate = new Date(v.day + 'T00:00:00Z');
      const weekKey = isoWeekMonday(vDate);
      if (!firstVisitWeek.has(v.deviceId)) {
        firstVisitWeek.set(v.deviceId, weekKey);
      } else {
        // Keep the earliest
        const existing = firstVisitWeek.get(v.deviceId)!;
        if (weekKey < existing) firstVisitWeek.set(v.deviceId, weekKey);
      }
    }

    // For each device, build a set of all weeks they visited
    const deviceWeeks = new Map<string, Set<string>>();
    for (const v of allVisits) {
      const vDate = new Date(v.day + 'T00:00:00Z');
      const weekKey = isoWeekMonday(vDate);
      if (!deviceWeeks.has(v.deviceId)) deviceWeeks.set(v.deviceId, new Set());
      deviceWeeks.get(v.deviceId)!.add(weekKey);
    }

    // Build week list
    const weekKeys: string[] = [];
    for (let i = 0; i < weeks; i++) {
      const d = new Date(windowStart.getTime() + i * 7 * 86_400_000);
      weekKeys.push(isoWeekMonday(d));
    }

    // Build cohorts — one per week in the window
    const cohorts = weekKeys.map(cohortWeek => {
      // Devices whose first visit was in this cohort week
      const cohortDevices = Array.from(firstVisitWeek.entries())
        .filter(([, fw]) => fw === cohortWeek)
        .map(([did]) => did);

      const size = cohortDevices.length;

      // For each subsequent week, count how many returned
      const retention = weekKeys
        .filter(w => w >= cohortWeek) // only from cohort week onward
        .map(returnWeek => {
          const returned = cohortDevices.filter(did =>
            deviceWeeks.get(did)?.has(returnWeek) ?? false
          ).length;
          return {
            week: returnWeek,
            returned,
            pct: size > 0 ? Math.round((returned / size) * 1000) / 10 : 0,
          };
        });

      return { week: cohortWeek, size, retention };
    });

    return NextResponse.json(
      { weeks, cohorts },
      { headers: { 'Cache-Control': 's-maxage=1800, stale-while-revalidate=3600' } }
    );
  } catch (err) {
    console.error('[retention GET]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/** Returns the ISO "YYYY-MM-DD" of the Monday of the week containing `date`. */
function isoWeekMonday(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}
