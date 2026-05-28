# Security & Auth Hardening — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate from localStorage JWT tokens to HttpOnly cookies, add silent refresh with token rotation, add `/refresh` and `/logout` endpoints, lock down CORS to a specific origin, and add sliding-window rate limiting to Next.js API routes.

**Architecture:** Flask backend sets access and refresh tokens as HttpOnly cookies on login/register/refresh using `flask_jwt_extended`'s built-in cookie support. Next.js frontend strips all token-handling code and uses a `fetchWithRefresh` wrapper that transparently retries on 401 by calling the refresh endpoint. A Next.js `middleware.ts` enforces per-IP sliding-window rate limits on public API routes before they reach handlers.

**Tech Stack:** Flask, flask-jwt-extended (cookie mode), flask-cors, flask-limiter (backend); Next.js 14 App Router, TypeScript (frontend); pytest, pytest-flask (backend tests)

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `backend/app/__init__.py` | Modify | JWT cookie config, CORS lockdown |
| `backend/app/auth_bp.py` | Modify | Cookie responses, `/refresh`, `/logout` endpoints |
| `backend/tests/__init__.py` | Create | Makes tests/ a package |
| `backend/tests/conftest.py` | Create | Flask test client fixtures |
| `backend/tests/test_auth.py` | Create | Auth endpoint tests |
| `lib/api.ts` | Modify | `fetchWithRefresh`, remove token logic |
| `context/AuthContext.tsx` | Modify | Remove localStorage, add `auth:expired` listener |
| `middleware.ts` | Create | Next.js sliding-window rate limiter |

---

## Task 1: Backend test infrastructure

**Files:**
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/conftest.py`
- Modify: `backend/Pipfile`

- [ ] **Step 1: Add pytest and pytest-flask to Pipfile dev-packages**

Edit `backend/Pipfile`. The `[dev-packages]` section is currently empty. Replace it:

```toml
[dev-packages]
pytest = "*"
pytest-flask = "*"
```

- [ ] **Step 2: Install dev dependencies**

Run from `backend/`:
```bash
pipenv install --dev
```

Expected: pytest and pytest-flask install successfully.

- [ ] **Step 3: Create the tests package**

Create `backend/tests/__init__.py` — empty file:
```python
```

- [ ] **Step 4: Create conftest.py with Flask test client fixtures**

Create `backend/tests/conftest.py`:

```python
import pytest
from app import create_app, db as _db
from app.models.user import User


@pytest.fixture(scope='function')
def app():
    application = create_app()
    application.config.update({
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
        'JWT_COOKIE_SECURE': False,      # allow http in tests
        'RATELIMIT_ENABLED': False,       # disable rate limiting in tests
    })
    with application.app_context():
        _db.create_all()
        yield application
        _db.drop_all()


@pytest.fixture(scope='function')
def client(app):
    return app.test_client()


@pytest.fixture(scope='function')
def test_user(app):
    # `app` fixture already provides an app context — no need to push another
    user = User(email='test@example.com', username='testuser')
    user.set_password('TestPass123')
    _db.session.add(user)
    _db.session.commit()
    return {'email': 'test@example.com', 'password': 'TestPass123'}
```

- [ ] **Step 5: Verify pytest discovers the fixtures**

Run from `backend/`:
```bash
pipenv run pytest --collect-only
```

Expected output: `no tests ran` (no test files yet) — no errors about imports or fixtures.

- [ ] **Step 6: Commit**

```bash
git add backend/Pipfile backend/Pipfile.lock backend/tests/
git commit -m "test: add pytest infrastructure for backend auth tests"
```

---

## Task 2: JWT cookie config & CORS lockdown (`backend/app/__init__.py`)

**Files:**
- Modify: `backend/app/__init__.py`
- Modify: `backend/tests/test_auth.py` (create with CORS tests)

- [ ] **Step 1: Write failing CORS tests**

Create `backend/tests/test_auth.py`:

```python
def test_cors_allows_configured_frontend(client, app):
    """Preflight from the configured frontend origin is allowed."""
    frontend = app.config.get('FRONTEND_URL', 'http://localhost:3000')
    response = client.options(
        '/api/auth/login',
        headers={
            'Origin': frontend,
            'Access-Control-Request-Method': 'POST',
        },
    )
    assert response.headers.get('Access-Control-Allow-Origin') == frontend
    assert response.headers.get('Access-Control-Allow-Credentials') == 'true'


