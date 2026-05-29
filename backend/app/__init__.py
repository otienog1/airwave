from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from sqlalchemy import text
import os
from datetime import timedelta

# Initialize extensions
db = SQLAlchemy()
jwt = JWTManager()
migrate = Migrate()
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["100 per hour"]
)

def create_app(config_name='development', test_config=None):
    app = Flask(__name__)

    # Configuration
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///airwave.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-change-in-production')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
    app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)
    # Cookie-based token delivery
    app.config['JWT_TOKEN_LOCATION']      = ['cookies']
    app.config['JWT_ACCESS_COOKIE_NAME']  = 'access_token'
    app.config['JWT_REFRESH_COOKIE_NAME'] = 'refresh_token'
    _is_secure = os.environ.get('FLASK_ENV') != 'development'
    app.config['JWT_COOKIE_SECURE']       = _is_secure
    # SameSite=None requires Secure; use Lax for local http dev
    app.config['JWT_COOKIE_SAMESITE']     = 'None' if _is_secure else 'Lax'
    app.config['JWT_COOKIE_CSRF_PROTECT'] = False
    app.config['JWT_REFRESH_COOKIE_PATH'] = '/api/auth/refresh'

    # Apply test overrides before extensions are initialized
    if test_config is not None:
        app.config.update(test_config)

    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)
    limiter.init_app(app)
    
    # CORS configuration
    CORS(app,
         origins=[os.environ.get('FRONTEND_URL', 'http://localhost:3000')],
         supports_credentials=True,
         allow_headers=['Content-Type'],
         )
    
    # Register blueprints
    from .stations_bp import stations_bp
    from .auth_bp import auth_bp
    from .admin_bp import admin_bp
    from .analytics_bp import analytics_bp, register_analytics_commands
    
    app.register_blueprint(stations_bp, url_prefix='/api/stations')
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(analytics_bp, url_prefix='/api/analytics')

    register_analytics_commands(app)
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Resource not found'}), 404
    
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({'error': 'Bad request'}), 400
    
    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return jsonify({'error': 'Internal server error'}), 500
    
    # Health check endpoint
    @app.route('/api/health')
    def health_check():
        checks = {}

        try:
            db.session.execute(text('SELECT 1'))
            checks['database'] = 'ok'
        except Exception as e:
            checks['database'] = f'error: {e}'

        overall = 'healthy' if all(v == 'ok' for v in checks.values()) else 'degraded'
        status_code = 200 if overall == 'healthy' else 503
        return jsonify({
            'status': overall,
            'service': 'airwave-api',
            'checks': checks,
        }), status_code
    
    with app.app_context():
        db.create_all()

    return app

