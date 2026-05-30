from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.user import User
from app.db import get_stations_col, get_station_plays_col, get_users_col, get_plays_col
from app import limiter
from datetime import datetime, timedelta
from functools import wraps
import logging

analytics_bp = Blueprint('analytics', __name__)


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


def _date_range(days: int):
    end = datetime.utcnow()
    start = end - timedelta(days=days)
    return start, end


@analytics_bp.route('/dashboard', methods=['GET'])
@admin_required
@limiter.limit("30 per minute")
def get_dashboard_stats():
    try:
        days = request.args.get('days', 7, type=int)
        start, end = _date_range(days)
        prev_start = start - timedelta(days=days)

        plays_col = get_station_plays_col()
        stations_col = get_stations_col()

        total_stations = stations_col.count_documents({'is_active': True})
        live_stations  = stations_col.count_documents({'is_active': True, 'is_live': True})
        total_users    = get_users_col().count_documents({'is_active': True})

        period_match = {'played_at': {'$gte': start, '$lte': end}}
        total_plays = plays_col.count_documents(period_match)

        unique_listeners = len(plays_col.distinct('ip_address', period_match))

        duration_agg = list(plays_col.aggregate([
            {'$match': period_match},
            {'$group': {'_id': None, 'total': {'$sum': '$duration'}}},
        ]))
        total_listening_time = duration_agg[0]['total'] if duration_agg else 0
        avg_session = total_listening_time / total_plays if total_plays > 0 else 0

        prev_plays = plays_col.count_documents({'played_at': {'$gte': prev_start, '$lt': start}})
        plays_growth = ((total_plays - prev_plays) / prev_plays * 100) if prev_plays > 0 else 0

        top_stations_agg = list(plays_col.aggregate([
            {'$match': period_match},
            {'$group': {'_id': '$station_id', 'play_count': {'$sum': 1}, 'total_duration': {'$sum': '$duration'}}},
            {'$sort': {'play_count': -1}},
            {'$limit': 10},
        ]))

        top_stations_data = []
        for row in top_stations_agg:
            station = stations_col.find_one({'id': row['_id']}, {'name': 1, 'genre': 1})
            if station:
                pc = row['play_count']
                td = row.get('total_duration', 0) or 0
                top_stations_data.append({
                    'id': row['_id'],
                    'name': station['name'],
                    'genre': station.get('genre'),
                    'play_count': pc,
                    'total_duration': td,
                    'avg_duration': td / pc if pc > 0 else 0,
                })

        return jsonify({
            'overview': {
                'total_stations': total_stations,
                'live_stations': live_stations,
                'total_users': total_users,
                'total_plays': total_plays,
                'unique_listeners': unique_listeners,
                'total_listening_hours': round(total_listening_time / 3600, 2),
                'avg_session_minutes': round(avg_session / 60, 2),
                'plays_growth_percent': round(plays_growth, 2),
            },
            'top_stations': top_stations_data,
            'period': {'start_date': start.date().isoformat(), 'end_date': end.date().isoformat(), 'days': days},
        })

    except Exception as e:
        logging.error(f"Error fetching dashboard stats: {e}")
        return jsonify({'error': 'Failed to fetch dashboard statistics'}), 500


@analytics_bp.route('/real-time', methods=['GET'])
@admin_required
@limiter.limit("60 per minute")
def get_realtime_stats():
    try:
        five_min_ago = datetime.utcnow() - timedelta(minutes=5)
        plays_col = get_station_plays_col()
        stations_col = get_stations_col()
        recent_match = {'played_at': {'$gte': five_min_ago}}

        active_listeners = len(plays_col.distinct('ip_address', recent_match))

        current_agg = list(plays_col.aggregate([
            {'$match': recent_match},
            {'$group': {'_id': '$station_id', 'current_listeners': {'$addToSet': '$ip_address'}}},
            {'$project': {'current_listeners': {'$size': '$current_listeners'}}},
            {'$sort': {'current_listeners': -1}},
            {'$limit': 20},
        ]))

        current_stations_data = []
        for row in current_agg:
            station = stations_col.find_one({'id': row['_id'], 'is_active': True, 'is_live': True}, {'name': 1, 'genre': 1})
            if station:
                current_stations_data.append({
                    'id': row['_id'],
                    'name': station['name'],
                    'genre': station.get('genre'),
                    'current_listeners': row['current_listeners'],
                })

        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_match = {'played_at': {'$gte': today_start}}
        today_plays = plays_col.count_documents(today_match)
        today_unique = len(plays_col.distinct('ip_address', today_match))

        return jsonify({
            'real_time': {
                'active_listeners': active_listeners,
                'live_stations': stations_col.count_documents({'is_live': True, 'is_active': True}),
                'current_stations': current_stations_data,
            },
            'today': {'total_plays': today_plays, 'unique_listeners': today_unique},
            'timestamp': datetime.utcnow().isoformat(),
        })

    except Exception as e:
        logging.error(f"Error fetching real-time stats: {e}")
        return jsonify({'error': 'Failed to fetch real-time statistics'}), 500