def test_cors_blocks_unknown_origin(client):
    """Preflight from an unknown origin must not be reflected back."""
    response = client.options(
        '/api/auth/login',
        headers={
            'Origin': 'https://evil.example.com',
            'Access-Control-Request-Method': 'POST',
        },
    )
    allow_origin = response.headers.get('Access-Control-Allow-Origin', '')
    assert allow_origin != 'https://evil.example.com'
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && pipenv run pytest tests/test_auth.py -v
```

Expected: `FAILED` — `assert None == 'http://localhost:3000'` (CORS not yet locked down).

- [ ] **Step 3: Add JWT cookie config and lock down CORS in `__init__.py`**

In `backend/app/__init__.py`, replace:
```python
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)
```

with:
```python
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)

# Cookie-based token delivery
app.config['JWT_TOKEN_LOCATION']      = ['cookies']
app.config['JWT_ACCESS_COOKIE_NAME']  = 'access_token'
app.config['JWT_REFRESH_COOKIE_NAME'] = 'refresh_token'
app.config['JWT_COOKIE_SECURE']       = os.environ.get('FLASK_ENV') != 'development'
app.config['JWT_COOKIE_SAMESITE']     = 'None'
app.config['JWT_COOKIE_CSRF_PROTECT'] = False
app.config['JWT_REFRESH_COOKIE_PATH'] = '/api/auth/refresh'
```

Then replace `CORS(app)` with:
```python
CORS(app,
     origins=[os.environ.get('FRONTEND_URL', 'http://localhost:3000')],
     supports_credentials=True,
     allow_headers=['Content-Type'],
     )
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && pipenv run pytest tests/test_auth.py -v
```

Expected: `PASSED` for both CORS tests.

- [ ] **Step 5: Commit**

```bash
git add backend/app/__init__.py backend/tests/test_auth.py
git commit -m "feat: add JWT cookie config and lock CORS to FRONTEND_URL"
```

---

## Task 3: Login & Register → cookie responses

**Files:**
- Modify: `backend/app/auth_bp.py`
- Modify: `backend/tests/test_auth.py`

- [ ] **Step 1: Write failing cookie tests**

Add to `backend/tests/test_auth.py`:

```python
def test_login_sets_access_cookie_not_body(client, test_user):
    """Login must set HttpOnly cookie; tokens must NOT appear in response body."""
    response = client.post('/api/auth/login', json={
        'email': test_user['email'],
        'password': test_user['password'],
    })
    assert response.status_code == 200
    body = response.get_json()
    assert 'access_token' not in body
    assert 'refresh_token' not in body
    cookie_names = [c.name for c in client.cookie_jar]
    assert 'access_token' in cookie_names


def test_login_returns_user_in_body(client, test_user):
    """Login body contains user object after cookie migration."""
    response = client.post('/api/auth/login', json={
        'email': test_user['email'],
        'password': test_user['password'],
    })
    body = response.get_json()
    assert 'user' in body
    assert body['user']['email'] == test_user['email']


def test_register_sets_cookies_not_body(client):
    """Register must set HttpOnly cookie; tokens must NOT appear in response body."""
    response = client.post('/api/auth/register', json={
        'email': 'new@example.com',
        'username': 'newuser',
        'password': 'NewPass123',
    })
    assert response.status_code == 201
    body = response.get_json()
    assert 'access_token' not in body
    assert 'refresh_token' not in body
    cookie_names = [c.name for c in client.cookie_jar]
    assert 'access_token' in cookie_names


def test_profile_accessible_with_cookie(client, test_user):
    """Profile endpoint works when access cookie is present."""
    client.post('/api/auth/login', json={
        'email': test_user['email'],
        'password': test_user['password'],
    })
    response = client.get('/api/auth/profile')
    assert response.status_code == 200
    assert 'user' in response.get_json()


