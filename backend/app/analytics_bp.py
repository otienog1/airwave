# app/blueprints/analytics.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.station import Station, StationPlay, User, Analytics
from app import db, limiter
from sqlalchemy import func, desc, and_, or_
from datetime import datetime, timedelta, date
from collections import defaultdict
import logging

analytics_bp = Blueprint('analytics', __name__)

def admin_required(f):
    """Decorator to require admin access"""
    from functools import wraps
    
    @wraps(f)
    @jwt_required()
    def decorated_function(*args, **kwargs):
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user or not user.is_admin:
            return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    return decorated_function

@analytics_bp.route('/dashboard', methods=['GET'])
@admin_required
@limiter.limit("30 per minute")
def get_dashboard_stats():
    """Get comprehensive dashboard statistics"""
    try:
        # Date range parameters
        days = request.args.get('days', 7, type=int)
        end_date = datetime.utcnow().date()
        start_date = end_date - timedelta(days=days)
        
        # Basic counts
        total_stations = Station.query.filter_by(is_active=True).count()
        total_users = User.query.filter_by(is_active=True).count()
        live_stations = Station.query.filter_by(is_active=True, is_live=True).count()
        
        # Play statistics for the period
        plays_query = StationPlay.query.filter(
            StationPlay.played_at >= start_date,
            StationPlay.played_at <= end_date
        )
        
        total_plays = plays_query.count()
        unique_listeners = plays_query.with_entities(
            StationPlay.ip_address
        ).distinct().count()
        
        # Total listening time (sum of all play durations)
        total_listening_time = db.session.query(
            func.sum(StationPlay.duration)
        ).filter(
            StationPlay.played_at >= start_date,
            StationPlay.played_at <= end_date
        ).scalar() or 0
        
        # Average session duration
        avg_session_duration = total_listening_time / total_plays if total_plays > 0 else 0
        
        # Growth metrics (compare with previous period)
        prev_start = start_date - timedelta(days=days)
        prev_end = start_date
        
        prev_plays = StationPlay.query.filter(
            StationPlay.played_at >= prev_start,
            StationPlay.played_at < prev_end
        ).count()
        
        plays_growth = ((total_plays - prev_plays) / prev_plays * 100) if prev_plays > 0 else 0
        
        # Top stations by plays
        top_stations = db.session.query(
            Station.id,
            Station.name,
            Station.genre,
            func.count(StationPlay.id).label('play_count'),
            func.sum(StationPlay.duration).label('total_duration')
        ).join(StationPlay).filter(
            StationPlay.played_at >= start_date,
            StationPlay.played_at <= end_date
        ).group_by(Station.id, Station.name, Station.genre).order_by(
            desc('play_count')
        ).limit(10).all()
        
        top_stations_data = [
            {
                'id': station.id,
                'name': station.name,
                'genre': station.genre,
                'play_count': station.play_count,
                'total_duration': station.total_duration or 0,
                'avg_duration': (station.total_duration or 0) / station.play_count if station.play_count > 0 else 0
            }
            for station in top_stations
        ]
        
        return jsonify({
            'overview': {
                'total_stations': total_stations,
                'live_stations': live_stations,
                'total_users': total_users,
                'total_plays': total_plays,
                'unique_listeners': unique_listeners,
                'total_listening_hours': round(total_listening_time / 3600, 2),
                'avg_session_minutes': round(avg_session_duration / 60, 2),
                'plays_growth_percent': round(plays_growth, 2)
            },
            'top_stations': top_stations_data,
            'period': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'days': days
            }
        })
        
    except Exception as e:
        logging.error(f"Error fetching dashboard stats: {str(e)}")
        return jsonify({'error': 'Failed to fetch dashboard statistics'}), 500

