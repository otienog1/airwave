import pytest
from app import create_app, db as _db
from app.models.user import User


class SimpleCookie:
    """Simple cookie object matching http.cookiejar.Cookie interface."""
    def __init__(self, name, value):
        self.name = name
        self.value = value


class CookieJarProxy:
    """Exposes Flask test client cookies as an iterable of SimpleCookie objects.

    Tracks cookies from Set-Cookie headers in responses.
    """
    def __init__(self, client):
        self.client = client
        self.cookies = {}

    def update_from_response(self, response):
        """Extract cookies from Set-Cookie headers and update storage."""
        for cookie_header in response.headers.getlist('Set-Cookie'):
            if '=' in cookie_header:
                cookie_name, cookie_rest = cookie_header.split('=', 1)
                cookie_value = cookie_rest.split(';')[0].strip()
                if cookie_value:
                    self.cookies[cookie_name] = cookie_value
                else:
                    # Empty cookie = clear cookie
                    self.cookies[cookie_name] = ''

    def __iter__(self):
        """Iterate over cookies as SimpleCookie objects."""
        for name, value in self.cookies.items():
            yield SimpleCookie(name, value)


class TestClientWithCookies:
    """Wrapper around Flask test client that tracks Set-Cookie headers."""
    def __init__(self, client, cookie_jar):
        self._client = client
        self.cookie_jar = cookie_jar

    def _track_cookies(self, response):
        """Update cookie_jar from response Set-Cookie headers."""
        self.cookie_jar.update_from_response(response)
        return response

    def get(self, *args, **kwargs):
        response = self._client.get(*args, **kwargs)
        return self._track_cookies(response)

    def post(self, *args, **kwargs):
        response = self._client.post(*args, **kwargs)
        return self._track_cookies(response)

    def put(self, *args, **kwargs):
        response = self._client.put(*args, **kwargs)
        return self._track_cookies(response)

    def delete(self, *args, **kwargs):
        response = self._client.delete(*args, **kwargs)
        return self._track_cookies(response)

    def patch(self, *args, **kwargs):
        response = self._client.patch(*args, **kwargs)
        return self._track_cookies(response)

    def options(self, *args, **kwargs):
        response = self._client.options(*args, **kwargs)
        return self._track_cookies(response)

    def __getattr__(self, name):
        """Delegate other attributes to the wrapped client."""
        return getattr(self._client, name)


@pytest.fixture(scope='function')
def app():
    application = create_app(test_config={
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
        'JWT_COOKIE_SECURE': False,
        'RATELIMIT_ENABLED': False,
        'RATELIMIT_STORAGE_URI': 'memory://',
    })
    with application.app_context():
        _db.create_all()
        yield application
        _db.drop_all()


@pytest.fixture(scope='function')
def client(app):
    test_client = app.test_client(use_cookies=True)
    cookie_jar = CookieJarProxy(test_client)
    return TestClientWithCookies(test_client, cookie_jar)


@pytest.fixture(scope='function')
def test_user(app):
    # `app` fixture already provides an app context — no need to push another
    user = User(email='test@example.com', username='testuser')
    user.set_password('TestPass123')
    _db.session.add(user)
    _db.session.commit()
    return {'email': 'test@example.com', 'password': 'TestPass123'}
