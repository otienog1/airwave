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
