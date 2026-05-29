from dotenv import load_dotenv
load_dotenv()

from app import create_app
from app.db import ensure_indexes, get_stations_col, get_users_col
from app.models.station import Station
from app.models.user import User

app = create_app()


def seed_stations():
    """Insert default stations if the collection is empty."""
    if get_stations_col().count_documents({}) > 0:
        return

    stations_data = [
        {'name': 'Capital FM', 'description': "Kenya's Number One Hit Music Station", 'url': 'https://atunwadigital.streamguys1.com/capitalfm', 'genre': 'Pop', 'region': 'Nairobi', 'frequency': '98.4 FM'},
        {'name': 'Classic 105', 'description': 'No.1 for Soul and Great Hits', 'url': 'https://atunwadigital.streamguys1.com/classic105', 'genre': 'Soul', 'region': 'Nairobi', 'frequency': '105.2 FM'},
        {'name': 'Kiss FM Kenya', 'description': 'Your Hit Music Station', 'url': 'https://atunwadigital.streamguys1.com/kissfm', 'genre': 'Pop', 'region': 'Nairobi', 'frequency': '100.3 FM'},
        {'name': 'Radio Citizen', 'description': "Kenya's National Radio", 'url': 'https://stream.radioking.com/radio-citizen', 'genre': 'Talk', 'region': 'Nairobi', 'frequency': '98.4 FM'},
        {'name': 'Milele FM', 'description': 'Kiswahili Hit Music', 'url': 'https://stream.zeno.fm/milele', 'genre': 'Urban', 'region': 'Nairobi', 'frequency': '90.7 FM'},
        {'name': 'Ghetto Radio', 'description': 'Hip Hop & Urban', 'url': 'https://stream.zeno.fm/ghetto', 'genre': 'Hip Hop', 'region': 'Nairobi', 'frequency': '89.5 FM'},
    ]

    for data in stations_data:
        if not Station.find_by_name(data['name']):
            Station.create(**data)
            print(f"  Created station: {data['name']}")


def seed_admin():
    """Create admin user if none exists."""
    if get_users_col().count_documents({'is_admin': True}) > 0:
        return
    admin = User.create(email='admin@airwave.ke', username='admin', password='AdminPass123!', is_admin=True)
    print(f"  Created admin user: {admin.email}")


if __name__ == '__main__':
    print("Ensuring MongoDB indexes...")
    ensure_indexes()
    print("Seeding data...")
    seed_stations()
    seed_admin()
    print("Starting server on http://0.0.0.0:5001")
    app.run(debug=True, host='0.0.0.0', port=5001)
