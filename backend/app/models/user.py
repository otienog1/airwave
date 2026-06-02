from datetime import datetime, timedelta
import secrets
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
    def find_by_google_id(cls, google_id: str) -> 'User | None':
        doc = get_users_col().find_one({'google_id': google_id})
        return cls(doc) if doc else None

    @classmethod
    def create_google_user(cls, email: str, username: str, google_id: str) -> 'User':
        col = get_users_col()
        now = datetime.utcnow()
        doc = {
            'id': get_next_id('user'),
            'email': email.lower().strip(),
            'username': username.strip(),
            'password_hash': None,
            'google_id': google_id,
            'is_admin': False,
            'is_active': True,
            'favorite_station_ids': [],
            'last_login': now,
            'created_at': now,
        }
        col.insert_one(doc)
        return cls(doc)

    def link_google_id(self, google_id: str) -> None:
        get_users_col().update_one({'id': self.id}, {'$set': {'google_id': google_id}})
        self._doc['google_id'] = google_id

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

    def update_profile(self, username: str = None, email: str = None) -> None:
        updates = {}
        if username is not None:
            updates['username'] = username.strip()
            self._doc['username'] = username.strip()
        if email is not None:
            updates['email'] = email.lower().strip()
            self._doc['email'] = email.lower().strip()
        if updates:
            get_users_col().update_one({'id': self.id}, {'$set': updates})

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

    def set_reset_token(self) -> str:
        token = secrets.token_urlsafe(32)
        expires = datetime.utcnow() + timedelta(hours=1)
        get_users_col().update_one(
            {'id': self.id},
            {'$set': {'reset_token': token, 'reset_token_expires': expires}},
        )
        return token

    def update_password(self, new_password: str) -> None:
        get_users_col().update_one(
            {'id': self.id},
            {
                '$set': {'password_hash': generate_password_hash(new_password)},
                '$unset': {'reset_token': '', 'reset_token_expires': ''},
            },
        )

    @classmethod
    def find_by_reset_token(cls, token: str) -> 'User | None':
        doc = get_users_col().find_one({
            'reset_token': token,
            'reset_token_expires': {'$gt': datetime.utcnow()},
        })
        return cls(doc) if doc else None
