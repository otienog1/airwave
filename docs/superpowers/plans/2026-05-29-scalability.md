# Scalability — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Three targeted scalability improvements: backend `Cache-Control` on the stations list endpoint, a `stale-while-revalidate` cache in `useStations` to avoid redundant fetches on remount, and the fix for the pre-existing `WritingMode` TypeScript error in `Equalizer.tsx`.

**Architecture:** No new dependencies. Backend adds response headers. Frontend adds a module-level in-memory cache (TTL 60s) inside `useStations`. TypeScript error fixed inline.

**Tech Stack:** Flask (existing), Next.js 14, TypeScript.

---

## Task 1: Fix pre-existing TypeScript error in `Equalizer.tsx`

**Files:**
- Modify: `components/Equalizer.tsx`

The `WritingMode` CSS type does not include `'bt-lr'`. This error appears on every `tsc --noEmit` run and masks real errors. Fix it with a type assertion.

- [ ] **Step 1: Read `components/Equalizer.tsx` around line 86**

Find the line that reads something like:
```tsx
writingMode: 'bt-lr',
```

- [ ] **Step 2: Add type assertion**

```tsx
writingMode: 'bt-lr' as React.CSSProperties['writingMode'],
```

- [ ] **Step 3: TypeScript check**

Run: `npx tsc --noEmit 2>&1`
Expected: **zero errors**.

- [ ] **Step 4: Commit**

```powershell
git add components/Equalizer.tsx
git commit -m @'
fix: resolve WritingMode TypeScript error in Equalizer.tsx

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
'@
```

---

## Task 2: Add `Cache-Control` header to Flask stations endpoint

**Files:**
- Modify: `backend/app/stations_bp.py`

The stations list endpoint is queried by every client on page load. Adding a `Cache-Control` header allows CDNs and reverse proxies (nginx, Vercel Edge) to cache the response and reduces backend load.

- [ ] **Step 1: Read `backend/app/stations_bp.py` — find the GET /stations route**

Look for the route decorated with `@stations_bp.route('/', methods=['GET'])` or similar.

- [ ] **Step 2: Add `Cache-Control` header to the stations list response**

After the existing `return jsonify({...})`, wrap it in a `make_response`:

```python
from flask import make_response

# In the GET /stations handler, replace:
return jsonify({'stations': stations_data, 'pagination': {...}})

# With:
response = make_response(jsonify({'stations': stations_data, 'pagination': {...}}))
response.headers['Cache-Control'] = 'public, max-age=30, stale-while-revalidate=60'
return response
```

This caches the stations list for 30 seconds at proxies/CDN, with a 60-second stale window.

- [ ] **Step 3: Verify the import for `make_response` is at the top of the file**

If `make_response` is not already imported, add it:
```python
from flask import make_response
```

- [ ] **Step 4: Commit**

```powershell
cd backend
git add app/stations_bp.py
git commit -m @'
perf: add Cache-Control header to stations list endpoint (30s/60s SWR)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
'@
```

---

## Task 3: Add in-memory SWR cache to `useStations`

**Files:**
- Modify: `hooks/useStations.ts`

Every time `MordernAirwave` mounts (e.g. hot reload, StrictMode double-mount), it calls `apiService.getStations()`. A simple module-level cache (TTL 60s) prevents redundant fetches within the same browser session.

- [ ] **Step 1: Add the cache above the hook**

At the top of `hooks/useStations.ts`, before the hook definition:

```ts
// Module-level cache — shared across all hook instances, cleared on TTL expiry
const CACHE_TTL_MS = 60_000;
let cachedStations: Station[] | null = null;
let cacheExpiresAt = 0;
```

- [ ] **Step 2: Use the cache inside `fetchStations`**

In `fetchStations`, check the cache before fetching:

```ts
const fetchStations = useCallback(async (page = 1) => {
  // Serve from cache on first page if still fresh
  if (page === 1 && cachedStations && Date.now() < cacheExpiresAt) {
    setStations(cachedStations);
    setLoading(false);
    return;
  }

  setLoading(true);
  setError(null);

  const response = await apiService.getStations({
    genre, region, search,
    page,
    include_stats: true,
  });

  if (response.error) {
    setError(response.error);
  } else if (response.data) {
    setStations(response.data.stations);
    setPagination(response.data.pagination);
    // Update cache only for page 1 with no filters
    if (page === 1 && !genre && !region && !search) {
      cachedStations = response.data.stations;
      cacheExpiresAt = Date.now() + CACHE_TTL_MS;
    }
  }

  setLoading(false);
}, [genre, region, search]);
```

- [ ] **Step 3: TypeScript check**

Run: `npx tsc --noEmit 2>&1`
Expected: zero errors.

- [ ] **Step 4: Commit**

```powershell
git add hooks/useStations.ts
git commit -m @'
perf: add 60s in-memory SWR cache to useStations to avoid redundant fetches

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
'@
```
