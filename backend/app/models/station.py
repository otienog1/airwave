from .user import User
from .analytics import Analytics, StationPlay
from .favorites import Favorite

__all__ = ['Station', 'User', 'Analytics', 'StationPlay', 'Favorite']

# app/models/station.py
from app import db
from datetime import datetime
from sqlalchemy import Index

class Station(db.Model):
    __tablename__ = 'stations'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    description = db.Column(db.Text)
    url = db.Column(db.String(500), nullable=False)
    logo_url = db.Column(db.String(500))
    website = db.Column(db.String(200))
    genre = db.Column(db.String(50), nullable=False)
    region = db.Column(db.String(50), nullable=False)
    language = db.Column(db.String(30), default='English')
    frequency = db.Column(db.String(20))  # FM frequency if applicable
    is_active = db.Column(db.Boolean, default=True)
    is_live = db.Column(db.Boolean, default=True)
    current_listeners = db.Column(db.Integer, default=0)
    total_plays = db.Column(db.Integer, default=0)
    rating = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    plays = db.relationship('StationPlay', backref='station', lazy='dynamic', cascade='all, delete-orphan')
    favorites = db.relationship('Favorite', backref='station', lazy='dynamic', cascade='all, delete-orphan')
    
    # Indexes for better query performance
    __table_args__ = (
        Index('idx_station_genre', 'genre'),
        Index('idx_station_region', 'region'),
        Index('idx_station_active', 'is_active'),
        Index('idx_station_created', 'created_at'),
    )
    
    def to_dict(self, include_stats=False):
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
            'updated_at': self.updated_at.isoformat()
        }
        
        if include_stats:
            data.update({
                'current_listeners': self.current_listeners,
                'total_plays': self.total_plays,
                'rating': self.rating,
                'favorites_count': self.favorites.count()
            })
            
        return data
    
    @classmethod
    def get_by_genre(cls, genre):
        return cls.query.filter_by(genre=genre, is_active=True).all()
    
    @classmethod
    def get_by_region(cls, region):
        return cls.query.filter_by(region=region, is_active=True).all()
    
    @classmethod
    def search(cls, query):
        return cls.query.filter(
            db.or_(
                cls.name.ilike(f'%{query}%'),
                cls.description.ilike(f'%{query}%')
            ),
            cls.is_active == True
        ).all()
    
    def increment_play_count(self):
        self.total_plays += 1
        db.session.commit()