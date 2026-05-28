import pytest
from app import create_app, db as _db
from app.models.user import User
from werkzeug.test import EnvironBuilder


class SimpleCookie:
    """Simple cookie object for testing."""
    def __init__(self, name, value):
        self.name = name
        self.value = value


class CookieJar:
    """Simple cookie jar for tracking cookies in tests."""
    def __init__(self):
        self.cookies = {}

    def __iter__(self):
        """Allow iteration over cookie objects."""
        return iter(self.cookies.values())

    def set_cookie(self, name, value):
        """Set a cookie in the jar."""
        self.cookies[name] = SimpleCookie(name, value)

    def clear(self, name):
        """Clear a cookie from the jar."""
        self.cookies[name] = SimpleCookie(name, '')


class TestClientWrapper:
    """Wrapper around Flask test client that tracks cookies."""
    def __init__(self, client):
        self._client = client
        self.cookie_jar = CookieJar()

    def _update_cookies_from_response(self, response):
        """Extract cookies from Set-Cookie headers and store in jar."""
        for cookie_header in response.headers.getlist('Set-Cookie'):
            if '=' in cookie_header:
                cookie_name, cookie_rest = cookie_header.split('=', 1)
                cookie_value = cookie_rest.split(';')[0].strip()
                if cookie_value:
                    self.cookie_jar.set_cookie(cookie_name, cookie_value)
                else:
                    # Empty cookie = clear cookie
                    self.cookie_jar.clear(cookie_name)

    def post(self, *args, **kwargs):
        response = self._client.post(*args, **kwargs)
        self._update_cookies_from_response(response)
        return response

    def get(self, *args, **kwargs):
        response = self._client.get(*args, **kwargs)
        self._update_cookies_from_response(response)
        return response

    def options(self, *args, **kwargs):
        response = self._client.options(*args, **kwargs)
        self._update_cookies_from_response(response)
        return response

    def __getattr__(self, name):
        """Delegate other attributes to the wrapped client."""
        return getattr(self._client, name)


@pytest.fixture(scope='function')
def app():
    application = create_app(test_config={
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
        'JWT_COOKIE_SECURE': False,      # allow http in tests
        'RATELIMIT_ENABLED': False,       # disable rate limiting in tests
        'RATELIMIT_STORAGE_URI': 'memory://',
    })
    with application.app_context():
        _db.create_all()
        yield application
        _db.drop_all()


@pytest.fixture(scope='function')
def client(app):
    # use_cookies=True ensures cookies are maintained across requests
    # Wrap it to expose cookie_jar for test access
    test_client = app.test_client(use_cookies=True)
    return TestClientWrapper(test_client)


@pytest.fixture(scope='function')
def test_user(app):
    # `app` fixture already provides an app context — no need to push another
    user = User(email='test@example.com', username='testuser')
    user.set_password('TestPass123')
    _db.session.add(user)
    _db.session.commit()
    return {'email': 'test@example.com', 'password': 'TestPass123'}