def test_profile_rejects_without_cookie(client):
    """Profile endpoint returns 401 when no cookie is present."""
    response = client.get('/api/auth/profile')
    assert response.status_code == 401
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && pipenv run pytest tests/test_auth.py -v
```

Expected: `FAILED` — `assert 'access_token' not in body` fails (tokens still in body).

- [ ] **Step 3: Update imports in `auth_bp.py`**

Replace the import block at the top of `backend/app/auth_bp.py`:

```python
from flask import Blueprint, request, jsonify, make_response
from flask_jwt_extended import (
    jwt_required, get_jwt_identity, create_access_token, create_refresh_token,
    set_access_cookies, set_refresh_cookies, unset_jwt_cookies,
)
from app.models.user import User
from app import db, limiter
from datetime import datetime
import re
import logging
```

- [ ] **Step 4: Rewrite `register` to set cookies**

Replace the entire `register` function in `backend/app/auth_bp.py` (lines 27–83):

```python
@auth_bp.route('/register', methods=['POST'])
@limiter.limit("5 per minute")
def register():
    """Register a new user"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        email    = data.get('email', '').strip().lower()
        username = data.get('username', '').strip()
        password = data.get('password', '')

        if not email or not username or not password:
            return jsonify({'error': 'Email, username, and password are required'}), 400
        if not validate_email(email):
            return jsonify({'error': 'Invalid email format'}), 400
        if len(username) < 3 or len(username) > 80:
            return jsonify({'error': 'Username must be between 3 and 80 characters'}), 400
        if not validate_password(password):
            return jsonify({
                'error': 'Password must be at least 8 characters with uppercase, lowercase, and digit'
            }), 400
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email already registered'}), 409
        if User.query.filter_by(username=username).first():
            return jsonify({'error': 'Username already taken'}), 409

        user = User(email=email, username=username)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()

        access_token, refresh_token = user.generate_tokens()
        response = make_response(
            jsonify({'message': 'User registered successfully', 'user': user.to_dict()}),
            201,
        )
        set_access_cookies(response, access_token)
        set_refresh_cookies(response, refresh_token)
        return response

    except Exception as e:
        db.session.rollback()
        logging.error(f"Error registering user: {str(e)}")
        return jsonify({'error': 'Registration failed'}), 500
```

- [ ] **Step 5: Rewrite `login` to set cookies**

Replace the entire `login` function in `backend/app/auth_bp.py` (lines 85–126):

```python
@auth_bp.route('/login', methods=['POST'])
@limiter.limit("10 per minute")
def login():
    """Login user"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        email    = data.get('email', '').strip().lower()
        password = data.get('password', '')

        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400

        user = User.query.filter_by(email=email).first()
        if not user or not user.check_password(password):
            return jsonify({'error': 'Invalid email or password'}), 401
        if not user.is_active:
            return jsonify({'error': 'Account is deactivated'}), 401

        user.last_login = datetime.utcnow()
        db.session.commit()

        access_token, refresh_token = user.generate_tokens()
        response = make_response(
            jsonify({'message': 'Login successful', 'user': user.to_dict()})
        )
        set_access_cookies(response, access_token)
        set_refresh_cookies(response, refresh_token)
        return response

    except Exception as e:
        logging.error(f"Error logging in user: {str(e)}")
        return jsonify({'error': 'Login failed'}), 500
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
cd backend && pipenv run pytest tests/test_auth.py -v
```

Expected: all 7 tests `PASSED`.

- [ ] **Step 7: Commit**

```bash
git add backend/app/auth_bp.py backend/tests/test_auth.py
git commit -m "feat: migrate login and register to HttpOnly cookie token delivery"
```

---

## Task 4: `/refresh` and `/logout` endpoints

**Files:**
- Modify: `backend/app/auth_bp.py`
- Modify: `backend/tests/test_auth.py`

- [ ] **Step 1: Write failing refresh and logout tests**

Add to `backend/tests/test_auth.py`:

```python
def test_refresh_issues_new_access_cookie(client, test_user):
    """Calling /refresh with a valid refresh cookie rotates the access token."""
    client.post('/api/auth/login', json={
        'email': test_user['email'],
        'password': test_user['password'],
    })
    original = {c.name: c.value for c in client.cookie_jar}

    response = client.post('/api/auth/refresh')
    assert response.status_code == 200
    assert response.get_json() == {'ok': True}

    updated = {c.name: c.value for c in client.cookie_jar}
    assert updated['access_token'] != original['access_token']


