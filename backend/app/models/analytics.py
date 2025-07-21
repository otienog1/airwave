from app import db
from datetime import datetime
from sqlalchemy import Index

class StationPlay(db.Model):
    __tablename__ = 'station_plays'
    
    id = db.Column(db.Integer, primary_key=True)
    station_id = db.Column(db.Integer, db.ForeignKey('stations.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # Anonymous users allowed
    ip_address = db.Column(db.String(45))  # Support IPv6
    user_agent = db.Column(db.String(500))
    duration = db.Column(db.Integer, default=0)  # Listening duration in seconds
    played_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Indexes for analytics queries
    __table_args__ = (
        Index('idx_play_station_date', 'station_id', 'played_at'),
        Index('idx_play_user_date', 'user_id', 'played_at'),
        Index('idx_play_date', 'played_at'),
    )

class Analytics(db.Model):
    __tablename__ = 'analytics'
    
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False)
    total_plays = db.Column(db.Integer, default=0)
    unique_listeners = db.Column(db.Integer, default=0)
    top_station_id = db.Column(db.Integer, db.ForeignKey('stations.id'))
    total_listening_time = db.Column(db.Integer, default=0)  # Total minutes
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Unique constraint for date
    __table_args__ = (db.UniqueConstraint('date'),)