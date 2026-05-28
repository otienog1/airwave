from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.station import Station, StationPlay, Favorite
from app import db, limiter
from sqlalchemy import func
import logging

stations_bp = Blueprint('stations', __name__)

@stations_bp.route('/', methods=['GET'])
@limiter.limit("60 per minute")
def get_stations():
    """Get all active stations with optional filtering"""
    try:
        # Query parameters
        genre = request.args.get('genre')
        region = request.args.get('region')
        search = request.args.get('search')
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        include_stats = request.args.get('include_stats', 'false').lower() == 'true'
        
        # Build query
        query = Station.query.filter_by(is_active=True)
        
        if genre and genre.lower() != 'all':
            query = query.filter_by(genre=genre)
        
        if region and region.lower() != 'all':
            query = query.filter_by(region=region)
        
        if search:
            query = query.filter(
                db.or_(
                    Station.name.ilike(f'%{search}%'),
                    Station.description.ilike(f'%{search}%')
                )
            )
        
        # Order by popularity (total plays) and then by name
        query = query.order_by(Station.total_plays.desc(), Station.name.asc())
        
        # Paginate
        stations_page = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        stations_data = [station.to_dict(include_stats=include_stats) 
                        for station in stations_page.items]
        
        return jsonify({
            'stations': stations_data,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': stations_page.total,
                'pages': stations_page.pages,
                'has_next': stations_page.has_next,
                'has_prev': stations_page.has_prev
            }
        })
        
    except Exception as e:
        logging.error(f"Error fetching stations: {str(e)}")
        return jsonify({'error': 'Failed to fetch stations'}), 500

@stations_bp.route('/<int:station_id>', methods=['GET'])
@limiter.limit("30 per minute")
def get_station(station_id):
    """Get a specific station by ID"""
    try:
        station = Station.query.get_or_404(station_id)
        
        if not station.is_active:
            return jsonify({'error': 'Station not found'}), 404
        
        return jsonify({'station': station.to_dict(include_stats=True)})
        
    except Exception as e:
        logging.error(f"Error fetching station {station_id}: {str(e)}")
        return jsonify({'error': 'Failed to fetch station'}), 500

@stations_bp.route('/<int:station_id>/play', methods=['POST'])
@jwt_required(optional=True)
@limiter.limit("10 per minute")
def play_station(station_id):
    """Record a station play event"""
    try:
        station = Station.query.get_or_404(station_id)
        
        if not station.is_active or not station.is_live:
            return jsonify({'error': 'Station not available'}), 400
        
        # Get user if authenticated
        user_id = get_jwt_identity()
        
        # Create play record
        play = StationPlay(
            station_id=station_id,
            user_id=user_id,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent', '')[:500]
        )
        
        db.session.add(play)
        
        # Increment station play count
        station.increment_play_count()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Play recorded successfully',
            'station': station.to_dict(include_stats=True)
        })
        
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error recording play for station {station_id}: {str(e)}")
        return jsonify({'error': 'Failed to record play'}), 500

@stations_bp.route('/favorites', methods=['GET'])
@jwt_required()
def get_user_favorites():
    """Get user's favorite stations"""
    try:
        user_id = get_jwt_identity()
        
        favorites = db.session.query(Station).join(Favorite).filter(
            Favorite.user_id == user_id,
            Station.is_active == True
        ).order_by(Favorite.created_at.desc()).all()
        
        return jsonify({
            'favorites': [station.to_dict(include_stats=True) for station in favorites]
        })
        
    except Exception as e:
        logging.error(f"Error fetching favorites: {str(e)}")
        return jsonify({'error': 'Failed to fetch favorites'}), 500

@stations_bp.route('/<int:station_id>/favorite', methods=['POST'])
@jwt_required()
@limiter.limit("20 per minute")
def toggle_favorite(station_id):
    """Add or remove station from favorites"""
    try:
        user_id = get_jwt_identity()
        station = Station.query.get_or_404(station_id)
        
        favorite = Favorite.query.filter_by(
            user_id=user_id, 
            station_id=station_id
        ).first()
        
        if favorite:
            # Remove from favorites
            db.session.delete(favorite)
            is_favorited = False
            message = 'Station removed from favorites'
        else:
            # Add to favorites
            favorite = Favorite(user_id=user_id, station_id=station_id)
            db.session.add(favorite)
            is_favorited = True
            message = 'Station added to favorites'
        
        db.session.commit()
        
        return jsonify({
            'message': message,
            'is_favorited': is_favorited,
            'station': station.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error toggling favorite for station {station_id}: {str(e)}")
        return jsonify({'error': 'Failed to update favorite'}), 500

@stations_bp.route('/genres', methods=['GET'])
@limiter.limit("30 per minute")
def get_genres():
    """Get all available genres"""
    try:
        genres = db.session.query(Station.genre).filter_by(is_active=True).distinct().all()
        genre_list = [genre[0] for genre in genres if genre[0]]
        
        return jsonify({'genres': sorted(genre_list)})
        
    except Exception as e:
        logging.error(f"Error fetching genres: {str(e)}")
        return jsonify({'error': 'Failed to fetch genres'}), 500

@stations_bp.route('/regions', methods=['GET'])
@limiter.limit("30 per minute")
def get_regions():
    """Get all available regions"""
    try:
        regions = db.session.query(Station.region).filter_by(is_active=True).distinct().all()
        region_list = [region[0] for region in regions if region[0]]
        
        return jsonify({'regions': sorted(region_list)})
        
    except Exception as e:
        logging.error(f"Error fetching regions: {str(e)}")
        return jsonify({'error': 'Failed to fetch regions'}), 500