def test_refresh_rotates_refresh_cookie(client, test_user):
    """Calling /refresh issues a new refresh cookie (token rotation)."""
    client.post('/api/auth/login', json={
        'email': test_user['email'],
        'password': test_user['password'],
    })
    original_refresh = {c.name: c.value for c in client.cookie_jar}.get('refresh_token')

    client.post('/api/auth/refresh')
    updated_refresh = {c.name: c.value for c in client.cookie_jar}.get('refresh_token')
    assert updated_refresh != original_refresh


def test_refresh_without_cookie_returns_401(client):
    """Calling /refresh without a refresh cookie returns 401."""
    response = client.post('/api/auth/refresh')
    assert response.status_code == 401


def test_logout_clears_cookies(client, test_user):
    """Logout clears both access and refresh cookies."""
    client.post('/api/auth/login', json={
        'email': test_user['email'],
        'password': test_user['password'],
    })
    assert any(c.name == 'access_token' for c in client.cookie_jar)

    response = client.post('/api/auth/logout')
    assert response.status_code == 200
    assert response.get_json() == {'ok': True}

    cookie_values = {c.name: c.value for c in client.cookie_jar}
    assert cookie_values.get('access_token', '') == ''


def test_profile_inaccessible_after_logout(client, test_user):
    """Profile returns 401 after logout clears the access cookie."""
    client.post('/api/auth/login', json={
        'email': test_user['email'],
        'password': test_user['password'],
    })
    client.post('/api/auth/logout')
    response = client.get('/api/auth/profile')
    assert response.status_code == 401
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && pipenv run pytest tests/test_auth.py -v -k "refresh or logout"
```

Expected: `ERROR` — `404 Not Found` (endpoints don't exist yet).

- [ ] **Step 3: Add `/refresh` and `/logout` endpoints to `auth_bp.py`**

Insert the following two routes immediately before the existing `get_profile` function in `backend/app/auth_bp.py`:

```python
@auth_bp.route('/refresh', methods=['POST'])
@limiter.limit("30 per hour")
@jwt_required(refresh=True)
def refresh():
    """Silently rotate access and refresh tokens using the refresh cookie."""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user or not user.is_active:
            return jsonify({'error': 'Unauthorized'}), 401

        access_token, refresh_token = user.generate_tokens()
        response = make_response(jsonify({'ok': True}))
        set_access_cookies(response, access_token)
        set_refresh_cookies(response, refresh_token)
        return response

    except Exception as e:
        logging.error(f"Error refreshing token: {str(e)}")
        return jsonify({'error': 'Refresh failed'}), 500


@auth_bp.route('/logout', methods=['POST'])
def logout():
    """Clear access and refresh cookies."""
    response = make_response(jsonify({'ok': True}))
    unset_jwt_cookies(response)
    return response
