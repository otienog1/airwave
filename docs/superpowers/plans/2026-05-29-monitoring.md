# Monitoring — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Four targeted monitoring improvements: deep health check on the Flask backend, a Next.js `/api/health` aggregation route, and Next.js error boundary pages (`error.tsx` and `global-error.tsx`).

**Architecture:** No new dependencies. Flask health check gains per-component status (database, MongoDB). Next.js health route proxies Flask and independently verifies MongoDB. Error boundaries give users a graceful recovery UI instead of a blank crash.

**Tech Stack:** Flask (existing), Next.js 14 App Router, TypeScript, SQLAlchemy (existing), MongoDB native driver (existing).

---

## Task 1: Deep health check on Flask backend

**Files:**
- Modify: `backend/app/__init__.py`

Currently the `/api/health` route returns `{'status': 'healthy', 'service': 'airwave-api'}` with no actual checks. We need it to verify SQLAlchemy connectivity and return per-component status.

- [ ] **Step 1: Read the health_check function in `backend/app/__init__.py` (lines 85–88)**

Find:
```python
    @app.route('/api/health')
    def health_check():
        return jsonify({'status': 'healthy', 'service': 'airwave-api'})
```

- [ ] **Step 2: Replace the health_check function**

Add `from sqlalchemy import text` at the top of `__init__.py` (after the existing imports). Then replace the health_check function with:

```python
    @app.route('/api/health')
    def health_check():
        checks = {}

        # SQLAlchemy / database check
        try:
            db.session.execute(text('SELECT 1'))
            checks['database'] = 'ok'
        except Exception as e:
            checks['database'] = f'error: {e}'

        overall = 'healthy' if all(v == 'ok' for v in checks.values()) else 'degraded'
        status_code = 200 if overall == 'healthy' else 503
        return jsonify({
            'status': overall,
            'service': 'airwave-api',
            'checks': checks,
        }), status_code
```

- [ ] **Step 3: Verify the Flask app still starts**

```powershell
cd c:\Users\7plus8\build\airwave\backend && python -c "from app import create_app; app = create_app(); print('OK')" 2>&1
```
Expected: `OK`

- [ ] **Step 4: Commit**

```powershell
cd c:\Users\7plus8\build\airwave
git add backend/app/__init__.py
git commit -m @'
feat(monitoring): deep health check on Flask backend with per-component status

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
'@
```

---

## Task 2: Next.js `/api/health` aggregation route

**Files:**
- Create: `app/api/health/route.ts`

This route calls the Flask `/api/health` endpoint and independently verifies MongoDB connectivity, then returns a merged status payload.

- [ ] **Step 1: Create `app/api/health/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { apiService } from '@/lib/api';

interface HealthCheck {
  status: 'healthy' | 'degraded';
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
  let backendChecks: Record<string, string> = {};
  let backendStatus = 'unknown';
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'}/api/health`,
      { signal: AbortSignal.timeout(3000) }
    );
    const data = (await res.json()) as HealthCheck;
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
```

- [ ] **Step 2: TypeScript check**

```powershell
cd c:\Users\7plus8\build\airwave && npx tsc --noEmit 2>&1
```
Expected: zero errors.

- [ ] **Step 3: Commit**

```powershell
git add app/api/health/route.ts
git commit -m @'
feat(monitoring): add Next.js /api/health route aggregating Flask + MongoDB status

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
'@
```

---

## Task 3: Next.js `app/error.tsx` route-segment error boundary

**Files:**
- Create: `app/error.tsx`

Next.js 14 App Router uses `error.tsx` to catch unhandled errors thrown during rendering or server actions within the route segment. It must be a Client Component.

- [ ] **Step 1: Create `app/error.tsx`**

```tsx
'use client';

import { useEffect } from 'react';

interface ErrorPageProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
    useEffect(() => {
        console.error('[app/error]', error);
    }, [error]);

    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--color-bg, #0f0f14)',
                fontFamily: 'system-ui, sans-serif',
            }}
        >
            <div
                style={{
                    textAlign: 'center',
                    maxWidth: '400px',
                    padding: '2rem',
                    borderRadius: '1rem',
                    background: 'var(--color-surface, #1a1a24)',
                    border: '1px solid rgba(99,102,241,0.2)',
                }}
            >
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📻</div>
                <h2
                    style={{
                        fontSize: '1.125rem',
                        fontWeight: 600,
                        color: 'var(--color-text-primary, #f1f5f9)',
                        marginBottom: '0.5rem',
                    }}
                >
                    Something went wrong
                </h2>
                <p
                    style={{
                        fontSize: '0.875rem',
                        color: 'var(--color-text-secondary, #94a3b8)',
                        marginBottom: '1.5rem',
                    }}
                >
                    {error.message || 'An unexpected error occurred.'}
                </p>
                <button
                    onClick={reset}
                    style={{
                        padding: '0.5rem 1.5rem',
                        borderRadius: '0.5rem',
                        background: '#6366f1',
                        color: '#fff',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                    }}
                >
                    Try again
                </button>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: TypeScript check**

```powershell
cd c:\Users\7plus8\build\airwave && npx tsc --noEmit 2>&1
```
Expected: zero errors.

- [ ] **Step 3: Commit**

```powershell
git add app/error.tsx
git commit -m @'
feat(monitoring): add Next.js app/error.tsx route-segment error boundary

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
'@
```

---

## Task 4: Next.js `app/global-error.tsx` root error boundary

**Files:**
- Create: `app/global-error.tsx`

`global-error.tsx` catches errors that escape all nested error boundaries, including errors in the root layout. It replaces the entire `<html>` tree so it must include `<html>` and `<body>` tags.

- [ ] **Step 1: Create `app/global-error.tsx`**

```tsx
'use client';

import { useEffect } from 'react';

interface GlobalErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
    useEffect(() => {
        console.error('[app/global-error]', error);
    }, [error]);

    return (
        <html lang="en">
            <body
                style={{
                    margin: 0,
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#0f0f14',
                    fontFamily: 'system-ui, sans-serif',
                }}
            >
                <div
                    style={{
                        textAlign: 'center',
                        maxWidth: '400px',
                        padding: '2rem',
                        borderRadius: '1rem',
                        background: '#1a1a24',
                        border: '1px solid rgba(99,102,241,0.2)',
                    }}
                >
                    <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📻</div>
                    <h2
                        style={{
                            fontSize: '1.125rem',
                            fontWeight: 600,
                            color: '#f1f5f9',
                            marginBottom: '0.5rem',
                        }}
                    >
                        AirWave encountered a critical error
                    </h2>
                    <p
                        style={{
                            fontSize: '0.875rem',
                            color: '#94a3b8',
                            marginBottom: '1.5rem',
                        }}
                    >
                        {error.message || 'An unexpected error occurred.'}
                    </p>
                    <button
                        onClick={reset}
                        style={{
                            padding: '0.5rem 1.5rem',
                            borderRadius: '0.5rem',
                            background: '#6366f1',
                            color: '#fff',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                        }}
                    >
                        Reload
                    </button>
                </div>
            </body>
        </html>
    );
}
```

- [ ] **Step 2: TypeScript check**

```powershell
cd c:\Users\7plus8\build\airwave && npx tsc --noEmit 2>&1
```
Expected: zero errors.

- [ ] **Step 3: Commit**

```powershell
git add app/global-error.tsx
git commit -m @'
feat(monitoring): add Next.js app/global-error.tsx root error boundary

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
'@
```