@analytics_bp.route('/trends', methods=['GET'])
@admin_required
@limiter.limit("30 per minute")
def get_trends():
    try:
        days = request.args.get('days', 7, type=int)
        start, end = _date_range(days)
        prev_start = start - timedelta(days=days)
        plays_col = get_station_plays_col()
        stations_col = get_stations_col()

        cur_agg = {row['_id']: row['count'] for row in plays_col.aggregate([
            {'$match': {'played_at': {'$gte': start, '$lte': end}}},
            {'$group': {'_id': '$station_id', 'count': {'$sum': 1}}},
        ])}
        prev_agg = {row['_id']: row['count'] for row in plays_col.aggregate([
            {'$match': {'played_at': {'$gte': prev_start, '$lt': start}}},
            {'$group': {'_id': '$station_id', 'count': {'$sum': 1}}},
        ])}

        trending_data = []
        for station_id, cur_count in sorted(cur_agg.items(), key=lambda x: -x[1])[:10]:
            station = stations_col.find_one({'id': station_id}, {'name': 1, 'genre': 1})
            if not station:
                continue
            prev_count = prev_agg.get(station_id, 0)
            growth = ((cur_count - prev_count) / prev_count * 100) if prev_count > 0 else (100 if cur_count > 0 else 0)
            trending_data.append({
                'id': station_id, 'name': station['name'], 'genre': station.get('genre'),
                'current_plays': cur_count, 'prev_plays': prev_count, 'growth_percent': round(growth, 2),
            })

        return jsonify({
            'trending_stations': trending_data,
            'trending_genres': [],
            'period': {
                'current_start': start.date().isoformat(), 'current_end': end.date().isoformat(),
                'previous_start': prev_start.date().isoformat(), 'previous_end': start.date().isoformat(),
                'days': days,
            },
        })

    except Exception as e:
        logging.error(f"Error fetching trends: {e}")
        return jsonify({'error': 'Failed to fetch trends'}), 500


@analytics_bp.route('/genres', methods=['GET'])
@admin_required
@limiter.limit("30 per minute")
def get_genre_analytics():
    try:
        days = request.args.get('days', 30, type=int)
        start, end = _date_range(days)
        plays_col = get_station_plays_col()
        stations_col = get_stations_col()

        station_genre_map = {doc['id']: doc.get('genre') for doc in stations_col.find({'is_active': True}, {'id': 1, 'genre': 1})}

        agg = list(plays_col.aggregate([
            {'$match': {'played_at': {'$gte': start, '$lte': end}}},
            {'$group': {'_id': '$station_id', 'play_count': {'$sum': 1}, 'total_duration': {'$sum': '$duration'}, 'ips': {'$addToSet': '$ip_address'}}},
        ]))

        genre_data: dict = {}
        for row in agg:
            genre = station_genre_map.get(row['_id'])
            if not genre:
                continue
            if genre not in genre_data:
                genre_data[genre] = {'genre': genre, 'total_plays': 0, 'unique_listeners': set(), 'total_duration': 0, 'station_count': 0}
            genre_data[genre]['total_plays'] += row['play_count']
            genre_data[genre]['unique_listeners'].update(row.get('ips', []))
            genre_data[genre]['total_duration'] += row.get('total_duration', 0) or 0
            genre_data[genre]['station_count'] += 1

        result = [
            {
                'genre': v['genre'],
                'total_plays': v['total_plays'],
                'unique_listeners': len(v['unique_listeners']),
                'total_duration_hours': round(v['total_duration'] / 3600, 2),
                'station_count': v['station_count'],
                'avg_plays_per_station': round(v['total_plays'] / v['station_count'], 2) if v['station_count'] > 0 else 0,
            }
            for v in sorted(genre_data.values(), key=lambda x: -x['total_plays'])
        ]

        return jsonify({'genre_analytics': result, 'period': {'start_date': start.date().isoformat(), 'end_date': end.date().isoformat(), 'days': days}})

    except Exception as e:
        logging.error(f"Error fetching genre analytics: {e}")
        return jsonify({'error': 'Failed to fetch genre analytics'}), 500