```

- [ ] **Step 4: Run full test suite**

```bash
cd backend && pipenv run pytest tests/test_auth.py -v
```

Expected: all 12 tests `PASSED`.

- [ ] **Step 5: Commit**

```bash
git add backend/app/auth_bp.py backend/tests/test_auth.py
git commit -m "feat: add /refresh (with token rotation) and /logout endpoints"
```

---

## Task 5: Frontend — `fetchWithRefresh` & `lib/api.ts` cleanup

**Files:**
- Modify: `lib/api.ts`

The existing `ApiService` stores a `token` field, reads from `localStorage` in the constructor, sets `Authorization` headers, and returns `access_token`/`refresh_token` in the types for `login` and `register`. All of that is removed. A module-level `fetchWithRefresh` function replaces the inner `fetch` call in `request()`.

- [ ] **Step 1: Replace `lib/api.ts` with the cookie-based version**

Overwrite `lib/api.ts` entirely:

```ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface Station {
  id: number;
  name: string;
  description: string;
  url: string;
  logo_url?: string;
  website?: string;
  genre: string;
  region: string;
  language: string;
  frequency?: string;
  is_active: boolean;
  is_live: boolean;
  current_listeners?: number;
  total_plays?: number;
  rating?: number;
  favorites_count?: number;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  email: string;
  username: string;
  is_admin: boolean;
  last_login?: string;
  created_at: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

async function fetchWithRefresh(url: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, { ...init, credentials: 'include' });
  if (res.status !== 401) return res;

  // Try to silently refresh
  const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!refreshRes.ok) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth:expired'));
    }
    return res; // return original 401 to caller
  }

  // Retry original request once with new access cookie
  return fetch(url, { ...init, credentials: 'include' });
}

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    try {
      const response = await fetchWithRefresh(url, { ...options, headers });
      const data = await response.json();
      if (!response.ok) {
        return { error: data.error || 'Request failed' };
      }
      return { data };
    } catch {
      return { error: 'Network error occurred' };
    }
  }

  async login(email: string, password: string): Promise<ApiResponse<{ user: User }>> {
    return this.request<{ user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(
    email: string,
    username: string,
    password: string
  ): Promise<ApiResponse<{ user: User }>> {
    return this.request<{ user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, username, password }),
    });
  }

  async getProfile(): Promise<ApiResponse<{ user: User }>> {
    return this.request<{ user: User }>('/auth/profile');
  }

  async logout(): Promise<void> {
    await this.request('/auth/logout', { method: 'POST' });
  }

  async getStations(params?: {
    genre?: string;
    region?: string;
    search?: string;
    page?: number;
    per_page?: number;
    include_stats?: boolean;
  }): Promise<ApiResponse<{ stations: Station[]; pagination: any }>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    return this.request<{ stations: Station[]; pagination: any }>(
      `/stations?${queryParams.toString()}`
    );
  }

  async getStation(id: number): Promise<ApiResponse<{ station: Station }>> {
    return this.request<{ station: Station }>(`/stations/${id}`);
  }

  async playStation(id: number): Promise<ApiResponse<{ station: Station }>> {
    return this.request<{ station: Station }>(`/stations/${id}/play`, {
      method: 'POST',
    });
  }

  async toggleFavorite(
    id: number
  ): Promise<ApiResponse<{ is_favorited: boolean; station: Station }>> {
    return this.request<{ is_favorited: boolean; station: Station }>(
      `/stations/${id}/favorite`,
      { method: 'POST' }
    );
  }

  async getFavorites(): Promise<ApiResponse<{ favorites: Station[] }>> {
    return this.request<{ favorites: Station[] }>('/stations/favorites');
  }

  async getGenres(): Promise<ApiResponse<{ genres: string[] }>> {
    return this.request<{ genres: string[] }>('/stations/genres');
  }

  async getRegions(): Promise<ApiResponse<{ regions: string[] }>> {
    return this.request<{ regions: string[] }>('/stations/regions');
  }
}

export const apiService = new ApiService();
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors. If you see errors about `access_token` or `refresh_token` being referenced elsewhere, grep for those usages and remove them:

```bash
grep -r "access_token\|refresh_token\|setToken\|apiService\.token" --include="*.ts" --include="*.tsx" .
```

- [ ] **Step 3: Manual smoke test — login flow**

Start the dev server (`yarn dev`) and backend (`pipenv run flask run`). Open the browser DevTools → Application → Cookies. Log in. Verify:
- `access_token` cookie appears (HttpOnly checked)
- `refresh_token` cookie appears (HttpOnly checked)
- No token visible in the Network response body (only `user` object)

- [ ] **Step 4: Commit**

```bash
git add lib/api.ts
git commit -m "feat: replace localStorage token logic with cookie-based fetchWithRefresh"
```

---

## Task 6: Frontend — `AuthContext.tsx` cleanup

**Files:**
- Modify: `context/AuthContext.tsx`

