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