@analytics_bp.route('/regions', methods=['GET'])
@admin_required
@limiter.limit("30 per minute")
def get_region_analytics():
    try:
        days = request.args.get('days', 30, type=int)
        start, end = _date_range(days)
        plays_col = get_station_plays_col()
        stations_col = get_stations_col()

        station_region_map = {doc['id']: doc.get('region') for doc in stations_col.find({'is_active': True}, {'id': 1, 'region': 1})}

        agg = list(plays_col.aggregate([
            {'$match': {'played_at': {'$gte': start, '$lte': end}}},
            {'$group': {'_id': '$station_id', 'play_count': {'$sum': 1}, 'total_duration': {'$sum': '$duration'}, 'ips': {'$addToSet': '$ip_address'}}},
        ]))

        region_data: dict = {}
        for row in agg:
            region = station_region_map.get(row['_id'])
            if not region:
                continue
            if region not in region_data:
                region_data[region] = {'region': region, 'total_plays': 0, 'unique_listeners': set(), 'total_duration': 0, 'station_count': 0}
            region_data[region]['total_plays'] += row['play_count']
            region_data[region]['unique_listeners'].update(row.get('ips', []))
            region_data[region]['total_duration'] += row.get('total_duration', 0) or 0
            region_data[region]['station_count'] += 1

        result = [
            {
                'region': v['region'],
                'total_plays': v['total_plays'],
                'unique_listeners': len(v['unique_listeners']),
                'total_duration_hours': round(v['total_duration'] / 3600, 2),
                'station_count': v['station_count'],
                'avg_plays_per_station': round(v['total_plays'] / v['station_count'], 2) if v['station_count'] > 0 else 0,
            }
            for v in sorted(region_data.values(), key=lambda x: -x['total_plays'])
        ]

        return jsonify({'region_analytics': result, 'period': {'start_date': start.date().isoformat(), 'end_date': end.date().isoformat(), 'days': days}})

    except Exception as e:
        logging.error(f"Error fetching region analytics: {e}")
        return jsonify({'error': 'Failed to fetch region analytics'}), 500


