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