@analytics_bp.route('/stations/<int:station_id>/stats', methods=['GET'])
@admin_required
@limiter.limit("30 per minute")
def get_station_stats(station_id):
    """Get detailed statistics for a specific station"""
    try:
        station = Station.query.get_or_404(station_id)
        
        # Date range parameters
        days = request.args.get('days', 30, type=int)
        end_date = datetime.utcnow().date()
        start_date = end_date - timedelta(days=days)
        
        # Basic station stats
        total_plays = StationPlay.query.filter_by(station_id=station_id).count()
        period_plays = StationPlay.query.filter(
            StationPlay.station_id == station_id,
            StationPlay.played_at >= start_date,
            StationPlay.played_at <= end_date
        ).count()
        
        # Unique listeners
        unique_listeners = StationPlay.query.filter(
            StationPlay.station_id == station_id,
            StationPlay.played_at >= start_date,
            StationPlay.played_at <= end_date
        ).with_entities(StationPlay.ip_address).distinct().count()
        
        # Total listening time
        total_duration = db.session.query(
            func.sum(StationPlay.duration)
        ).filter(
            StationPlay.station_id == station_id,
            StationPlay.played_at >= start_date,
            StationPlay.played_at <= end_date
        ).scalar() or 0
        
        # Average session duration
        avg_duration = total_duration / period_plays if period_plays > 0 else 0
        
        # Daily plays for the period
        daily_stats = db.session.query(
            func.date(StationPlay.played_at).label('date'),
            func.count(StationPlay.id).label('plays'),
            func.count(StationPlay.ip_address.distinct()).label('unique_listeners'),
            func.sum(StationPlay.duration).label('total_duration')
        ).filter(
            StationPlay.station_id == station_id,
            StationPlay.played_at >= start_date,
            StationPlay.played_at <= end_date
        ).group_by(func.date(StationPlay.played_at)).order_by('date').all()
        
        daily_data = [
            {
                'date': stat.date.isoformat(),
                'plays': stat.plays,
                'unique_listeners': stat.unique_listeners,
                'total_duration_minutes': round((stat.total_duration or 0) / 60, 2)
            }
            for stat in daily_stats
        ]
        
        # Hourly distribution (peak listening times)
        hourly_stats = db.session.query(
            func.extract('hour', StationPlay.played_at).label('hour'),
            func.count(StationPlay.id).label('plays')
        ).filter(
            StationPlay.station_id == station_id,
            StationPlay.played_at >= start_date,
            StationPlay.played_at <= end_date
        ).group_by(func.extract('hour', StationPlay.played_at)).order_by('hour').all()
        
        hourly_data = [
            {
                'hour': int(stat.hour),
                'plays': stat.plays
            }
            for stat in hourly_stats
        ]
        
        return jsonify({
            'station': {
                'id': station.id,
                'name': station.name,
                'genre': station.genre,
                'region': station.region
            },
            'stats': {
                'total_plays_all_time': total_plays,
                'period_plays': period_plays,
                'unique_listeners': unique_listeners,
                'total_listening_hours': round(total_duration / 3600, 2),
                'avg_session_minutes': round(avg_duration / 60, 2),
                'current_listeners': station.current_listeners or 0
            },
            'daily_stats': daily_data,
            'hourly_distribution': hourly_data,
            'period': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'days': days
            }
        })
        
    except Exception as e:
        logging.error(f"Error fetching station {station_id} stats: {str(e)}")
        return jsonify({'error': 'Failed to fetch station statistics'}), 500

@analytics_bp.route('/genres', methods=['GET'])
@admin_required
@limiter.limit("30 per minute")
def get_genre_analytics():
    """Get analytics by genre"""
    try:
        # Date range parameters
        days = request.args.get('days', 30, type=int)
        end_date = datetime.utcnow().date()
        start_date = end_date - timedelta(days=days)
        
        # Genre popularity
        genre_stats = db.session.query(
            Station.genre,
            func.count(StationPlay.id).label('total_plays'),
            func.count(StationPlay.ip_address.distinct()).label('unique_listeners'),
            func.sum(StationPlay.duration).label('total_duration'),
            func.count(Station.id.distinct()).label('station_count')
        ).join(StationPlay).filter(
            StationPlay.played_at >= start_date,
            StationPlay.played_at <= end_date,
            Station.is_active == True
        ).group_by(Station.genre).order_by(desc('total_plays')).all()
        
        genre_data = [
            {
                'genre': stat.genre,
                'total_plays': stat.total_plays,
                'unique_listeners': stat.unique_listeners,
                'total_duration_hours': round((stat.total_duration or 0) / 3600, 2),
                'station_count': stat.station_count,
                'avg_plays_per_station': round(stat.total_plays / stat.station_count, 2) if stat.station_count > 0 else 0
            }
            for stat in genre_stats
        ]
        
        return jsonify({
            'genre_analytics': genre_data,
            'period': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'days': days
            }
        })
        
    except Exception as e:
        logging.error(f"Error fetching genre analytics: {str(e)}")
        return jsonify({'error': 'Failed to fetch genre analytics'}), 500

