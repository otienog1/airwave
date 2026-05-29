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
    set_cookie_header = response.headers.getlist('Set-Cookie')
    access_cookie = next(c for c in set_cookie_header if 'access_token' in c)
    assert 'HttpOnly' in access_cookie


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
    set_cookie_header = response.headers.getlist('Set-Cookie')
    access_cookie = next(c for c in set_cookie_header if 'access_token' in c)
    assert 'HttpOnly' in access_cookie


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


def _parse_set_cookies(response):
    """Return {name: value} from a response's Set-Cookie headers."""
    result = {}
    for header in response.headers.getlist('Set-Cookie'):
        parts = header.split(';')
        name, _, value = parts[0].partition('=')
        result[name.strip()] = value.strip()
    return result


def test_refresh_issues_new_access_cookie(client, test_user):
    """Calling /refresh with a valid refresh cookie rotates the access token."""
    login_res = client.post('/api/auth/login', json={
        'email': test_user['email'],
        'password': test_user['password'],
    })
    original_access = _parse_set_cookies(login_res).get('access_token')
    assert original_access is not None

    response = client.post('/api/auth/refresh')
    assert response.status_code == 200
    assert response.get_json() == {'ok': True}

    new_access = _parse_set_cookies(response).get('access_token')
    assert new_access is not None
    assert new_access != original_access


def test_refresh_rotates_refresh_cookie(client, test_user):
    """Calling /refresh issues a new refresh cookie (token rotation)."""
    login_res = client.post('/api/auth/login', json={
        'email': test_user['email'],
        'password': test_user['password'],
    })
    original_refresh = _parse_set_cookies(login_res).get('refresh_token')
    assert original_refresh is not None

    refresh_res = client.post('/api/auth/refresh')
    new_refresh = _parse_set_cookies(refresh_res).get('refresh_token')
    assert new_refresh is not None
    assert new_refresh != original_refresh


def test_refresh_without_cookie_returns_401(client):
    """Calling /refresh without a refresh cookie returns 401."""
    response = client.post('/api/auth/refresh')
    assert response.status_code == 401


def test_logout_clears_cookies(client, test_user):
    """Logout clears both access and refresh cookies."""
    login_res = client.post('/api/auth/login', json={
        'email': test_user['email'],
        'password': test_user['password'],
    })
    assert _parse_set_cookies(login_res).get('access_token') is not None

    response = client.post('/api/auth/logout')
    assert response.status_code == 200
    assert response.get_json() == {'ok': True}

    # unset_jwt_cookies signals deletion by setting the cookie to empty value
    cleared = _parse_set_cookies(response)
    assert cleared.get('access_token', 'not-present') == ''


def test_profile_inaccessible_after_logout(client, test_user):
    """Profile returns 401 after logout clears the access cookie."""
    client.post('/api/auth/login', json={
        'email': test_user['email'],
        'password': test_user['password'],
    })
    client.post('/api/auth/logout')
    response = client.get('/api/auth/profile')
    assert response.status_code == 401
