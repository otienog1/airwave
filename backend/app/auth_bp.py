from flask import Blueprint, request, jsonify, make_response
from flask_jwt_extended import (
    jwt_required, get_jwt_identity,
    set_access_cookies, set_refresh_cookies, unset_jwt_cookies,
)
from app.models.user import User
from app.email_utils import send_password_reset_email
from app import limiter
from datetime import datetime
import os
import re
import logging

auth_bp = Blueprint('auth', __name__)


def validate_email(email: str) -> bool:
    return bool(re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email))


def validate_password(password: str) -> bool:
    return (
        len(password) >= 8
        and bool(re.search(r'[A-Z]', password))
        and bool(re.search(r'[a-z]', password))
        and bool(re.search(r'\d', password))
    )


@auth_bp.route('/register', methods=['POST'])
@limiter.limit("5 per minute")
def register():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        email    = data.get('email', '').strip().lower()
        username = data.get('username', '').strip()
        password = data.get('password', '')

        if not email or not username or not password:
            return jsonify({'error': 'Email, username, and password are required'}), 400
        if not validate_email(email):
            return jsonify({'error': 'Invalid email format'}), 400
        if len(username) < 3 or len(username) > 80:
            return jsonify({'error': 'Username must be between 3 and 80 characters'}), 400
        if not validate_password(password):
            return jsonify({'error': 'Password must be at least 8 characters with uppercase, lowercase, and digit'}), 400
        if User.email_exists(email):
            return jsonify({'error': 'Email already registered'}), 409
        if User.username_exists(username):
            return jsonify({'error': 'Username already taken'}), 409

        user = User.create(email=email, username=username, password=password)
        access_token, refresh_token = user.generate_tokens()

        response = make_response(
            jsonify({'message': 'User registered successfully', 'user': user.to_dict()}), 201
        )
        set_access_cookies(response, access_token)
        set_refresh_cookies(response, refresh_token)
        return response

    except Exception as e:
        logging.error(f"Error registering user: {e}")
        return jsonify({'error': 'Registration failed'}), 500


@auth_bp.route('/login', methods=['POST'])
@limiter.limit("10 per minute")
def login():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        email    = data.get('email', '').strip().lower()
        password = data.get('password', '')

        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400

        user = User.find_by_email(email)
        if not user or not user.check_password(password):
            return jsonify({'error': 'Invalid email or password'}), 401
        if not user.is_active:
            return jsonify({'error': 'Account is deactivated'}), 401

        user.update_last_login()
        access_token, refresh_token = user.generate_tokens()

        response = make_response(jsonify({'message': 'Login successful', 'user': user.to_dict()}))
        set_access_cookies(response, access_token)
        set_refresh_cookies(response, refresh_token)
        return response

    except Exception as e:
        logging.error(f"Error logging in user: {e}")
        return jsonify({'error': 'Login failed'}), 500


@auth_bp.route('/refresh', methods=['POST'])
@limiter.limit("30 per hour")
@jwt_required(refresh=True)
def refresh():
    try:
        user_id = int(get_jwt_identity())
        user = User.find_by_id(user_id)
        if not user or not user.is_active:
            return jsonify({'error': 'Unauthorized'}), 401

        access_token, refresh_token = user.generate_tokens()
        response = make_response(jsonify({'ok': True}))
        set_access_cookies(response, access_token)
        set_refresh_cookies(response, refresh_token)
        return response

    except Exception as e:
        logging.error(f"Error refreshing token: {e}")
        return jsonify({'error': 'Refresh failed'}), 500


@auth_bp.route('/logout', methods=['POST'])
def logout():
    response = make_response(jsonify({'ok': True}))
    unset_jwt_cookies(response)
    return response


@auth_bp.route('/forgot-password', methods=['POST'])
@limiter.limit("5 per hour")
def forgot_password():
    try:
        data = request.get_json() or {}
        email = data.get('email', '').strip().lower()

        if not email or not validate_email(email):
            return jsonify({'error': 'Valid email address required'}), 400

        user = User.find_by_email(email)
        if not user or not user.is_active:
            return jsonify({'error': 'No account found with that email address'}), 404

        token = user.set_reset_token()
        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000').split(',')[0].strip()
        reset_url = f"{frontend_url}/reset-password?token={token}"
        send_password_reset_email(email, reset_url)

        return jsonify({'message': 'Reset link sent! Check your inbox.'})

    except Exception as e:
        logging.error(f"Error in forgot_password: {e}")
        return jsonify({'error': 'Something went wrong'}), 500


@auth_bp.route('/reset-password', methods=['POST'])
@limiter.limit("10 per hour")
def reset_password():
    try:
        data = request.get_json() or {}
        token    = data.get('token', '').strip()
        password = data.get('password', '')

        if not token:
            return jsonify({'error': 'Reset token is required'}), 400
        if not validate_password(password):
            return jsonify({'error': 'Password must be at least 8 characters with uppercase, lowercase, and digit'}), 400

        user = User.find_by_reset_token(token)
        if not user:
            return jsonify({'error': 'Invalid or expired reset link'}), 400

        user.update_password(password)
        return jsonify({'message': 'Password updated successfully'})

    except Exception as e:
        logging.error(f"Error in reset_password: {e}")
        return jsonify({'error': 'Something went wrong'}), 500


@auth_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    try:
        user_id = int(get_jwt_identity())
        user = User.find_by_id(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        return jsonify({'user': user.to_dict()})
    except Exception as e:
        logging.error(f"Error fetching profile: {e}")
        return jsonify({'error': 'Failed to fetch profile'}), 500