@analytics_bp.route('/regions', methods=['GET'])
@admin_required
@limiter.limit("30 per minute")
def get_region_analytics():
    """Get analytics by region"""
    try:
        # Date range parameters
        days = request.args.get('days', 30, type=int)
        end_date = datetime.utcnow().date()
        start_date = end_date - timedelta(days=days)
        
        # Regional popularity
        region_stats = db.session.query(
            Station.region,
            func.count(StationPlay.id).label('total_plays'),
            func.count(StationPlay.ip_address.distinct()).label('unique_listeners'),
            func.sum(StationPlay.duration).label('total_duration'),
            func.count(Station.id.distinct()).label('station_count')
        ).join(StationPlay).filter(
            StationPlay.played_at >= start_date,
            StationPlay.played_at <= end_date,
            Station.is_active == True
        ).group_by(Station.region).order_by(desc('total_plays')).all()
        
        region_data = [
            {
                'region': stat.region,
                'total_plays': stat.total_plays,
                'unique_listeners': stat.unique_listeners,
                'total_duration_hours': round((stat.total_duration or 0) / 3600, 2),
                'station_count': stat.station_count,
                'avg_plays_per_station': round(stat.total_plays / stat.station_count, 2) if stat.station_count > 0 else 0
            }
            for stat in region_stats
        ]
        
        return jsonify({
            'region_analytics': region_data,
            'period': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'days': days
            }
        })
        
    except Exception as e:
        logging.error(f"Error fetching region analytics: {str(e)}")
        return jsonify({'error': 'Failed to fetch region analytics'}), 500

