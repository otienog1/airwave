import os
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
        {'name': 'Capital FM', 'description': "Kenya's No. 1 Hit Music Station", 'url': 'https://atunwadigital.streamguys1.com/capitalfm', 'genre': 'Pop', 'region': 'Nairobi', 'frequency': '98.4 FM', 'language': 'English', 'total_plays': 125430},
        {'name': 'Classic 105', 'description': 'No.1 for Soul and Great Hits', 'url': 'https://atunwadigital.streamguys1.com/classic105', 'genre': 'Soul', 'region': 'Nairobi', 'frequency': '105.2 FM', 'language': 'English', 'total_plays': 98760},
        {'name': 'KISS 100', 'description': 'Tha Beat of Nairobi', 'url': 'https://atunwadigital.streamguys1.com/kiss100fm', 'genre': 'Hip Hop', 'region': 'Nairobi', 'frequency': '100.3 FM', 'language': 'English', 'total_plays': 156890},
        {'name': 'Homeboyz Radio', 'description': '103.5 Homeboyz Radio', 'url': 'https://atunwadigital.streamguys1.com/homeboyzradio', 'genre': 'Urban', 'region': 'Nairobi', 'frequency': '103.5 FM', 'language': 'English', 'total_plays': 87230},
        {'name': 'Hot 96', 'description': 'We Play What We Want', 'url': 'https://hot96-atunwadigital.streamguys1.com/hot96', 'genre': 'Contemporary', 'region': 'Nairobi', 'frequency': '96.0 FM', 'language': 'English', 'total_plays': 76540},
        {'name': 'Ramogi FM', 'description': 'Vernacular Radio Station', 'url': 'https://ramogifm-atunwadigital.streamguys1.com/ramogifm', 'genre': 'Talk', 'region': 'Nairobi', 'frequency': '107.1 FM', 'language': 'Luo', 'total_plays': 45320},
        {'name': 'Ghetto Radio', 'description': 'Mtaani Radio', 'url': 'https://stream-158.zeno.fm/eghcv7h647zuv', 'genre': 'Hip Hop', 'region': 'Nairobi', 'language': 'Swahili', 'total_plays': 34210},
        {'name': 'Radio Citizen', 'description': 'Citizen Radio - Mzalendo', 'url': 'https://radiocitizen-atunwadigital.streamguys1.com/radiocitizen', 'genre': 'News', 'region': 'Nairobi', 'frequency': '106.7 FM', 'language': 'English', 'total_plays': 89760},
        {'name': 'Radio Maisha', 'description': 'Maisha ni Yetu', 'url': 'https://radiomaisha-atunwadigital.streamguys1.com/radiomaisha', 'genre': 'Contemporary', 'region': 'Nairobi', 'frequency': '102.7 FM', 'language': 'Swahili', 'total_plays': 112340},
        {'name': 'NRG Radio', 'description': 'Energy to the Max', 'url': 'https://uksouth.streaming.broadcast.radio/nrg', 'genre': 'Dance', 'region': 'Nairobi', 'frequency': '100.9 FM', 'language': 'English', 'total_plays': 67890},
        {'name': 'Kass FM', 'description': 'Kalenjin Community Radio', 'url': 'https://stream-158.zeno.fm/mr4w3nu1qzzuv', 'genre': 'Talk', 'region': 'Nakuru', 'frequency': '89.1 FM', 'language': 'Kalenjin', 'total_plays': 28760},
        {'name': 'Radio Jambo', 'description': 'Redio ya Kwanza Kenya', 'url': 'https://atunwadigital.streamguys1.com/radiojambo', 'genre': 'Talk', 'region': 'Nairobi', 'frequency': '97.5 FM', 'language': 'Swahili', 'total_plays': 78650},
        {'name': 'Hope FM', 'description': "Nairobi's Inspirational Radio", 'url': 'https://a5.asurahosting.com:7530/radio.mp3', 'genre': 'Contemporary', 'region': 'Nairobi', 'frequency': '93.3 FM', 'language': 'English', 'total_plays': 41500},
        {'name': 'Inooro FM', 'description': 'Gikuyu Community Radio', 'url': 'https://inoorofm-atunwadigital.streamguys1.com/inoorofm', 'genre': 'Talk', 'region': 'Nairobi', 'frequency': '88.9 FM', 'language': 'Kikuyu', 'total_plays': 62300},
        {'name': 'Family Radio', 'description': 'Wholesome Family Entertainment', 'url': 'https://uksoutha.streaming.broadcast.radio/familyradio', 'genre': 'Contemporary', 'region': 'Nairobi', 'frequency': '103.9 FM', 'language': 'English', 'total_plays': 38900},
        {'name': 'Waumini FM', 'description': 'Catholic Radio Kenya', 'url': 'https://stream-282.zeno.fm/gvk894g072quv', 'genre': 'Talk', 'region': 'Nairobi', 'frequency': '88.3 FM', 'language': 'Swahili', 'total_plays': 27100},
        {'name': 'Mulembe FM', 'description': 'Luhya Community Radio', 'url': 'https://atunwadigital.streamguys1.com/mulembefm', 'genre': 'Talk', 'region': 'Nairobi', 'frequency': '97.9 FM', 'language': 'Luhya', 'total_plays': 31200},
        {'name': 'KBC English Service', 'description': "Kenya's National Broadcaster", 'url': 'https://stream-285.zeno.fm/c0myzdb71s8uv', 'genre': 'News', 'region': 'Nairobi', 'frequency': '95.6 FM', 'language': 'English', 'total_plays': 84700},
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
    port = int(os.environ.get('PORT', 5002))
    print(f"Starting server on http://0.0.0.0:{port}")
    app.run(debug=True, host='0.0.0.0', port=port, use_reloader=False)
