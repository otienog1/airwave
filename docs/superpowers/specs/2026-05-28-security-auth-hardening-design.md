# Security & Auth Hardening — Design Spec
**Date:** 2026-05-28

## Overview

Migrate Airwave's authentication from `localStorage`-based JWT storage to `HttpOnly` cookie-based token delivery, add silent refresh with token rotation, expose a logout endpoint that clears cookies server-side, lock down CORS to a specific frontend origin, and add sliding-window rate limiting to Next.js API routes.

**Deployment context:** Cross-domain — backend and frontend on separate domains. HTTPS required in all non-dev environments. Cookies use `SameSite=None; Secure`.

---

## Architecture

### Token flow (after migration)

```
Login / Register
  → Flask sets HttpOnly cookies (access 24h, refresh 30d)
  → JSON body returns only { user }

Authenticated request
  → Browser sends cookies automatically (credentials: 'include')
  → flask_jwt_extended reads access_token cookie
  → 200 OK

Access token expired (401)
  → fetchWithRefresh calls POST /api/auth/refresh
  → Flask reads refresh_token cookie, issues new access + refresh cookies (rotation)
  → Original request retried once
  → 200 OK

Refresh token expired (401 on /refresh)
  → window.dispatchEvent('auth:expired')
  → AuthContext sets user = null
  → User sees login modal

Logout
  → POST /api/auth/logout
  → Flask calls unset_jwt_cookies (clears both cookies)
  → AuthContext sets user = null
```

---

## Backend Changes (`backend/`)

### `backend/app/__init__.py`

Add JWT cookie config immediately after existing JWT config:

```python
app.config['JWT_TOKEN_LOCATION']      = ['cookies']
app.config['JWT_ACCESS_COOKIE_NAME']  = 'access_token'
app.config['JWT_REFRESH_COOKIE_NAME'] = 'refresh_token'
app.config['JWT_COOKIE_SECURE']       = True
app.config['JWT_COOKIE_SAMESITE']     = 'None'
app.config['JWT_COOKIE_CSRF_PROTECT'] = False
app.config['JWT_REFRESH_COOKIE_PATH'] = '/api/auth/refresh'  # restrict refresh cookie to refresh endpoint only
```

Replace `CORS(app)` with:

```python
CORS(app,
    origins=[os.environ.get('FRONTEND_URL', 'http://localhost:3000')],
    supports_credentials=True,
    allow_headers=['Content-Type'],
)
```

New environment variable: `FRONTEND_URL` (e.g. `https://airwave.com`). No default wildcard.

### `backend/app/auth_bp.py`

**Imports to add:**
```python
from flask import make_response
from flask_jwt_extended import set_access_cookies, set_refresh_cookies, unset_jwt_cookies
```

**Login endpoint** — replace JSON token response with cookie response:
```python
# Remove from response body:
#   'access_token': access_token,
#   'refresh_token': refresh_token,

response = make_response(jsonify({
    'message': 'Login successful',
    'user': user.to_dict(),
}))
set_access_cookies(response, access_token)
set_refresh_cookies(response, refresh_token)
return response
```

**Register endpoint** — same change as login:
```python
response = make_response(jsonify({
    'message': 'User registered successfully',
    'user': user.to_dict(),
}))
set_access_cookies(response, access_token)
set_refresh_cookies(response, refresh_token)
return response, 201
```

**New `POST /api/auth/refresh` endpoint:**
```python
@auth_bp.route('/refresh', methods=['POST'])
@limiter.limit("30 per hour")
@jwt_required(refresh=True)
def refresh():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or not user.is_active:
        return jsonify({'error': 'Unauthorized'}), 401
    new_access, new_refresh = user.generate_tokens()
    response = make_response(jsonify({'ok': True}))
    set_access_cookies(response, new_access)
    set_refresh_cookies(response, new_refresh)
    return response
```

**New `POST /api/auth/logout` endpoint:**
```python
@auth_bp.route('/logout', methods=['POST'])
def logout():
    response = make_response(jsonify({'ok': True}))
    unset_jwt_cookies(response)
    return response
```

All existing `@jwt_required()` routes (`/profile`, stations, favorites, admin) continue working unchanged — `flask_jwt_extended` now reads from the cookie automatically.

---

## Frontend Changes (`lib/`, `context/`)

### `lib/api.ts`

**Remove entirely:**
- All `localStorage.getItem('access_token')` calls
- All `localStorage.setItem('access_token', ...)` calls
- All `localStorage.removeItem('access_token')` calls
- All `Authorization: Bearer ${token}` header construction

