from app import create_app, db
from app.models.station import Station
from app.models.user import User
import os

app = create_app()

@app.cli.command()
def init_db():
    """Initialize the database with sample data"""
    db.create_all()
    
    # Create sample stations
    stations_data = [
        {
            'name': 'Capital FM',
            'description': "Kenya's Number One Hit Music Station",
            'url': 'https://atunwadigital.streamguys1.com/capitalfm',
            'genre': 'Pop',
            'region': 'Nairobi',
            'frequency': '98.4 FM'
        },
        {
            'name': 'Classic 105',
            'description': 'No.1 for Soul and Great Hits',
            'url': 'https://atunwadigital.streamguys1.com/classic105',
            'genre': 'Soul',
            'region': 'Nairobi',
            'frequency': '105.2 FM'
        },
        # Add more stations...
    ]
    
    for station_data in stations_data:
        if not Station.query.filter_by(name=station_data['name']).first():
            station = Station(**station_data)
            db.session.add(station)
    
    # Create admin user
    admin_email = 'admin@airwave.ke'
    if not User.query.filter_by(email=admin_email).first():
        admin = User(
            email=admin_email,
            username='admin',
            is_admin=True
        )
        admin.set_password('AdminPass123!')
        db.session.add(admin)
    
    db.session.commit()
    print("Database initialized successfully!")

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)