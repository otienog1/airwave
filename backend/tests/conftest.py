import pytest
from app import create_app, db as _db
from app.models.user import User


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
    return app.test_client(use_cookies=True)


@pytest.fixture(scope='function')
def test_user(app):
    # `app` fixture already provides an app context — no need to push another
    user = User(email='test@example.com', username='testuser')
    user.set_password('TestPass123')
    _db.session.add(user)
    _db.session.commit()
    return {'email': 'test@example.com', 'password': 'TestPass123'}
