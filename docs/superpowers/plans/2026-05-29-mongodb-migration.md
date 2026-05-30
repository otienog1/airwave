# MongoDB Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the Flask backend from SQLAlchemy/SQLite to MongoDB (pymongo). All data — stations, users, favorites, plays — lives in MongoDB. Integer IDs are preserved via a `counters` collection so the frontend and existing analytics collections need zero changes.

**Architecture:**
- Remove: Flask-SQLAlchemy, Flask-Migrate, SQLAlchemy, psycopg2, alembic
- Add: pymongo
- New `backend/app/db.py` — MongoDB connection + `get_next_id()` counter helper
- Models become plain Python classes (no ORM)
- Favorites embedded as `favorite_station_ids: [int]` array on user documents
- New `stationPlays` collection replaces SQLAlchemy `station_plays` table
- `counters` collection provides auto-increment integer IDs
- Frontend unchanged — `station.id` stays a number

**Collections after migration:**
| Collection | Content |
|---|---|
| `stations` | Station data, integer `id` field |
| `users` | User data, integer `id`, embedded `favorite_station_ids` |
| `stationPlays` | Play records per station/user |
| `plays` | Analytics play records (existing, unchanged) |
| `stationSnapshots` | Analytics snapshots (existing, unchanged) |
| `listenerSessions` | Real-time listener sessions (existing, unchanged) |
| `counters` | Auto-increment sequences for station/user IDs |

**Tech Stack:** Flask, Flask-JWT-Extended, Flask-CORS, Flask-Limiter, pymongo, werkzeug, python-dotenv.

---

## Task 1: Create `backend/app/db.py`

**Files:**
- Create: `backend/app/db.py`

- [ ] **Step 1: Create `backend/app/db.py` with this exact content:**

```python
import os
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.collection import Collection

_client: MongoClient | None = None

def get_client() -> MongoClient:
    global _client
    if _client is None:
        uri = os.environ.get('MONGODB_URI', 'mongodb://localhost:27017/airwave')
        _client = MongoClient(uri)
    return _client

def get_db():
    client = get_client()
    uri = os.environ.get('MONGODB_URI', 'mongodb://localhost:27017/airwave')
    # Extract db name from URI (last path segment), default to 'airwave'
    db_name = uri.rsplit('/', 1)[-1].split('?')[0] or 'airwave'
    return client[db_name]

def get_stations_col() -> Collection:
    return get_db()['stations']

def get_users_col() -> Collection:
    return get_db()['users']

def get_station_plays_col() -> Collection:
    return get_db()['stationPlays']

def get_counters_col() -> Collection:
    return get_db()['counters']

def get_next_id(name: str) -> int:
    """Atomically increment and return the next integer ID."""
    result = get_counters_col().find_one_and_update(
        {'_id': name},
        {'$inc': {'seq': 1}},
        upsert=True,
        return_document=True,
    )
    return result['seq']

def ensure_indexes() -> None:
    stations = get_stations_col()
    stations.create_index([('id', ASCENDING)], unique=True, name='station_id_unique')
    stations.create_index([('name', ASCENDING)], unique=True, name='station_name_unique')
    stations.create_index([('genre', ASCENDING)], name='station_genre')
    stations.create_index([('region', ASCENDING)], name='station_region')
    stations.create_index([('is_active', ASCENDING)], name='station_active')
    stations.create_index([('total_plays', DESCENDING)], name='station_plays_desc')

    users = get_users_col()
    users.create_index([('id', ASCENDING)], unique=True, name='user_id_unique')
    users.create_index([('email', ASCENDING)], unique=True, name='user_email_unique')
    users.create_index([('username', ASCENDING)], unique=True, name='user_username_unique')

    plays = get_station_plays_col()
    plays.create_index([('station_id', ASCENDING), ('played_at', DESCENDING)], name='play_station_time')
    plays.create_index([('user_id', ASCENDING), ('played_at', DESCENDING)], name='play_user_time')
    plays.create_index([('played_at', ASCENDING)], name='play_time')
    plays.create_index([('ip_address', ASCENDING)], name='play_ip')
```

- [ ] **Step 2: Verify the module is importable**

```powershell
cd c:\Users\7plus8\build\airwave\backend
python -c "from app.db import get_db; print('db.py OK')" 2>&1
```

Expected: might fail because `app/__init__.py` still tries to load SQLAlchemy. That's OK — we test it fully after Task 2.

- [ ] **Step 3: Commit**

```powershell
cd c:\Users\7plus8\build\airwave
git add backend/app/db.py
git commit -m @'
feat(mongo): add backend/app/db.py — MongoDB connection and collection helpers

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
'@
```

---

## Task 2: Rewrite `backend/app/__init__.py`

**Files:**
- Modify: `backend/app/__init__.py`

Remove all SQLAlchemy/Migrate references. Keep JWT, CORS, Limiter. Update health check to ping MongoDB.

- [ ] **Step 1: Replace the entire content of `backend/app/__init__.py` with:**

```python
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from dotenv import load_dotenv
import os
from datetime import timedelta

load_dotenv()

jwt = JWTManager()
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["100 per hour"],
)

def create_app(config_name='development', test_config=None):
    app = Flask(__name__)

    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-change-in-production')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
    app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)
    app.config['JWT_TOKEN_LOCATION'] = ['cookies']
    app.config['JWT_ACCESS_COOKIE_NAME'] = 'access_token'
    app.config['JWT_REFRESH_COOKIE_NAME'] = 'refresh_token'
    _is_secure = os.environ.get('FLASK_ENV') != 'development'
    app.config['JWT_COOKIE_SECURE'] = _is_secure
    app.config['JWT_COOKIE_SAMESITE'] = 'None' if _is_secure else 'Lax'
    app.config['JWT_COOKIE_CSRF_PROTECT'] = False
    app.config['JWT_REFRESH_COOKIE_PATH'] = '/api/auth/refresh'

    if test_config is not None:
        app.config.update(test_config)

    jwt.init_app(app)
    limiter.init_app(app)

    CORS(
        app,
        origins=[os.environ.get('FRONTEND_URL', 'http://localhost:3000')],
        supports_credentials=True,
        allow_headers=['Content-Type'],
    )

    from .stations_bp import stations_bp
    from .auth_bp import auth_bp
    from .admin_bp import admin_bp
    from .analytics_bp import analytics_bp, register_analytics_commands

    app.register_blueprint(stations_bp, url_prefix='/api/stations')
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(analytics_bp, url_prefix='/api/analytics')

    register_analytics_commands(app)

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Resource not found'}), 404

    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({'error': 'Bad request'}), 400

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({'error': 'Internal server error'}), 500

    @app.route('/api/health')
    def health_check():
        from .db import get_db
        checks = {}
        try:
            get_db().command('ping')
            checks['mongodb'] = 'ok'
        except Exception as e:
            checks['mongodb'] = f'error: {e}'
        overall = 'healthy' if all(v == 'ok' for v in checks.values()) else 'degraded'
        return jsonify({'status': overall, 'service': 'airwave-api', 'checks': checks}), (200 if overall == 'healthy' else 503)

    return app
```