@analytics_bp.route('/real-time', methods=['GET'])
@admin_required
@limiter.limit("60 per minute")
def get_realtime_stats():
    """Get real-time statistics"""
    try:
        # Current active listeners (played in last 5 minutes)
        five_minutes_ago = datetime.utcnow() - timedelta(minutes=5)
        
        active_listeners = StationPlay.query.filter(
            StationPlay.played_at >= five_minutes_ago
        ).with_entities(StationPlay.ip_address).distinct().count()
        
        # Currently playing stations (with recent activity)
        current_stations = db.session.query(
            Station.id,
            Station.name,
            Station.genre,
            func.count(StationPlay.ip_address.distinct()).label('current_listeners')
        ).join(StationPlay).filter(
            StationPlay.played_at >= five_minutes_ago,
            Station.is_active == True,
            Station.is_live == True
        ).group_by(Station.id, Station.name, Station.genre).order_by(
            desc('current_listeners')
        ).limit(20).all()
        
        current_stations_data = [
            {
                'id': station.id,
                'name': station.name,
                'genre': station.genre,
                'current_listeners': station.current_listeners
            }
            for station in current_stations
        ]
        
        # Update current_listeners in Station table
        for station_data in current_stations_data:
            station = Station.query.get(station_data['id'])
            if station:
                station.current_listeners = station_data['current_listeners']
        
        db.session.commit()
        
        # Today's stats
        today = datetime.utcnow().date()
        today_plays = StationPlay.query.filter(
            func.date(StationPlay.played_at) == today
        ).count()
        
        today_unique_listeners = StationPlay.query.filter(
            func.date(StationPlay.played_at) == today
        ).with_entities(StationPlay.ip_address).distinct().count()
        
        return jsonify({
            'real_time': {
                'active_listeners': active_listeners,
                'live_stations': Station.query.filter_by(is_live=True, is_active=True).count(),
                'current_stations': current_stations_data
            },
            'today': {
                'total_plays': today_plays,
                'unique_listeners': today_unique_listeners
            },
            'timestamp': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logging.error(f"Error fetching real-time stats: {str(e)}")
        return jsonify({'error': 'Failed to fetch real-time statistics'}), 500

@analytics_bp.route('/user/<int:user_id>/listening-history', methods=['GET'])
@jwt_required()
@limiter.limit("30 per minute")
def get_user_listening_history(user_id):
    """Get user's listening history"""
    try:
        current_user_id = get_jwt_identity()
        
        # Users can only see their own history, admins can see any user's history
        user = User.query.get(current_user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        if user_id != current_user_id and not user.is_admin:
            return jsonify({'error': 'Access denied'}), 403
        
        # Pagination parameters
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 50, type=int), 100)
        
        # Get listening history
        history_query = db.session.query(
            StationPlay,
            Station.name,
            Station.genre,
            Station.region
        ).join(Station).filter(
            StationPlay.user_id == user_id
        ).order_by(desc(StationPlay.played_at))
        
        history_page = history_query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        history_data = [
            {
                'id': play.StationPlay.id,
                'station_id': play.StationPlay.station_id,
                'station_name': play.name,
                'genre': play.genre,
                'region': play.region,
                'duration_minutes': round((play.StationPlay.duration or 0) / 60, 2),
                'played_at': play.StationPlay.played_at.isoformat()
            }
            for play in history_page.items
        ]
        
        # User listening stats
        total_plays = StationPlay.query.filter_by(user_id=user_id).count()
        total_listening_time = db.session.query(
            func.sum(StationPlay.duration)
        ).filter_by(user_id=user_id).scalar() or 0
        
        # Favorite genres
        favorite_genres = db.session.query(
            Station.genre,
            func.count(StationPlay.id).label('play_count')
        ).join(StationPlay).filter(
            StationPlay.user_id == user_id
        ).group_by(Station.genre).order_by(desc('play_count')).limit(5).all()
        
        favorite_genres_data = [
            {
                'genre': genre.genre,
                'play_count': genre.play_count
            }
            for genre in favorite_genres
        ]
        
        return jsonify({
            'listening_history': history_data,
            'stats': {
                'total_plays': total_plays,
                'total_listening_hours': round(total_listening_time / 3600, 2),
                'favorite_genres': favorite_genres_data
            },
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': history_page.total,
                'pages': history_page.pages,
                'has_next': history_page.has_next,
                'has_prev': history_page.has_prev
            }
        })
        
    except Exception as e:
        logging.error(f"Error fetching user listening history: {str(e)}")
        return jsonify({'error': 'Failed to fetch listening history'}), 500

