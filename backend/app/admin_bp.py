from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.station import Station, User
from app import db
from functools import wraps
import logging

admin_bp = Blueprint('admin', __name__)

def admin_required(f):
    @wraps(f)
    @jwt_required()
    def decorated_function(*args, **kwargs):
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user or not user.is_admin:
            return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    return decorated_function

@admin_bp.route('/stations', methods=['POST'])
@admin_required
def create_station():
    """Create a new station"""
    try:
        data = request.get_json()
        
        required_fields = ['name', 'url', 'genre', 'region']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Check if station name already exists
        if Station.query.filter_by(name=data['name']).first():
            return jsonify({'error': 'Station name already exists'}), 409
        
        station = Station(
            name=data['name'],
            description=data.get('description', ''),
            url=data['url'],
            logo_url=data.get('logo_url'),
            website=data.get('website'),
            genre=data['genre'],
            region=data['region'],
            language=data.get('language', 'English'),
            frequency=data.get('frequency')
        )
        
        db.session.add(station)
        db.session.commit()
        
        return jsonify({
            'message': 'Station created successfully',
            'station': station.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error creating station: {str(e)}")
        return jsonify({'error': 'Failed to create station'}), 500

@admin_bp.route('/stations/<int:station_id>', methods=['PUT'])
@admin_required
def update_station(station_id):
    """Update a station"""
    try:
        station = Station.query.get_or_404(station_id)
        data = request.get_json()
        
        # Update fields
        for field in ['name', 'description', 'url', 'logo_url', 'website', 
                     'genre', 'region', 'language', 'frequency', 'is_active', 'is_live']:
            if field in data:
                setattr(station, field, data[field])
        
        db.session.commit()
        
        return jsonify({
            'message': 'Station updated successfully',
            'station': station.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error updating station {station_id}: {str(e)}")
        return jsonify({'error': 'Failed to update station'}), 500