Remove the `localStorage` token check in `checkAuth`. On mount, call `getProfile()` directly — the access cookie is sent automatically. Listen for the `auth:expired` custom event dispatched by `fetchWithRefresh` when silent refresh fails.

- [ ] **Step 1: Replace `context/AuthContext.tsx`**

Overwrite `context/AuthContext.tsx` entirely:

```tsx
'use client'

import { useState, useEffect, createContext, useContext } from 'react';
import { apiService, User } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount: probe profile endpoint — cookie sent automatically
  useEffect(() => {
    apiService.getProfile().then(res => {
      setUser(res.data?.user ?? null);
    }).catch(() => {
      setUser(null);
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  // When fetchWithRefresh exhausts the refresh token it fires this event
  useEffect(() => {
    const handler = () => setUser(null);
    window.addEventListener('auth:expired', handler);
    return () => window.removeEventListener('auth:expired', handler);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    const response = await apiService.login(email, password);
    if (response.data) {
      setUser(response.data.user);
      return true;
    }
    return false;
  };

  const register = async (
    email: string,
    username: string,
    password: string
  ): Promise<boolean> => {
    const response = await apiService.register(email, username, password);
    if (response.data) {
      setUser(response.data.user);
      return true;
    }
    return false;
  };

  const logout = () => {
    apiService.logout(); // clears cookies server-side (fire-and-forget)
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, isAuthenticated: !!user }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Manual smoke test — session persistence**

1. Log in. Verify you are authenticated (user name shows in header).
2. Hard-refresh the page (Ctrl+R). Verify you remain logged in (cookie persists, `getProfile` succeeds).
3. Click logout. Verify user is cleared and cookies disappear from DevTools.
4. Without logging in, navigate to a protected route. Verify you are shown the login modal.

- [ ] **Step 4: Manual smoke test — silent refresh**

This test requires temporarily shortening the access token expiry.

In `backend/app/__init__.py`, temporarily change:
```python
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(seconds=10)  # temporary
```

1. Log in. Wait 10 seconds.
2. Make any authenticated action (e.g., toggle a favorite).
3. Verify the action succeeds — `fetchWithRefresh` detected the 401 and refreshed silently.
4. Check browser cookies — `access_token` cookie has a new value.
5. Restore: `app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)`.

- [ ] **Step 5: Commit**

```bash
git add context/AuthContext.tsx
git commit -m "feat: remove localStorage from AuthContext, add auth:expired listener"
```

---

## Task 7: Next.js rate limiting middleware

**Files:**
- Create: `middleware.ts` (project root, same level as `app/`)

- [ ] **Step 1: Create `middleware.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';

// Sliding-window store: key = "ip:pathname", value = timestamp array
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
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  const key = `${ip}:${pathname}`;
  const now = Date.now();

  const timestamps = (hits.get(key) ?? []).filter(
    (t) => now - t < limit.windowMs
  );
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

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Manual smoke test — rate limit fires**

With the dev server running, run this from a terminal (requires `curl`):

```bash
for i in $(seq 1 22); do
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/stream-metadata?id=1
done
```

Expected: first 20 responses are `200` (or whatever the handler returns), requests 21 and 22 are `429`.

- [ ] **Step 4: Manual smoke test — unlisted routes are unaffected**

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/health
```

Expected: not `429` — middleware `matcher` doesn't cover `/api/health`.

- [ ] **Step 5: Commit**

```bash
git add middleware.ts
git commit -m "feat: add sliding-window rate limiter middleware for Next.js API routes"
```

---

## Environment variables checklist

Before deploying, set these in each environment:

| Variable | Service | Value |
|----------|---------|-------|
| `FRONTEND_URL` | Backend | `https://airwave.com` (your production domain) |
| `FLASK_ENV` | Backend | `production` (enables `JWT_COOKIE_SECURE=True`) |
| `JWT_SECRET_KEY` | Backend | Long random string — never use the default |
| `SECRET_KEY` | Backend | Long random string — never use the default |
| `NEXT_PUBLIC_API_URL` | Frontend | `https://api.airwave.com/api` |

**Local dev:** Set `FLASK_ENV=development` so cookies work over `http://localhost`.