**Add `fetchWithRefresh` utility** (top of file, used by all API methods):
```ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

async function fetchWithRefresh(
  input: RequestInfo,
  init?: RequestInit
): Promise<Response> {
  const res = await fetch(input, { ...init, credentials: 'include' });

  if (res.status !== 401) return res;

  // Attempt silent token refresh
  const refreshRes = await fetch(`${API_BASE}/api/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!refreshRes.ok) {
    window.dispatchEvent(new Event('auth:expired'));
    return res; // return original 401 to caller
  }

  // Retry original request once with new access cookie
  return fetch(input, { ...init, credentials: 'include' });
}
```

**All API methods** replace bare `fetch(...)` with `fetchWithRefresh(...)` and remove token headers. Example:
```ts
// Before
async getStations() {
  const token = localStorage.getItem('access_token');
  const res = await fetch(`${API_BASE}/api/stations`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  ...
}

// After
async getStations() {
  const res = await fetchWithRefresh(`${API_BASE}/api/stations`);
  ...
}
```

**Logout method** calls the backend endpoint before clearing local state:
```ts
async logout() {
  await fetchWithRefresh(`${API_BASE}/api/auth/logout`, { method: 'POST' });
}
```

### `context/AuthContext.tsx`

**Remove entirely:**
- All `localStorage.getItem/setItem/removeItem` calls for tokens
- Token parameter from `login()` / `register()` return handling

**`checkAuth` on mount** — probe the profile endpoint; cookie is sent automatically:
```ts
async function checkAuth() {
  setLoading(true);
  try {
    const data = await apiService.getProfile();
    setUser(data.user);
  } catch {
    setUser(null); // 401 = not authenticated
  } finally {
    setLoading(false);
  }
}

useEffect(() => { checkAuth(); }, []);
```

**Listen for token expiry event** from the fetch layer:
```ts
useEffect(() => {
  const handler = () => setUser(null);
  window.addEventListener('auth:expired', handler);
  return () => window.removeEventListener('auth:expired', handler);
}, []);
```

**Logout:**
```ts
async function logout() {
  await apiService.logout(); // clears cookies server-side
  setUser(null);
}
```

---

## Next.js Rate Limiting (`middleware.ts`)

New file at the project root (`middleware.ts`). Sliding-window limiter keyed by `IP:pathname`. In-memory store — suitable for single-instance deployment. To support multiple instances, replace the `hits` Map with an Upstash Redis store (no other changes needed).

```ts
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
```

### Rate limits

| Route | Max | Window | Reasoning |
|-------|-----|--------|-----------|
| `/api/stream-metadata` | 20 | 60s | Normal poll = 4/min; 20 covers retries and bursts |
| `/api/analytics/play-event` | 30 | 60s | Fire-and-forget; covers reconnect storms |
| `/api/analytics/trending` | 10 | 60s | Response cached 60s; 10 is generous |
| `/api/analytics/snapshot` | 30 | 60s | Mirrors play-event cadence |

---

## Files to Create

- `middleware.ts` (project root)

## Files to Modify

- `backend/app/__init__.py` — JWT cookie config, CORS lockdown
- `backend/app/auth_bp.py` — cookie responses, `/refresh`, `/logout` endpoints
- `lib/api.ts` — `fetchWithRefresh`, remove token logic
- `context/AuthContext.tsx` — remove localStorage, add `auth:expired` listener

## Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `FRONTEND_URL` | Backend | Allowed CORS origin (e.g. `https://airwave.com`) |
| `NEXT_PUBLIC_API_URL` | Frontend | Already exists; used in `fetchWithRefresh` |

---

## Edge Cases

- **Local dev without HTTPS:** `JWT_COOKIE_SECURE` should be `False` in development. Gate on `FLASK_ENV=development` or `app.config['DEBUG']`. Cookies still work over `http://localhost`. `SameSite=None` requires `Secure=True` in production browsers, but `localhost` is exempt.
- **Concurrent 401s:** If two requests fail simultaneously, both trigger refresh. The second refresh call will succeed too (refresh token has a 30d window) — both get new cookies. No race condition because cookies are overwritten idempotently.
- **`auth:expired` in SSR:** `window` is not available in server components. `fetchWithRefresh` is only called from client-side code (`lib/api.ts` is a client module), so this is safe.
- **Existing sessions on deploy:** Users with tokens in `localStorage` will get a 401 on their next request (no cookie sent), which triggers `auth:expired`, logging them out cleanly. No migration needed.
