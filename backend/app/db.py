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

def get_plays_col() -> Collection:
    return get_db()['plays']

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

def ensure_counters() -> None:
    """Sync counters to max existing IDs to prevent collisions after manual inserts."""
    col = get_counters_col()
    for name, collection in (('user', get_users_col()), ('station', get_stations_col())):
        top = collection.find_one({}, sort=[(name if name == 'station' else 'id', DESCENDING)])
        max_id = top['id'] if top and 'id' in top else 0
        col.update_one({'_id': name}, {'$max': {'seq': max_id}}, upsert=True)

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