@analytics_bp.route('/export', methods=['GET'])
@admin_required
@limiter.limit("5 per minute")
def export_analytics():
    """Export analytics data as CSV"""
    try:
        from flask import make_response
        import csv
        from io import StringIO
        
        # Date range parameters
        days = request.args.get('days', 30, type=int)
        export_type = request.args.get('type', 'plays')  # plays, stations, users
        end_date = datetime.utcnow().date()
        start_date = end_date - timedelta(days=days)
        
        output = StringIO()
        
        if export_type == 'plays':
            # Export play data
            plays = db.session.query(
                StationPlay.played_at,
                Station.name,
                Station.genre,
                Station.region,
                StationPlay.duration,
                StationPlay.ip_address,
                User.username
            ).join(Station).outerjoin(User).filter(
                StationPlay.played_at >= start_date,
                StationPlay.played_at <= end_date
            ).order_by(desc(StationPlay.played_at)).all()
            
            writer = csv.writer(output)
            writer.writerow(['Date', 'Time', 'Station', 'Genre', 'Region', 'Duration (seconds)', 'IP Address', 'Username'])
            
            for play in plays:
                writer.writerow([
                    play.played_at.date(),
                    play.played_at.time(),
                    play.name,
                    play.genre,
                    play.region,
                    play.duration or 0,
                    play.ip_address,
                    play.username or 'Anonymous'
                ])
                
        elif export_type == 'stations':
            # Export station statistics
            stations = db.session.query(
                Station.name,
                Station.genre,
                Station.region,
                Station.is_active,
                Station.is_live,
                Station.total_plays,
                Station.current_listeners,
                func.count(StationPlay.id).label('period_plays')
            ).outerjoin(StationPlay).filter(
                or_(StationPlay.played_at.is_(None), 
                    and_(StationPlay.played_at >= start_date, StationPlay.played_at <= end_date))
            ).group_by(Station.id).all()
            
            writer = csv.writer(output)
            writer.writerow(['Station', 'Genre', 'Region', 'Active', 'Live', 'Total Plays', 'Current Listeners', 'Period Plays'])
            
            for station in stations:
                writer.writerow([
                    station.name,
                    station.genre,
                    station.region,
                    station.is_active,
                    station.is_live,
                    station.total_plays,
                    station.current_listeners or 0,
                    station.period_plays
                ])
        
        response = make_response(output.getvalue())
        response.headers['Content-Type'] = 'text/csv'
        response.headers['Content-Disposition'] = f'attachment; filename=airwave_analytics_{export_type}_{start_date}_to_{end_date}.csv'
        
        return response
        
    except Exception as e:
        logging.error(f"Error exporting analytics: {str(e)}")
        return jsonify({'error': 'Failed to export analytics'}), 500

@analytics_bp.route('/trends', methods=['GET'])
@admin_required
@limiter.limit("30 per minute")
def get_trends():
    """Get trending stations and genres"""
    try:
        # Date range for trending calculation
        days = request.args.get('days', 7, type=int)
        end_date = datetime.utcnow().date()
        start_date = end_date - timedelta(days=days)
        
        # Previous period for comparison
        prev_start = start_date - timedelta(days=days)
        prev_end = start_date
        
        # Trending stations (comparing current period vs previous period)
        current_plays = db.session.query(
            Station.id,
            Station.name,
            Station.genre,
            func.count(StationPlay.id).label('current_plays')
        ).join(StationPlay).filter(
            StationPlay.played_at >= start_date,
            StationPlay.played_at <= end_date
        ).group_by(Station.id, Station.name, Station.genre).subquery()
        
        prev_plays = db.session.query(
            Station.id,
            func.count(StationPlay.id).label('prev_plays')
        ).join(StationPlay).filter(
            StationPlay.played_at >= prev_start,
            StationPlay.played_at < prev_end
        ).group_by(Station.id).subquery()
        
        trending_stations = db.session.query(
            current_plays.c.id,
            current_plays.c.name,
            current_plays.c.genre,
            current_plays.c.current_plays,
            func.coalesce(prev_plays.c.prev_plays, 0).label('prev_plays')
        ).outerjoin(
            prev_plays, current_plays.c.id == prev_plays.c.id
        ).order_by(desc(current_plays.c.current_plays)).limit(10).all()
        
        trending_data = []
        for station in trending_stations:
            growth = 0
            if station.prev_plays > 0:
                growth = ((station.current_plays - station.prev_plays) / station.prev_plays) * 100
            elif station.current_plays > 0:
                growth = 100  # New station or first plays
                
            trending_data.append({
                'id': station.id,
                'name': station.name,
                'genre': station.genre,
                'current_plays': station.current_plays,
                'prev_plays': station.prev_plays,
                'growth_percent': round(growth, 2)
            })
        
        # Trending genres
        current_genre_plays = db.session.query(
            Station.genre,
            func.count(StationPlay.id).label('current_plays')
        ).join(StationPlay).filter(
            StationPlay.played_at >= start_date,
            StationPlay.played_at <= end_date
        ).group_by(Station.genre).all()
        
        prev_genre_plays = db.session.query(
            Station.genre,
            func.count(StationPlay.id).label('prev_plays')
        ).join(StationPlay).filter(
            StationPlay.played_at >= prev_start,
            StationPlay.played_at < prev_end
        ).group_by(Station.genre).all()
        
        # Convert to dictionaries for easier lookup
        prev_genre_dict = {genre.genre: genre.prev_plays for genre in prev_genre_plays}
        
        trending_genres = []
        for genre in current_genre_plays:
            prev_count = prev_genre_dict.get(genre.genre, 0)
            growth = 0
            if prev_count > 0:
                growth = ((genre.current_plays - prev_count) / prev_count) * 100
            elif genre.current_plays > 0:
                growth = 100
                
            trending_genres.append({
                'genre': genre.genre,
                'current_plays': genre.current_plays,
                'prev_plays': prev_count,
                'growth_percent': round(growth, 2)
            })
        
        # Sort by growth percentage
        trending_genres.sort(key=lambda x: x['growth_percent'], reverse=True)
        
        return jsonify({
            'trending_stations': trending_data,
            'trending_genres': trending_genres[:10],
            'period': {
                'current_start': start_date.isoformat(),
                'current_end': end_date.isoformat(),
                'previous_start': prev_start.isoformat(),
                'previous_end': prev_end.isoformat(),
                'days': days
            }
        })
        
    except Exception as e:
        logging.error(f"Error fetching trends: {str(e)}")
        return jsonify({'error': 'Failed to fetch trends'}), 500

