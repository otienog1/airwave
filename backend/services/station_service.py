from app.models.station import Station
from app import db
from sqlalchemy import func

class StationService:
    @staticmethod
    def get_stations(filters=None, page=1, per_page=20, include_stats=False):
        query = Station.query.filter_by(is_active=True)
        
        if filters:
            if filters.get('genre'):
                query = query.filter_by(genre=filters['genre'])
            if filters.get('region'):
                query = query.filter_by(region=filters['region'])
            if filters.get('search'):
                search = f"%{filters['search']}%"
                query = query.filter(
                    db.or_(
                        Station.name.ilike(search),
                        Station.description.ilike(search)
                    )
                )
        
        query = query.order_by(Station.total_plays.desc(), Station.name.asc())
        return query.paginate(page=page, per_page=min(per_page, 100), error_out=False)
    
    @staticmethod
    def get_station_by_id(station_id):
        return Station.query.get_or_404(station_id)
    
    @staticmethod
    def create_station(data):
        station = Station(**data)
        db.session.add(station)
        db.session.commit()
        return station
    
    @staticmethod
    def update_station(station_id, data):
        station = Station.query.get_or_404(station_id)
        for key, value in data.items():
            setattr(station, key, value)
        db.session.commit()
        return station