@analytics_bp.route('/stations/<int:station_id>/stats', methods=['GET'])
@admin_required
@limiter.limit("30 per minute")
def get_station_stats(station_id):
    try:
        from app.models.station import Station
        station = Station.find_by_id(station_id)
        if not station:
            return jsonify({'error': 'Station not found'}), 404

        days = request.args.get('days', 30, type=int)
        start, end = _date_range(days)
        plays_col = get_station_plays_col()
        match = {'station_id': station_id, 'played_at': {'$gte': start, '$lte': end}}

        period_plays = plays_col.count_documents(match)
        unique_listeners = len(plays_col.distinct('ip_address', match))

        dur_agg = list(plays_col.aggregate([{'$match': match}, {'$group': {'_id': None, 'total': {'$sum': '$duration'}}}]))
        total_duration = dur_agg[0]['total'] if dur_agg else 0
        avg_duration = total_duration / period_plays if period_plays > 0 else 0

        daily_agg = list(plays_col.aggregate([
            {'$match': match},
            {'$group': {
                '_id': {'$dateToString': {'format': '%Y-%m-%d', 'date': '$played_at'}},
                'plays': {'$sum': 1},
                'unique_ips': {'$addToSet': '$ip_address'},
                'total_duration': {'$sum': '$duration'},
            }},
            {'$sort': {'_id': 1}},
        ]))
        daily_data = [{'date': r['_id'], 'plays': r['plays'], 'unique_listeners': len(r['unique_ips']), 'total_duration_minutes': round((r.get('total_duration') or 0) / 60, 2)} for r in daily_agg]

        hourly_agg = list(plays_col.aggregate([
            {'$match': match},
            {'$group': {'_id': {'$hour': '$played_at'}, 'plays': {'$sum': 1}}},
            {'$sort': {'_id': 1}},
        ]))
        hourly_data = [{'hour': r['_id'], 'plays': r['plays']} for r in hourly_agg]

        heatmap_agg = list(plays_col.aggregate([
            {'$match': match},
            {'$group': {
                '_id': {
                    'hour': {'$hour': '$played_at'},
                    'day': {'$subtract': [{'$dayOfWeek': '$played_at'}, 1]},
                },
                'plays': {'$sum': 1},
            }},
        ]))
        heatmap_data = [
            {'hour': r['_id']['hour'], 'day': r['_id']['day'], 'count': r['plays']}
            for r in heatmap_agg
        ]

        return jsonify({
            'station': {'id': station.id, 'name': station.name, 'genre': station.genre, 'region': station.region},
            'stats': {
                'total_plays_all_time': station.total_plays,
                'period_plays': period_plays,
                'unique_listeners': unique_listeners,
                'total_listening_hours': round(total_duration / 3600, 2),
                'avg_session_minutes': round(avg_duration / 60, 2),
                'current_listeners': station.current_listeners,
            },
            'daily_stats': daily_data,
            'hourly_distribution': hourly_data,
            'heatmap_data': heatmap_data,
            'period': {'start_date': start.date().isoformat(), 'end_date': end.date().isoformat(), 'days': days},
        })

    except Exception as e:
        logging.error(f"Error fetching station {station_id} stats: {e}")
        return jsonify({'error': 'Failed to fetch station statistics'}), 500


