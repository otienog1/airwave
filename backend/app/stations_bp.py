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