# Background task to update daily analytics (run with Celery or similar)
def update_daily_analytics():
    """Update daily analytics summary (should be run as a scheduled task)"""
    try:
        yesterday = date.today() - timedelta(days=1)
        
        # Check if analytics already exist for yesterday
        existing = Analytics.query.filter_by(date=yesterday).first()
        if existing:
            return  # Already processed
        
        # Calculate yesterday's statistics
        start_datetime = datetime.combine(yesterday, datetime.min.time())
        end_datetime = datetime.combine(yesterday, datetime.max.time())
        
        total_plays = StationPlay.query.filter(
            StationPlay.played_at >= start_datetime,
            StationPlay.played_at <= end_datetime
        ).count()
        
        unique_listeners = StationPlay.query.filter(
            StationPlay.played_at >= start_datetime,
            StationPlay.played_at <= end_datetime
        ).with_entities(StationPlay.ip_address).distinct().count()
        
        total_listening_time = db.session.query(
            func.sum(StationPlay.duration)
        ).filter(
            StationPlay.played_at >= start_datetime,
            StationPlay.played_at <= end_datetime
        ).scalar() or 0
        
        # Get top station for the day
        top_station = db.session.query(
            Station.id,
            func.count(StationPlay.id).label('play_count')
        ).join(StationPlay).filter(
            StationPlay.played_at >= start_datetime,
            StationPlay.played_at <= end_datetime
        ).group_by(Station.id).order_by(desc('play_count')).first()
        
        # Create analytics record
        analytics = Analytics(
            date=yesterday,
            total_plays=total_plays,
            unique_listeners=unique_listeners,
            top_station_id=top_station.id if top_station else None,
            total_listening_time=int(total_listening_time / 60)  # Convert to minutes
        )
        
        db.session.add(analytics)
        db.session.commit()
        
        logging.info(f"Updated analytics for {yesterday}")
        
    except Exception as e:
        logging.error(f"Error updating daily analytics: {str(e)}")
        db.session.rollback()

# CLI command to run analytics update
def register_analytics_commands(app):
    """Register CLI commands for analytics"""
    
    @app.cli.command()
    def update_analytics():
        """Update daily analytics"""
        update_daily_analytics()
        print("Daily analytics updated successfully!")
    
    @app.cli.command()
    def backfill_analytics():
        """Backfill analytics for missing days"""
        from datetime import date, timedelta
        
        # Backfill last 30 days
        for i in range(30):
            target_date = date.today() - timedelta(days=i+1)
            
            existing = Analytics.query.filter_by(date=target_date).first()
            if not existing:
                # Temporarily set date for processing
                original_date = date.today
                date.today = lambda: target_date + timedelta(days=1)
                update_daily_analytics()
                date.today = original_date
                
        print("Analytics backfill completed!")