- [ ] **Step 2: Verify the app starts**

```powershell
cd c:\Users\7plus8\build\airwave\backend
python -c "from app import create_app; app = create_app(); print('OK')" 2>&1
```

Expected: `OK` (blueprint imports may fail if blueprints still use SQLAlchemy — that's resolved in later tasks; just confirm no syntax errors in `__init__.py` itself by checking the error message).

- [ ] **Step 3: Commit**

```powershell
cd c:\Users\7plus8\build\airwave
git add backend/app/__init__.py
git commit -m @'
feat(mongo): rewrite __init__.py — remove SQLAlchemy, wire MongoDB health check

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
'@
```

---

## Task 3: Rewrite models as plain Python classes

**Files:**
- Rewrite: `backend/app/models/user.py`
- Rewrite: `backend/app/models/station.py`
- Rewrite: `backend/app/models/analytics.py`
- Rewrite: `backend/app/models/favorites.py`

These are now plain helper classes — no SQLAlchemy ORM.

- [ ] **Step 1: Replace `backend/app/models/user.py` entirely:**

```python
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, create_refresh_token
from app.db import get_users_col, get_next_id


class User:
    def __init__(self, doc: dict):
        self._doc = doc

    # ── Properties ────────────────────────────────────────────────────────────

    @property
    def id(self) -> int:
        return self._doc['id']

    @property
    def email(self) -> str:
        return self._doc['email']

    @property
    def username(self) -> str:
        return self._doc['username']

    @property
    def password_hash(self) -> str:
        return self._doc['password_hash']

    @property
    def is_admin(self) -> bool:
        return self._doc.get('is_admin', False)

    @property
    def is_active(self) -> bool:
        return self._doc.get('is_active', True)

    @property
    def last_login(self):
        return self._doc.get('last_login')

    @property
    def created_at(self):
        return self._doc.get('created_at', datetime.utcnow())

    @property
    def favorite_station_ids(self) -> list:
        return self._doc.get('favorite_station_ids', [])

    # ── Auth helpers ──────────────────────────────────────────────────────────

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def generate_tokens(self):
        access_token = create_access_token(identity=str(self.id))
        refresh_token = create_refresh_token(identity=str(self.id))
        return access_token, refresh_token

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'email': self.email,
            'username': self.username,
            'is_admin': self.is_admin,
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'created_at': self.created_at.isoformat(),
        }

    # ── Class-level MongoDB operations ────────────────────────────────────────

    @classmethod
    def create(cls, email: str, username: str, password: str, is_admin: bool = False) -> 'User':
        col = get_users_col()
        now = datetime.utcnow()
        doc = {
            'id': get_next_id('user'),
            'email': email.lower().strip(),
            'username': username.strip(),
            'password_hash': generate_password_hash(password),
            'is_admin': is_admin,
            'is_active': True,
            'favorite_station_ids': [],
            'last_login': None,
            'created_at': now,
        }
        col.insert_one(doc)
        return cls(doc)

    @classmethod
    def find_by_email(cls, email: str) -> 'User | None':
        doc = get_users_col().find_one({'email': email.lower().strip()})
        return cls(doc) if doc else None

    @classmethod
    def find_by_id(cls, user_id: int) -> 'User | None':
        doc = get_users_col().find_one({'id': int(user_id)})
        return cls(doc) if doc else None

    @classmethod
    def find_by_username(cls, username: str) -> 'User | None':
        doc = get_users_col().find_one({'username': username.strip()})
        return cls(doc) if doc else None

    @classmethod
    def email_exists(cls, email: str) -> bool:
        return get_users_col().count_documents({'email': email.lower().strip()}) > 0

    @classmethod
    def username_exists(cls, username: str) -> bool:
        return get_users_col().count_documents({'username': username.strip()}) > 0

    def update_last_login(self) -> None:
        now = datetime.utcnow()
        get_users_col().update_one({'id': self.id}, {'$set': {'last_login': now}})
        self._doc['last_login'] = now

    def add_favorite(self, station_id: int) -> None:
        get_users_col().update_one(
            {'id': self.id},
            {'$addToSet': {'favorite_station_ids': station_id}},
        )

    def remove_favorite(self, station_id: int) -> None:
        get_users_col().update_one(
            {'id': self.id},
            {'$pull': {'favorite_station_ids': station_id}},
        )

    def has_favorite(self, station_id: int) -> bool:
        return station_id in self.favorite_station_ids
```

- [ ] **Step 2: Replace `backend/app/models/station.py` entirely:**

```python
from datetime import datetime
from app.db import get_stations_col, get_next_id


class Station:
    def __init__(self, doc: dict):
        self._doc = doc

    # ── Properties ────────────────────────────────────────────────────────────

    @property
    def id(self) -> int:
        return self._doc['id']

    @property
    def name(self) -> str:
        return self._doc['name']

    @property
    def description(self) -> str | None:
        return self._doc.get('description')

    @property
    def url(self) -> str:
        return self._doc['url']

    @property
    def logo_url(self) -> str | None:
        return self._doc.get('logo_url')

    @property
    def website(self) -> str | None:
        return self._doc.get('website')

    @property
    def genre(self) -> str:
        return self._doc['genre']

    @property
    def region(self) -> str:
        return self._doc['region']

    @property
    def language(self) -> str:
        return self._doc.get('language', 'English')

    @property
    def frequency(self) -> str | None:
        return self._doc.get('frequency')

    @property
    def is_active(self) -> bool:
        return self._doc.get('is_active', True)

    @property
    def is_live(self) -> bool:
        return self._doc.get('is_live', True)

    @property
    def current_listeners(self) -> int:
        return self._doc.get('current_listeners', 0)

    @property
    def total_plays(self) -> int:
        return self._doc.get('total_plays', 0)

    @property
    def rating(self) -> float:
        return self._doc.get('rating', 0.0)

    @property
    def created_at(self) -> datetime:
        return self._doc.get('created_at', datetime.utcnow())

    @property
    def updated_at(self) -> datetime:
        return self._doc.get('updated_at', datetime.utcnow())

    def to_dict(self, include_stats: bool = False) -> dict:
        data = {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'url': self.url,
            'logo_url': self.logo_url,
            'website': self.website,
            'genre': self.genre,
            'region': self.region,
            'language': self.language,
            'frequency': self.frequency,
            'is_active': self.is_active,
            'is_live': self.is_live,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }
        if include_stats:
            data.update({
                'current_listeners': self.current_listeners,
                'total_plays': self.total_plays,
                'rating': self.rating,
            })
        return data

    # ── Class-level MongoDB operations ────────────────────────────────────────

    @classmethod
    def create(cls, name: str, url: str, genre: str, region: str, **kwargs) -> 'Station':
        col = get_stations_col()
        now = datetime.utcnow()
        doc = {
            'id': get_next_id('station'),
            'name': name,
            'description': kwargs.get('description', ''),
            'url': url,
            'logo_url': kwargs.get('logo_url'),
            'website': kwargs.get('website'),
            'genre': genre,
            'region': region,
            'language': kwargs.get('language', 'English'),
            'frequency': kwargs.get('frequency'),
            'is_active': kwargs.get('is_active', True),
            'is_live': kwargs.get('is_live', True),
            'current_listeners': 0,
            'total_plays': 0,
            'rating': 0.0,
            'created_at': now,
            'updated_at': now,
        }
        col.insert_one(doc)
        return cls(doc)

    @classmethod
    def find_by_id(cls, station_id: int) -> 'Station | None':
        doc = get_stations_col().find_one({'id': int(station_id)})
        return cls(doc) if doc else None

    @classmethod
    def find_by_name(cls, name: str) -> 'Station | None':
        doc = get_stations_col().find_one({'name': name})
        return cls(doc) if doc else None

    @classmethod
    def name_exists(cls, name: str) -> bool:
        return get_stations_col().count_documents({'name': name}) > 0

    def update(self, **fields) -> None:
        fields['updated_at'] = datetime.utcnow()
        get_stations_col().update_one({'id': self.id}, {'$set': fields})
        self._doc.update(fields)

    def increment_play_count(self) -> None:
        get_stations_col().update_one({'id': self.id}, {'$inc': {'total_plays': 1}})
        self._doc['total_plays'] = self._doc.get('total_plays', 0) + 1
```

- [ ] **Step 3: Replace `backend/app/models/analytics.py` with a thin stub:**

```python
# Analytics data lives in the 'stationPlays' MongoDB collection.
# Access it via app.db.get_station_plays_col()

from app.db import get_station_plays_col

class StationPlay:
    """Thin wrapper for stationPlays documents."""

    @staticmethod
    def record(station_id: int, user_id: int | None, ip_address: str, user_agent: str) -> None:
        from datetime import datetime
        get_station_plays_col().insert_one({
            'station_id': station_id,
            'user_id': user_id,
            'ip_address': ip_address,
            'user_agent': user_agent[:500],
            'duration': 0,
            'played_at': datetime.utcnow(),
        })
```

- [ ] **Step 4: Replace `backend/app/models/favorites.py` with a one-liner stub:**

```python
# Favorites are stored as favorite_station_ids: [int] inside user documents.
# Use User.add_favorite(station_id) and User.remove_favorite(station_id).
```

- [ ] **Step 5: Replace `backend/app/models/__init__.py` re-exports:**

The current `backend/app/models/station.py` starts with re-exports from other models. Rewrite `backend/app/models/__init__.py` (create it if it doesn't exist as a separate file) OR update the top of the new `station.py` — actually just make sure the models `__init__` (the beginning of station.py) is clean. The new `station.py` should NOT import from `user.py` or `analytics.py` at the top.

Check if there's a separate `backend/app/models/__init__.py` file. If not, the imports in `station.py` (the old file had re-exports at the top) should be removed since the new station.py doesn't need them.

- [ ] **Step 6: Verify models load**

```powershell
cd c:\Users\7plus8\build\airwave\backend
python -c "
from app.models.user import User
from app.models.station import Station
from app.models.analytics import StationPlay
print('models OK')
" 2>&1
```

Expected: `models OK`. If there are import errors about missing `app.db`, that's resolved once all files are saved.

- [ ] **Step 7: Commit**

```powershell
cd c:\Users\7plus8\build\airwave
git add backend/app/models/
git commit -m @'
feat(mongo): rewrite models as plain Python classes backed by MongoDB

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
'@
```

---

## Task 4: Rewrite `backend/app/stations_bp.py`

**Files:**
- Rewrite: `backend/app/stations_bp.py`

- [ ] **Step 1: Replace the entire file:**

```python
from flask import Blueprint, request, jsonify, make_response
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.station import Station
from app.models.user import User
from app.models.analytics import StationPlay
from app.db import get_stations_col, get_station_plays_col
from app import limiter
import logging
import re

stations_bp = Blueprint('stations', __name__)


def _build_filter(genre=None, region=None, search=None):
    query = {'is_active': True}
    if genre and genre.lower() != 'all':
        query['genre'] = genre
    if region and region.lower() != 'all':
        query['region'] = region
    if search:
        pattern = re.compile(re.escape(search), re.IGNORECASE)
        query['$or'] = [{'name': pattern}, {'description': pattern}]
    return query


@stations_bp.route('/', methods=['GET'])
@limiter.limit("60 per minute")
def get_stations():
    try:
        genre = request.args.get('genre')
        region = request.args.get('region')
        search = request.args.get('search')
        page = max(request.args.get('page', 1, type=int), 1)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        include_stats = request.args.get('include_stats', 'false').lower() == 'true'

        col = get_stations_col()
        query = _build_filter(genre, region, search)

        total = col.count_documents(query)
        cursor = (
            col.find(query)
            .sort([('total_plays', -1), ('name', 1)])
            .skip((page - 1) * per_page)
            .limit(per_page)
        )

        stations_data = [Station(doc).to_dict(include_stats=include_stats) for doc in cursor]
        pages = max((total + per_page - 1) // per_page, 1)

        resp = make_response(jsonify({
            'stations': stations_data,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total,
                'pages': pages,
                'has_next': page < pages,
                'has_prev': page > 1,
            },
        }))
        resp.headers['Cache-Control'] = 'public, max-age=30, stale-while-revalidate=60'
        return resp

    except Exception as e:
        logging.error(f"Error fetching stations: {e}")
        return jsonify({'error': 'Failed to fetch stations'}), 500


@stations_bp.route('/<int:station_id>', methods=['GET'])
@limiter.limit("30 per minute")
def get_station(station_id):
    try:
        station = Station.find_by_id(station_id)
        if not station or not station.is_active:
            return jsonify({'error': 'Station not found'}), 404
        return jsonify({'station': station.to_dict(include_stats=True)})
    except Exception as e:
        logging.error(f"Error fetching station {station_id}: {e}")
        return jsonify({'error': 'Failed to fetch station'}), 500


@stations_bp.route('/<int:station_id>/play', methods=['POST'])
@jwt_required(optional=True)
@limiter.limit("10 per minute")
def play_station(station_id):
    try:
        station = Station.find_by_id(station_id)
        if not station or not station.is_active or not station.is_live:
            return jsonify({'error': 'Station not available'}), 400

        user_id_str = get_jwt_identity()
        user_id = int(user_id_str) if user_id_str else None

        StationPlay.record(
            station_id=station_id,
            user_id=user_id,
            ip_address=request.remote_addr or '',
            user_agent=request.headers.get('User-Agent', ''),
        )
        station.increment_play_count()

        return jsonify({'message': 'Play recorded successfully', 'station': station.to_dict(include_stats=True)})

    except Exception as e:
        logging.error(f"Error recording play for station {station_id}: {e}")
        return jsonify({'error': 'Failed to record play'}), 500


@stations_bp.route('/favorites', methods=['GET'])
@jwt_required()
def get_user_favorites():
    try:
        user_id = int(get_jwt_identity())
        user = User.find_by_id(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        col = get_stations_col()
        docs = list(col.find({'id': {'$in': user.favorite_station_ids}, 'is_active': True}))
        return jsonify({'favorites': [Station(doc).to_dict(include_stats=True) for doc in docs]})

    except Exception as e:
        logging.error(f"Error fetching favorites: {e}")
        return jsonify({'error': 'Failed to fetch favorites'}), 500


@stations_bp.route('/<int:station_id>/favorite', methods=['POST'])
@jwt_required()
@limiter.limit("20 per minute")
def toggle_favorite(station_id):
    try:
        user_id = int(get_jwt_identity())
        user = User.find_by_id(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        station = Station.find_by_id(station_id)
        if not station:
            return jsonify({'error': 'Station not found'}), 404

        if user.has_favorite(station_id):
            user.remove_favorite(station_id)
            is_favorited = False
            message = 'Station removed from favorites'
        else:
            user.add_favorite(station_id)
            is_favorited = True
            message = 'Station added to favorites'

        return jsonify({'message': message, 'is_favorited': is_favorited, 'station': station.to_dict()})

    except Exception as e:
        logging.error(f"Error toggling favorite for station {station_id}: {e}")
        return jsonify({'error': 'Failed to update favorite'}), 500


@stations_bp.route('/genres', methods=['GET'])
@limiter.limit("30 per minute")
def get_genres():
    try:
        genres = get_stations_col().distinct('genre', {'is_active': True})
        return jsonify({'genres': sorted(g for g in genres if g)})
    except Exception as e:
        logging.error(f"Error fetching genres: {e}")
        return jsonify({'error': 'Failed to fetch genres'}), 500


@stations_bp.route('/regions', methods=['GET'])
@limiter.limit("30 per minute")
def get_regions():
    try:
        regions = get_stations_col().distinct('region', {'is_active': True})
        return jsonify({'regions': sorted(r for r in regions if r)})
    except Exception as e:
        logging.error(f"Error fetching regions: {e}")
        return jsonify({'error': 'Failed to fetch regions'}), 500
```

- [ ] **Step 2: Commit**

```powershell
cd c:\Users\7plus8\build\airwave
git add backend/app/stations_bp.py
git commit -m @'
feat(mongo): rewrite stations_bp.py — replace SQLAlchemy with pymongo queries

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
'@
```

---

## Task 5: Rewrite `backend/app/auth_bp.py`

**Files:**
- Rewrite: `backend/app/auth_bp.py`

- [ ] **Step 1: Replace the entire file:**

```python
from flask import Blueprint, request, jsonify, make_response
from flask_jwt_extended import (
    jwt_required, get_jwt_identity,
    set_access_cookies, set_refresh_cookies, unset_jwt_cookies,
)
from app.models.user import User
from app import limiter
from datetime import datetime
import re
import logging

auth_bp = Blueprint('auth', __name__)


def validate_email(email: str) -> bool:
    return bool(re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email))


def validate_password(password: str) -> bool:
    return (
        len(password) >= 8
        and bool(re.search(r'[A-Z]', password))
        and bool(re.search(r'[a-z]', password))
        and bool(re.search(r'\d', password))
    )


@auth_bp.route('/register', methods=['POST'])
@limiter.limit("5 per minute")
def register():
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
            return jsonify({'error': 'Password must be at least 8 characters with uppercase, lowercase, and digit'}), 400
        if User.email_exists(email):
            return jsonify({'error': 'Email already registered'}), 409
        if User.username_exists(username):
            return jsonify({'error': 'Username already taken'}), 409

        user = User.create(email=email, username=username, password=password)
        access_token, refresh_token = user.generate_tokens()

        response = make_response(
            jsonify({'message': 'User registered successfully', 'user': user.to_dict()}), 201
        )
        set_access_cookies(response, access_token)
        set_refresh_cookies(response, refresh_token)
        return response

    except Exception as e:
        logging.error(f"Error registering user: {e}")
        return jsonify({'error': 'Registration failed'}), 500


@auth_bp.route('/login', methods=['POST'])
@limiter.limit("10 per minute")
def login():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        email    = data.get('email', '').strip().lower()
        password = data.get('password', '')

        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400

        user = User.find_by_email(email)
        if not user or not user.check_password(password):
            return jsonify({'error': 'Invalid email or password'}), 401
        if not user.is_active:
            return jsonify({'error': 'Account is deactivated'}), 401

        user.update_last_login()
        access_token, refresh_token = user.generate_tokens()

        response = make_response(jsonify({'message': 'Login successful', 'user': user.to_dict()}))
        set_access_cookies(response, access_token)
        set_refresh_cookies(response, refresh_token)
        return response

    except Exception as e:
        logging.error(f"Error logging in user: {e}")
        return jsonify({'error': 'Login failed'}), 500


@auth_bp.route('/refresh', methods=['POST'])
@limiter.limit("30 per hour")
@jwt_required(refresh=True)
def refresh():
    try:
        user_id = int(get_jwt_identity())
        user = User.find_by_id(user_id)
        if not user or not user.is_active:
            return jsonify({'error': 'Unauthorized'}), 401

        access_token, refresh_token = user.generate_tokens()
        response = make_response(jsonify({'ok': True}))
        set_access_cookies(response, access_token)
        set_refresh_cookies(response, refresh_token)
        return response

    except Exception as e:
        logging.error(f"Error refreshing token: {e}")
        return jsonify({'error': 'Refresh failed'}), 500


@auth_bp.route('/logout', methods=['POST'])
def logout():
    response = make_response(jsonify({'ok': True}))
    unset_jwt_cookies(response)
    return response


@auth_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    try:
        user_id = int(get_jwt_identity())
        user = User.find_by_id(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        return jsonify({'user': user.to_dict()})
    except Exception as e:
        logging.error(f"Error fetching profile: {e}")
        return jsonify({'error': 'Failed to fetch profile'}), 500
```

- [ ] **Step 2: Commit**

```powershell
cd c:\Users\7plus8\build\airwave
git add backend/app/auth_bp.py
git commit -m @'
feat(mongo): rewrite auth_bp.py — replace SQLAlchemy with MongoDB user lookups

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
'@
```

---

## Task 6: Rewrite `backend/app/admin_bp.py`

**Files:**
- Rewrite: `backend/app/admin_bp.py`

- [ ] **Step 1: Replace the entire file:**

```python
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.station import Station
from app.models.user import User
from functools import wraps
import logging

admin_bp = Blueprint('admin', __name__)


def admin_required(f):
    @wraps(f)
    @jwt_required()
    def decorated(*args, **kwargs):
        user_id = int(get_jwt_identity())
        user = User.find_by_id(user_id)
        if not user or not user.is_admin:
            return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    return decorated


@admin_bp.route('/stations', methods=['POST'])
@admin_required
def create_station():
    try:
        data = request.get_json()
        for field in ['name', 'url', 'genre', 'region']:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400

        if Station.name_exists(data['name']):
            return jsonify({'error': 'Station name already exists'}), 409

        station = Station.create(
            name=data['name'],
            url=data['url'],
            genre=data['genre'],
            region=data['region'],
            description=data.get('description', ''),
            logo_url=data.get('logo_url'),
            website=data.get('website'),
            language=data.get('language', 'English'),
            frequency=data.get('frequency'),
        )
        return jsonify({'message': 'Station created successfully', 'station': station.to_dict()}), 201

    except Exception as e:
        logging.error(f"Error creating station: {e}")
        return jsonify({'error': 'Failed to create station'}), 500


@admin_bp.route('/stations/<int:station_id>', methods=['PUT'])
@admin_required
def update_station(station_id):
    try:
        station = Station.find_by_id(station_id)
        if not station:
            return jsonify({'error': 'Station not found'}), 404

        data = request.get_json()
        allowed = ['name', 'description', 'url', 'logo_url', 'website',
                   'genre', 'region', 'language', 'frequency', 'is_active', 'is_live']
        updates = {k: v for k, v in data.items() if k in allowed}

        if updates:
            station.update(**updates)

        return jsonify({'message': 'Station updated successfully', 'station': station.to_dict()})

    except Exception as e:
        logging.error(f"Error updating station {station_id}: {e}")
        return jsonify({'error': 'Failed to update station'}), 500
```

- [ ] **Step 2: Commit**

```powershell
cd c:\Users\7plus8\build\airwave
git add backend/app/admin_bp.py
git commit -m @'
feat(mongo): rewrite admin_bp.py — replace SQLAlchemy with MongoDB operations

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
'@
```

---

## Task 7: Rewrite `backend/app/analytics_bp.py`

**Files:**
- Rewrite: `backend/app/analytics_bp.py`

Replace SQLAlchemy queries with MongoDB aggregation pipelines. Keep the route signatures identical so no frontend changes are needed.

- [ ] **Step 1: Replace the entire file:**

```python
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.user import User
from app.db import get_stations_col, get_station_plays_col, get_users_col
from app import limiter
from datetime import datetime, timedelta
from functools import wraps
import logging

analytics_bp = Blueprint('analytics', __name__)


def admin_required(f):
    @wraps(f)
    @jwt_required()
    def decorated(*args, **kwargs):
        user_id = int(get_jwt_identity())
        user = User.find_by_id(user_id)
        if not user or not user.is_admin:
            return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    return decorated


def _date_range(days: int):
    end = datetime.utcnow()
    start = end - timedelta(days=days)
    return start, end


@analytics_bp.route('/dashboard', methods=['GET'])
@admin_required
@limiter.limit("30 per minute")
def get_dashboard_stats():
    try:
        days = request.args.get('days', 7, type=int)
        start, end = _date_range(days)
        prev_start = start - timedelta(days=days)

        plays_col = get_station_plays_col()
        stations_col = get_stations_col()

        total_stations = stations_col.count_documents({'is_active': True})
        live_stations  = stations_col.count_documents({'is_active': True, 'is_live': True})
        total_users    = get_users_col().count_documents({'is_active': True})

        period_match = {'played_at': {'$gte': start, '$lte': end}}
        total_plays = plays_col.count_documents(period_match)

        unique_listeners = len(plays_col.distinct('ip_address', period_match))

        duration_agg = list(plays_col.aggregate([
            {'$match': period_match},
            {'$group': {'_id': None, 'total': {'$sum': '$duration'}}},
        ]))
        total_listening_time = duration_agg[0]['total'] if duration_agg else 0
        avg_session = total_listening_time / total_plays if total_plays > 0 else 0

        prev_plays = plays_col.count_documents({'played_at': {'$gte': prev_start, '$lt': start}})
        plays_growth = ((total_plays - prev_plays) / prev_plays * 100) if prev_plays > 0 else 0

        top_stations_agg = list(plays_col.aggregate([
            {'$match': period_match},
            {'$group': {'_id': '$station_id', 'play_count': {'$sum': 1}, 'total_duration': {'$sum': '$duration'}}},
            {'$sort': {'play_count': -1}},
            {'$limit': 10},
        ]))

        top_stations_data = []
        for row in top_stations_agg:
            station = stations_col.find_one({'id': row['_id']}, {'name': 1, 'genre': 1})
            if station:
                pc = row['play_count']
                td = row.get('total_duration', 0) or 0
                top_stations_data.append({
                    'id': row['_id'],
                    'name': station['name'],
                    'genre': station.get('genre'),
                    'play_count': pc,
                    'total_duration': td,
                    'avg_duration': td / pc if pc > 0 else 0,
                })

        return jsonify({
            'overview': {
                'total_stations': total_stations,
                'live_stations': live_stations,
                'total_users': total_users,
                'total_plays': total_plays,
                'unique_listeners': unique_listeners,
                'total_listening_hours': round(total_listening_time / 3600, 2),
                'avg_session_minutes': round(avg_session / 60, 2),
                'plays_growth_percent': round(plays_growth, 2),
            },
            'top_stations': top_stations_data,
            'period': {'start_date': start.date().isoformat(), 'end_date': end.date().isoformat(), 'days': days},
        })

    except Exception as e:
        logging.error(f"Error fetching dashboard stats: {e}")
        return jsonify({'error': 'Failed to fetch dashboard statistics'}), 500


@analytics_bp.route('/real-time', methods=['GET'])
@admin_required
@limiter.limit("60 per minute")
def get_realtime_stats():
    try:
        five_min_ago = datetime.utcnow() - timedelta(minutes=5)
        plays_col = get_station_plays_col()
        stations_col = get_stations_col()
        recent_match = {'played_at': {'$gte': five_min_ago}}

        active_listeners = len(plays_col.distinct('ip_address', recent_match))

        current_agg = list(plays_col.aggregate([
            {'$match': recent_match},
            {'$group': {'_id': '$station_id', 'current_listeners': {'$addToSet': '$ip_address'}}},
            {'$project': {'current_listeners': {'$size': '$current_listeners'}}},
            {'$sort': {'current_listeners': -1}},
            {'$limit': 20},
        ]))

        current_stations_data = []
        for row in current_agg:
            station = stations_col.find_one({'id': row['_id'], 'is_active': True, 'is_live': True}, {'name': 1, 'genre': 1})
            if station:
                current_stations_data.append({
                    'id': row['_id'],
                    'name': station['name'],
                    'genre': station.get('genre'),
                    'current_listeners': row['current_listeners'],
                })

        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_match = {'played_at': {'$gte': today_start}}
        today_plays = plays_col.count_documents(today_match)
        today_unique = len(plays_col.distinct('ip_address', today_match))

        return jsonify({
            'real_time': {
                'active_listeners': active_listeners,
                'live_stations': stations_col.count_documents({'is_live': True, 'is_active': True}),
                'current_stations': current_stations_data,
            },
            'today': {'total_plays': today_plays, 'unique_listeners': today_unique},
            'timestamp': datetime.utcnow().isoformat(),
        })

    except Exception as e:
        logging.error(f"Error fetching real-time stats: {e}")
        return jsonify({'error': 'Failed to fetch real-time statistics'}), 500


@analytics_bp.route('/trends', methods=['GET'])
@admin_required
@limiter.limit("30 per minute")
def get_trends():
    try:
        days = request.args.get('days', 7, type=int)
        start, end = _date_range(days)
        prev_start = start - timedelta(days=days)
        plays_col = get_station_plays_col()
        stations_col = get_stations_col()

        cur_agg = {row['_id']: row['count'] for row in plays_col.aggregate([
            {'$match': {'played_at': {'$gte': start, '$lte': end}}},
            {'$group': {'_id': '$station_id', 'count': {'$sum': 1}}},
        ])}
        prev_agg = {row['_id']: row['count'] for row in plays_col.aggregate([
            {'$match': {'played_at': {'$gte': prev_start, '$lt': start}}},
            {'$group': {'_id': '$station_id', 'count': {'$sum': 1}}},
        ])}

        trending_data = []
        for station_id, cur_count in sorted(cur_agg.items(), key=lambda x: -x[1])[:10]:
            station = stations_col.find_one({'id': station_id}, {'name': 1, 'genre': 1})
            if not station:
                continue
            prev_count = prev_agg.get(station_id, 0)
            growth = ((cur_count - prev_count) / prev_count * 100) if prev_count > 0 else (100 if cur_count > 0 else 0)
            trending_data.append({
                'id': station_id, 'name': station['name'], 'genre': station.get('genre'),
                'current_plays': cur_count, 'prev_plays': prev_count, 'growth_percent': round(growth, 2),
            })

        return jsonify({
            'trending_stations': trending_data,
            'trending_genres': [],
            'period': {
                'current_start': start.date().isoformat(), 'current_end': end.date().isoformat(),
                'previous_start': prev_start.date().isoformat(), 'previous_end': start.date().isoformat(),
                'days': days,
            },
        })

    except Exception as e:
        logging.error(f"Error fetching trends: {e}")
        return jsonify({'error': 'Failed to fetch trends'}), 500


@analytics_bp.route('/genres', methods=['GET'])
@admin_required
@limiter.limit("30 per minute")
def get_genre_analytics():
    try:
        days = request.args.get('days', 30, type=int)
        start, end = _date_range(days)
        plays_col = get_station_plays_col()
        stations_col = get_stations_col()

        station_genre_map = {doc['id']: doc.get('genre') for doc in stations_col.find({'is_active': True}, {'id': 1, 'genre': 1})}

        agg = list(plays_col.aggregate([
            {'$match': {'played_at': {'$gte': start, '$lte': end}}},
            {'$group': {'_id': '$station_id', 'play_count': {'$sum': 1}, 'total_duration': {'$sum': '$duration'}, 'ips': {'$addToSet': '$ip_address'}}},
        ]))

        genre_data: dict = {}
        for row in agg:
            genre = station_genre_map.get(row['_id'])
            if not genre:
                continue
            if genre not in genre_data:
                genre_data[genre] = {'genre': genre, 'total_plays': 0, 'unique_listeners': set(), 'total_duration': 0, 'station_count': 0}
            genre_data[genre]['total_plays'] += row['play_count']
            genre_data[genre]['unique_listeners'].update(row.get('ips', []))
            genre_data[genre]['total_duration'] += row.get('total_duration', 0) or 0
            genre_data[genre]['station_count'] += 1

        result = [
            {
                'genre': v['genre'],
                'total_plays': v['total_plays'],
                'unique_listeners': len(v['unique_listeners']),
                'total_duration_hours': round(v['total_duration'] / 3600, 2),
                'station_count': v['station_count'],
                'avg_plays_per_station': round(v['total_plays'] / v['station_count'], 2) if v['station_count'] > 0 else 0,
            }
            for v in sorted(genre_data.values(), key=lambda x: -x['total_plays'])
        ]

        return jsonify({'genre_analytics': result, 'period': {'start_date': start.date().isoformat(), 'end_date': end.date().isoformat(), 'days': days}})

    except Exception as e:
        logging.error(f"Error fetching genre analytics: {e}")
        return jsonify({'error': 'Failed to fetch genre analytics'}), 500


@analytics_bp.route('/regions', methods=['GET'])
@admin_required
@limiter.limit("30 per minute")
def get_region_analytics():
    try:
        days = request.args.get('days', 30, type=int)
        start, end = _date_range(days)
        plays_col = get_station_plays_col()
        stations_col = get_stations_col()

        station_region_map = {doc['id']: doc.get('region') for doc in stations_col.find({'is_active': True}, {'id': 1, 'region': 1})}

        agg = list(plays_col.aggregate([
            {'$match': {'played_at': {'$gte': start, '$lte': end}}},
            {'$group': {'_id': '$station_id', 'play_count': {'$sum': 1}, 'total_duration': {'$sum': '$duration'}, 'ips': {'$addToSet': '$ip_address'}}},
        ]))

        region_data: dict = {}
        for row in agg:
            region = station_region_map.get(row['_id'])
            if not region:
                continue
            if region not in region_data:
                region_data[region] = {'region': region, 'total_plays': 0, 'unique_listeners': set(), 'total_duration': 0, 'station_count': 0}
            region_data[region]['total_plays'] += row['play_count']
            region_data[region]['unique_listeners'].update(row.get('ips', []))
            region_data[region]['total_duration'] += row.get('total_duration', 0) or 0
            region_data[region]['station_count'] += 1

        result = [
            {
                'region': v['region'],
                'total_plays': v['total_plays'],
                'unique_listeners': len(v['unique_listeners']),
                'total_duration_hours': round(v['total_duration'] / 3600, 2),
                'station_count': v['station_count'],
                'avg_plays_per_station': round(v['total_plays'] / v['station_count'], 2) if v['station_count'] > 0 else 0,
            }
            for v in sorted(region_data.values(), key=lambda x: -x['total_plays'])
        ]

        return jsonify({'region_analytics': result, 'period': {'start_date': start.date().isoformat(), 'end_date': end.date().isoformat(), 'days': days}})

    except Exception as e:
        logging.error(f"Error fetching region analytics: {e}")
        return jsonify({'error': 'Failed to fetch region analytics'}), 500


@analytics_bp.route('/stations/<int:station_id>/stats', methods=['GET'])
@admin_required
@limiter.limit("30 per minute")
def get_station_stats(station_id):
    try:
        from app.models.station import Station
        station = Station.find_by_id(station_id)
        if not station:
            return jsonify({'error': 'Station not found'}), 404

        days = request.args.get('days', 30, type=int)
        start, end = _date_range(days)
        plays_col = get_station_plays_col()
        match = {'station_id': station_id, 'played_at': {'$gte': start, '$lte': end}}

        period_plays = plays_col.count_documents(match)
        unique_listeners = len(plays_col.distinct('ip_address', match))

        dur_agg = list(plays_col.aggregate([{'$match': match}, {'$group': {'_id': None, 'total': {'$sum': '$duration'}}}]))
        total_duration = dur_agg[0]['total'] if dur_agg else 0
        avg_duration = total_duration / period_plays if period_plays > 0 else 0

        daily_agg = list(plays_col.aggregate([
            {'$match': match},
            {'$group': {
                '_id': {'$dateToString': {'format': '%Y-%m-%d', 'date': '$played_at'}},
                'plays': {'$sum': 1},
                'unique_ips': {'$addToSet': '$ip_address'},
                'total_duration': {'$sum': '$duration'},
            }},
            {'$sort': {'_id': 1}},
        ]))
        daily_data = [{'date': r['_id'], 'plays': r['plays'], 'unique_listeners': len(r['unique_ips']), 'total_duration_minutes': round((r.get('total_duration') or 0) / 60, 2)} for r in daily_agg]

        hourly_agg = list(plays_col.aggregate([
            {'$match': match},
            {'$group': {'_id': {'$hour': '$played_at'}, 'plays': {'$sum': 1}}},
            {'$sort': {'_id': 1}},
        ]))
        hourly_data = [{'hour': r['_id'], 'plays': r['plays']} for r in hourly_agg]

        return jsonify({
            'station': {'id': station.id, 'name': station.name, 'genre': station.genre, 'region': station.region},
            'stats': {
                'total_plays_all_time': station.total_plays,
                'period_plays': period_plays,
                'unique_listeners': unique_listeners,
                'total_listening_hours': round(total_duration / 3600, 2),
                'avg_session_minutes': round(avg_duration / 60, 2),
                'current_listeners': station.current_listeners,
            },
            'daily_stats': daily_data,
            'hourly_distribution': hourly_data,
            'period': {'start_date': start.date().isoformat(), 'end_date': end.date().isoformat(), 'days': days},
        })

    except Exception as e:
        logging.error(f"Error fetching station {station_id} stats: {e}")
        return jsonify({'error': 'Failed to fetch station statistics'}), 500


@analytics_bp.route('/user/<int:user_id>/listening-history', methods=['GET'])
@jwt_required()
@limiter.limit("30 per minute")
def get_user_listening_history(user_id):
    try:
        current_user_id = int(get_jwt_identity())
        current_user = User.find_by_id(current_user_id)
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        if user_id != current_user_id and not current_user.is_admin:
            return jsonify({'error': 'Access denied'}), 403

        page = max(request.args.get('page', 1, type=int), 1)
        per_page = min(request.args.get('per_page', 50, type=int), 100)

        plays_col = get_station_plays_col()
        stations_col = get_stations_col()
        match = {'user_id': user_id}

        total = plays_col.count_documents(match)
        plays = list(plays_col.find(match).sort('played_at', -1).skip((page - 1) * per_page).limit(per_page))

        station_ids = list({p['station_id'] for p in plays})
        station_map = {doc['id']: doc for doc in stations_col.find({'id': {'$in': station_ids}})}

        history_data = []
        for play in plays:
            sid = play['station_id']
            st = station_map.get(sid, {})
            history_data.append({
                'id': str(play['_id']),
                'station_id': sid,
                'station_name': st.get('name', 'Unknown'),
                'genre': st.get('genre'),
                'region': st.get('region'),
                'duration_minutes': round((play.get('duration') or 0) / 60, 2),
                'played_at': play['played_at'].isoformat(),
            })

        pages = max((total + per_page - 1) // per_page, 1)
        return jsonify({
            'listening_history': history_data,
            'stats': {'total_plays': total},
            'pagination': {'page': page, 'per_page': per_page, 'total': total, 'pages': pages, 'has_next': page < pages, 'has_prev': page > 1},
        })

    except Exception as e:
        logging.error(f"Error fetching user listening history: {e}")
        return jsonify({'error': 'Failed to fetch listening history'}), 500


@analytics_bp.route('/snapshot', methods=['POST'])
@limiter.limit("60 per minute")
def record_snapshot():
    """Lightweight endpoint called by Next.js analytics on metadata poll."""
    try:
        from app.db import get_db
        data = request.get_json() or {}
        station_id = data.get('stationId')
        if not station_id:
            return jsonify({'error': 'Missing stationId'}), 400

        from app.models.station import Station
        station = Station.find_by_id(station_id)
        if not station:
            return jsonify({'error': 'Station not found'}), 404

        get_db()['stationSnapshots'].insert_one({
            'stationId': station_id,
            'stationName': station.name,
            'listeners': data.get('listeners'),
            'isOnline': data.get('isOnline', True),
            'lastMetaSource': data.get('source'),
            'snapshotAt': datetime.utcnow(),
        })
        return jsonify({'ok': True})

    except Exception as e:
        logging.error(f"Error recording snapshot: {e}")
        return jsonify({'error': 'Failed to record snapshot'}), 500


def register_analytics_commands(app):
    pass
```

- [ ] **Step 2: Commit**

```powershell
cd c:\Users\7plus8\build\airwave
git add backend/app/analytics_bp.py
git commit -m @'
feat(mongo): rewrite analytics_bp.py — replace SQLAlchemy with MongoDB aggregations

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
'@
```

---

## Task 8: Update Pipfile, run.py, create backend/.env, and seed stations

**Files:**
- Modify: `backend/Pipfile`
- Modify: `backend/run.py`
- Create: `backend/.env`

- [ ] **Step 1: Replace `backend/Pipfile` content:**

```toml
[[source]]
url = "https://pypi.org/simple"
verify_ssl = true
name = "pypi"

[packages]
flask = "*"
flask-cors = "*"
flask-jwt-extended = "*"
flask-limiter = "*"
werkzeug = "*"
python-dotenv = "*"
pymongo = {extras = ["srv"], version = "*"}
email-validator = "*"
gunicorn = "*"
bcrypt = "*"

[dev-packages]
pytest = "*"
pytest-flask = "*"

[requires]
python_version = "3.13"

[scripts]
test = "pytest"
```

- [ ] **Step 2: Create `backend/.env` with:**

```
MONGODB_URI=mongodb://localhost:27017/airwave
FLASK_ENV=development
SECRET_KEY=dev-secret-key-change-in-production
JWT_SECRET_KEY=jwt-secret-change-in-production
FRONTEND_URL=http://localhost:3000
```

- [ ] **Step 3: Replace `backend/run.py` with:**

```python
from dotenv import load_dotenv
load_dotenv()

from app import create_app
from app.db import ensure_indexes, get_stations_col, get_users_col
from app.models.station import Station
from app.models.user import User

app = create_app()


def seed_stations():
    """Insert default stations if the collection is empty."""
    if get_stations_col().count_documents({}) > 0:
        return

    stations_data = [
        {'name': 'Capital FM', 'description': "Kenya's Number One Hit Music Station", 'url': 'https://atunwadigital.streamguys1.com/capitalfm', 'genre': 'Pop', 'region': 'Nairobi', 'frequency': '98.4 FM'},
        {'name': 'Classic 105', 'description': 'No.1 for Soul and Great Hits', 'url': 'https://atunwadigital.streamguys1.com/classic105', 'genre': 'Soul', 'region': 'Nairobi', 'frequency': '105.2 FM'},
        {'name': 'Kiss FM Kenya', 'description': 'Your Hit Music Station', 'url': 'https://atunwadigital.streamguys1.com/kissfm', 'genre': 'Pop', 'region': 'Nairobi', 'frequency': '100.3 FM'},
        {'name': 'Radio Citizen', 'description': 'Kenya\'s National Radio', 'url': 'https://stream.radioking.com/radio-citizen', 'genre': 'Talk', 'region': 'Nairobi', 'frequency': '98.4 FM'},
        {'name': 'Milele FM', 'description': 'Kiswahili Hit Music', 'url': 'https://stream.zeno.fm/milele', 'genre': 'Urban', 'region': 'Nairobi', 'frequency': '90.7 FM'},
        {'name': 'Ghetto Radio', 'description': 'Hip Hop & Urban', 'url': 'https://stream.zeno.fm/ghetto', 'genre': 'Hip Hop', 'region': 'Nairobi', 'frequency': '89.5 FM'},
    ]

    for data in stations_data:
        if not Station.find_by_name(data['name']):
            Station.create(**data)
            print(f"  Created station: {data['name']}")


def seed_admin():
    """Create admin user if none exists."""
    if get_users_col().count_documents({'is_admin': True}) > 0:
        return
    admin = User.create(email='admin@airwave.ke', username='admin', password='AdminPass123!', is_admin=True)
    print(f"  Created admin user: {admin.email}")


if __name__ == '__main__':
    print("Ensuring MongoDB indexes...")
    ensure_indexes()
    print("Seeding data...")
    seed_stations()
    seed_admin()
    print("Starting server on http://0.0.0.0:5001")
    app.run(debug=True, host='0.0.0.0', port=5001)
```

- [ ] **Step 4: Install pymongo**

```powershell
cd c:\Users\7plus8\build\airwave\backend
pipenv install pymongo 2>&1
```

Expected: pymongo installed successfully.

- [ ] **Step 5: Verify the app starts and seeds data**

```powershell
cd c:\Users\7plus8\build\airwave\backend
python run.py 2>&1
```

Expected:
```
Ensuring MongoDB indexes...
Seeding data...
  Created station: Capital FM
  ...
  Created admin user: admin@airwave.ke
Starting server on http://0.0.0.0:5001
 * Serving Flask app 'app'
```

- [ ] **Step 6: In a separate check, verify stations are returned**

```powershell
Invoke-WebRequest -Uri "http://localhost:5001/api/stations/" -UseBasicParsing | Select-Object -ExpandProperty Content
```

Expected: JSON with `{"stations": [...], "pagination": {...}}` containing the seeded stations.

- [ ] **Step 7: Commit**

```powershell
cd c:\Users\7plus8\build\airwave
git add backend/Pipfile backend/run.py backend/.env
git commit -m @'
feat(mongo): update Pipfile/run.py — pymongo only, auto-seed stations on start

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
'@
```
