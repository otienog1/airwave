from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.station import Station
from app.models.user import User
from app.db import get_stations_col
from functools import wraps
import logging

admin_bp = Blueprint('admin', __name__)


def admin_required(f):
    @wraps(f)
    @jwt_required()
    def decorated(*args, **kwargs):
        user_id = int(get_jwt_identity())
        user = User.find_by_id(user_id)
        if not user or not user.is_admin:
            return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    return decorated


@admin_bp.route('/stations', methods=['GET', 'POST'])
@admin_required
def stations_collection():
    if request.method == 'GET':
        try:
            docs = list(get_stations_col().find().sort([('total_plays', -1), ('name', 1)]))
            return jsonify({'stations': [Station(doc).to_dict(include_stats=True) for doc in docs]})
        except Exception as e:
            logging.error(f"Error listing stations: {e}")
            return jsonify({'error': 'Failed to fetch stations'}), 500

    # POST — create
    try:
        data = request.get_json()
        for field in ['name', 'url', 'genre', 'region']:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400

        if Station.name_exists(data['name']):
            return jsonify({'error': 'Station name already exists'}), 409

        station = Station.create(
            name=data['name'],
            url=data['url'],
            genre=data['genre'],
            region=data['region'],
            description=data.get('description', ''),
            logo_url=data.get('logo_url'),
            website=data.get('website'),
            language=data.get('language', 'English'),
            frequency=data.get('frequency'),
        )
        return jsonify({'message': 'Station created successfully', 'station': station.to_dict()}), 201

    except Exception as e:
        logging.error(f"Error creating station: {e}")
        return jsonify({'error': 'Failed to create station'}), 500


@admin_bp.route('/stations/<int:station_id>', methods=['PUT', 'DELETE'])
@admin_required
def station_detail(station_id):
    if request.method == 'DELETE':
        try:
            result = get_stations_col().delete_one({'id': station_id})
            if result.deleted_count == 0:
                return jsonify({'error': 'Station not found'}), 404
            return jsonify({'message': 'Station deleted successfully'})
        except Exception as e:
            logging.error(f"Error deleting station {station_id}: {e}")
            return jsonify({'error': 'Failed to delete station'}), 500

    # PUT — update
    try:
        station = Station.find_by_id(station_id)
        if not station:
            return jsonify({'error': 'Station not found'}), 404

        data = request.get_json()
        allowed = ['name', 'description', 'url', 'logo_url', 'website',
                   'genre', 'region', 'language', 'frequency', 'is_active', 'is_live']
        updates = {k: v for k, v in data.items() if k in allowed}

        if updates:
            station.update(**updates)

        return jsonify({'message': 'Station updated successfully', 'station': station.to_dict()})

    except Exception as e:
        logging.error(f"Error updating station {station_id}: {e}")
        return jsonify({'error': 'Failed to update station'}), 500