@analytics_bp.route('/user/<int:user_id>/listening-history', methods=['GET'])
@jwt_required()
@limiter.limit("30 per minute")
def get_user_listening_history(user_id):
    try:
        current_user_id = int(get_jwt_identity())
        current_user = User.find_by_id(current_user_id)
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        if user_id != current_user_id and not current_user.is_admin:
            return jsonify({'error': 'Access denied'}), 403

        page = max(request.args.get('page', 1, type=int), 1)
        per_page = min(request.args.get('per_page', 50, type=int), 100)

        plays_col = get_station_plays_col()
        stations_col = get_stations_col()
        match = {'user_id': user_id}

        total = plays_col.count_documents(match)
        plays = list(plays_col.find(match).sort('played_at', -1).skip((page - 1) * per_page).limit(per_page))

        station_ids = list({p['station_id'] for p in plays})
        station_map = {doc['id']: doc for doc in stations_col.find({'id': {'$in': station_ids}})}

        history_data = []
        for play in plays:
            sid = play['station_id']
            st = station_map.get(sid, {})
            history_data.append({
                'id': str(play['_id']),
                'station_id': sid,
                'station_name': st.get('name', 'Unknown'),
                'genre': st.get('genre'),
                'region': st.get('region'),
                'duration_minutes': round((play.get('duration') or 0) / 60, 2),
                'played_at': play['played_at'].isoformat(),
            })

        pages = max((total + per_page - 1) // per_page, 1)
        return jsonify({
            'listening_history': history_data,
            'stats': {'total_plays': total},
            'pagination': {'page': page, 'per_page': per_page, 'total': total, 'pages': pages, 'has_next': page < pages, 'has_prev': page > 1},
        })

    except Exception as e:
        logging.error(f"Error fetching user listening history: {e}")
        return jsonify({'error': 'Failed to fetch listening history'}), 500


@analytics_bp.route('/snapshot', methods=['POST'])
@limiter.limit("60 per minute")
def record_snapshot():
    """Lightweight endpoint called by Next.js analytics on metadata poll."""
    try:
        from app.db import get_db
        data = request.get_json() or {}
        station_id = data.get('stationId')
        if not station_id:
            return jsonify({'error': 'Missing stationId'}), 400

        from app.models.station import Station
        station = Station.find_by_id(station_id)
        if not station:
            return jsonify({'error': 'Station not found'}), 404

        get_db()['stationSnapshots'].insert_one({
            'stationId': station_id,
            'stationName': station.name,
            'listeners': data.get('listeners'),
            'isOnline': data.get('isOnline', True),
            'lastMetaSource': data.get('source'),
            'snapshotAt': datetime.utcnow(),
        })
        return jsonify({'ok': True})

    except Exception as e:
        logging.error(f"Error recording snapshot: {e}")
        return jsonify({'error': 'Failed to record snapshot'}), 500


@analytics_bp.route('/audience', methods=['GET'])
@admin_required
@limiter.limit("30 per minute")
def get_audience_stats():
    try:
        days = request.args.get('days', 7, type=int)
        start, end = _date_range(days)
        plays_col = get_plays_col()
        plays_match = {'detectedAt': {'$gte': start, '$lte': end}}

        # KPI aggregation
        kpi_agg = list(plays_col.aggregate([
            {'$match': plays_match},
            {'$group': {
                '_id': None,
                'peak_listeners': {'$max': '$listeners'},
                'avg_listeners': {'$avg': '$listeners'},
                'total_detections': {'$sum': 1},
                'total_listener_sum': {'$sum': '$listeners'},
            }},
        ]))
        kpi = kpi_agg[0] if kpi_agg else {}
        peak_listeners = int(kpi.get('peak_listeners') or 0)
        avg_listeners = round(float(kpi.get('avg_listeners') or 0), 1)
        total_detections = int(kpi.get('total_detections') or 0)
        total_listener_sum = int(kpi.get('total_listener_sum') or 0)

        # App engagement rate: stationPlays clicks ÷ total stream listeners × 100
        station_plays_col = get_station_plays_col()
        app_plays_count = station_plays_col.count_documents({'played_at': {'$gte': start, '$lte': end}})
        app_engagement_rate = round(app_plays_count / total_listener_sum * 100, 2) if total_listener_sum > 0 else 0.0

        # Time series — hour buckets for 1d, day buckets otherwise
        if days <= 1:
            fmt = '%Y-%m-%dT%H:00:00Z'
        else:
            fmt = '%Y-%m-%d'
        ts_agg = list(plays_col.aggregate([
            {'$match': plays_match},
            {'$group': {
                '_id': {'$dateToString': {'format': fmt, 'date': '$detectedAt'}},
                'listeners': {'$avg': '$listeners'},
            }},
            {'$sort': {'_id': 1}},
        ]))
        time_series = [{'bucket': r['_id'], 'listeners': r['listeners']} for r in ts_agg]

        # Top stations by avg stream listeners
        top_stations_agg = list(plays_col.aggregate([
            {'$match': plays_match},
            {'$group': {
                '_id': '$stationId',
                'station_name': {'$first': '$stationName'},
                'avg_listeners': {'$avg': '$listeners'},
            }},
            {'$sort': {'avg_listeners': -1}},
            {'$limit': 10},
        ]))
        top_stations = [
            {
                'station_id': r['_id'],
                'station_name': r['station_name'],
                'avg_listeners': round(float(r['avg_listeners'] or 0), 1),
            }
            for r in top_stations_agg
        ]

        # Top songs by avg stream listeners
        top_songs_agg = list(plays_col.aggregate([
            {'$match': plays_match},
            {'$group': {
                '_id': {'title': '$title', 'artist': '$artist'},
                'avg_listeners': {'$avg': '$listeners'},
                'count': {'$sum': 1},
                'station_entries': {'$push': {'station': '$stationName', 'listeners': '$listeners'}},
            }},
            {'$sort': {'avg_listeners': -1}},
            {'$limit': 20},
        ]))
        top_songs = []
        for r in top_songs_agg:
            entries = r.get('station_entries', [])
            best = max(entries, key=lambda x: x.get('listeners') or 0, default={})
            top_songs.append({
                'title': r['_id']['title'],
                'artist': r['_id'].get('artist'),
                'avg_listeners': round(float(r['avg_listeners'] or 0), 1),
                'count': r['count'],
                'best_station': best.get('station'),
            })

        return jsonify({
            'peak_listeners': peak_listeners,
            'avg_listeners': avg_listeners,
            'total_detections': total_detections,
            'app_engagement_rate': app_engagement_rate,
            'time_series': time_series,
            'top_stations': top_stations,
            'top_songs': top_songs,
            'period': {'start_date': start.date().isoformat(), 'end_date': end.date().isoformat(), 'days': days},
        })

    except Exception as e:
        logging.error(f"Error fetching audience stats: {e}")
        return jsonify({'error': 'Failed to fetch audience statistics'}), 500


@analytics_bp.route('/trending-now', methods=['GET'])
@limiter.limit("60 per minute")
def get_trending_now():
    try:
        now = datetime.utcnow()
        thirty_min_ago = now - timedelta(minutes=30)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        yesterday_start = today_start - timedelta(days=1)

        plays_col = get_plays_col()
        station_plays_col = get_station_plays_col()

        # Live listeners: max listeners per station in last 30 min (plays collection)
        live_agg = list(plays_col.aggregate([
            {'$match': {'detectedAt': {'$gte': thirty_min_ago}}},
            {'$group': {'_id': '$stationId', 'live_listeners': {'$max': '$listeners'}}},
        ]))
        live_map = {r['_id']: int(r['live_listeners'] or 0) for r in live_agg}

        # Plays today per station (stationPlays collection)
        today_agg = list(station_plays_col.aggregate([
            {'$match': {'played_at': {'$gte': today_start, '$lt': now}}},
            {'$group': {'_id': '$station_id', 'plays_today': {'$sum': 1}}},
        ]))
        today_map = {r['_id']: r['plays_today'] for r in today_agg}

        # Plays yesterday per station
        yesterday_agg = list(station_plays_col.aggregate([
            {'$match': {'played_at': {'$gte': yesterday_start, '$lt': today_start}}},
            {'$group': {'_id': '$station_id', 'plays_yesterday': {'$sum': 1}}},
        ]))
        yesterday_map = {r['_id']: r['plays_yesterday'] for r in yesterday_agg}

        all_ids = set(live_map) | set(today_map)
        if not all_ids:
            return jsonify({'stations': [], 'updated_at': now.strftime('%Y-%m-%dT%H:%M:%SZ')})

        stations_col = get_stations_col()
        max_listeners = max((live_map.get(sid, 0) for sid in all_ids), default=1) or 1
        max_plays = max((today_map.get(sid, 0) for sid in all_ids), default=1) or 1

        scored = []
        for sid in all_ids:
            listeners = live_map.get(sid, 0)
            plays_today = today_map.get(sid, 0)
            plays_yesterday = yesterday_map.get(sid, 0)

            listener_norm = listeners / max_listeners
            plays_norm = plays_today / max_plays

            if plays_yesterday > 0:
                growth_pct = (plays_today - plays_yesterday) / plays_yesterday * 100
                growth_norm = max(0.0, min(growth_pct / 100, 1.0))
            else:
                growth_pct = None
                growth_norm = 0.0

            score = 0.5 * listener_norm + 0.3 * growth_norm + 0.2 * plays_norm
            scored.append({
                'id': sid,
                'live_listeners': listeners,
                'plays_today': plays_today,
                'growth_pct': growth_pct,
                'score': score,
            })

        scored.sort(key=lambda x: x['score'], reverse=True)

        result = []
        for row in scored[:10]:
            if len(result) >= 5:
                break
            station = stations_col.find_one({'id': row['id'], 'is_active': True}, {'name': 1, 'genre': 1})
            if not station:
                continue
            entry = {
                'id': row['id'],
                'name': station['name'],
                'genre': station.get('genre'),
                'live_listeners': row['live_listeners'],
                'plays_today': row['plays_today'],
            }
            if row['growth_pct'] is not None:
                entry['growth_pct'] = round(row['growth_pct'], 1)
            result.append(entry)

        return jsonify({
            'stations': result,
            'updated_at': now.strftime('%Y-%m-%dT%H:%M:%SZ'),
        })

    except Exception as e:
        logging.error(f"Error fetching trending now: {e}")
        return jsonify({'error': 'Failed to fetch trending stations'}), 500


def register_analytics_commands(app):
    pass
