import pytest
from unittest.mock import patch


@pytest.fixture(scope='function')
def app():
    from app import create_app
    application = create_app(test_config={
        'TESTING': True,
        'JWT_COOKIE_SECURE': False,
        'RATELIMIT_ENABLED': False,
        'RATELIMIT_STORAGE_URI': 'memory://',
    })
    yield application


@pytest.fixture(scope='function')
def client(app):
    return app.test_client(use_cookies=True)


def test_trending_now_empty(client):
    """Returns empty list and 200 when no recent plays data."""
    with patch('app.analytics_bp.get_plays_col') as mock_plays, \
         patch('app.analytics_bp.get_station_plays_col') as mock_sp, \
         patch('app.analytics_bp.get_stations_col') as _mock_stations:

        mock_plays.return_value.aggregate.return_value = iter([])
        mock_sp.return_value.aggregate.side_effect = [iter([]), iter([])]

        response = client.get('/api/analytics/trending-now')
        assert response.status_code == 200
        data = response.get_json()
        assert data['stations'] == []
        assert 'updated_at' in data


def test_trending_now_returns_ranked_stations(client):
    """Returns up to 5 stations; station with most listeners ranks first."""
    live_data = [
        {'_id': 1, 'live_listeners': 1000},
        {'_id': 2, 'live_listeners': 500},
        {'_id': 3, 'live_listeners': 200},
    ]
    today_data = [
        {'_id': 1, 'plays_today': 100},
        {'_id': 2, 'plays_today': 80},
        {'_id': 3, 'plays_today': 40},
    ]
    yesterday_data = [
        {'_id': 1, 'plays_yesterday': 50},
        {'_id': 2, 'plays_yesterday': 80},
    ]
    station_docs = {
        1: {'name': 'Capital FM', 'genre': 'Pop'},
        2: {'name': 'Kiss FM',    'genre': 'Pop'},
        3: {'name': 'Jambo FM',   'genre': 'Swahili'},
    }

    with patch('app.analytics_bp.get_plays_col') as mock_plays, \
         patch('app.analytics_bp.get_station_plays_col') as mock_sp, \
         patch('app.analytics_bp.get_stations_col') as mock_stations:

        mock_plays.return_value.aggregate.return_value = iter(live_data)
        mock_sp.return_value.aggregate.side_effect = [iter(today_data), iter(yesterday_data)]
        mock_stations.return_value.find_one.side_effect = lambda q, proj=None: (
            {'name': station_docs[q['id']]['name'], 'genre': station_docs[q['id']]['genre']}
            if q.get('id') in station_docs else None
        )

        response = client.get('/api/analytics/trending-now')
        assert response.status_code == 200
        data = response.get_json()
        stations = data['stations']
        assert len(stations) == 3
        assert stations[0]['id'] == 1
        assert stations[0]['name'] == 'Capital FM'
        assert stations[0]['live_listeners'] == 1000
        assert 'growth_pct' in stations[0]


def test_trending_now_omits_growth_when_no_yesterday(client):
    """growth_pct is absent from response when plays_yesterday is 0."""
    live_data = [{'_id': 1, 'live_listeners': 500}]
    today_data = [{'_id': 1, 'plays_today': 10}]

    with patch('app.analytics_bp.get_plays_col') as mock_plays, \
         patch('app.analytics_bp.get_station_plays_col') as mock_sp, \
         patch('app.analytics_bp.get_stations_col') as mock_stations:

        mock_plays.return_value.aggregate.return_value = iter(live_data)
        mock_sp.return_value.aggregate.side_effect = [iter(today_data), iter([])]
        mock_stations.return_value.find_one.return_value = {'name': 'Test FM', 'genre': 'Pop'}

        response = client.get('/api/analytics/trending-now')
        assert response.status_code == 200
        data = response.get_json()
        assert len(data['stations']) == 1
        assert 'growth_pct' not in data['stations'][0]
