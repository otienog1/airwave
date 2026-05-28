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
    assert any('access_token' in cookie for cookie in set_cookie_header)


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
    assert any('access_token' in cookie for cookie in set_cookie_header)


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
