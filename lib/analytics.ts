import { ObjectId } from 'mongodb';
import {
  getPlaysCollection,
  getSnapshotsCollection,
  PlayDocument,
  SnapshotDocument,
} from './mongodb';
import type { Station } from '@/types/Station';

// ── Writes ─────────────────────────────────────────────────────────────────

export interface TrackInfo {
  title: string;
  artist: string | null;
  song: string | null;
  duration: string | null;
  durationSeconds: number | null;
  startTime: string | null;
  category: string | null;
  genre: string | null;
  samplerate: number | null;
  source: 'zetta' | 'icecast' | 'icy' | null;
  bitrate: number | null;
  listeners: number | null;
}

/** Insert a new play event. Returns the inserted document's _id as a string. */
export async function insertPlay(station: Station, track: TrackInfo): Promise<string> {
  const plays = await getPlaysCollection();
  const doc: PlayDocument = {
    stationId: station.id,
    stationName: station.name,
    stationGenre: station.genre ?? null,
    stationRegion: station.region ?? null,
    stationFrequency: station.frequency ?? null,
    title: track.title,
    artist: track.artist,
    song: track.song,
    duration: track.duration,
    durationSeconds: track.durationSeconds,
    startTime: track.startTime,
    category: track.category,
    genre: track.genre,
    samplerate: track.samplerate,
    source: track.source,
    bitrate: track.bitrate,
    listeners: track.listeners,
    detectedAt: new Date(),
    endedAt: null,
    playDuration: null,
  };
  const result = await plays.insertOne(doc);
  return result.insertedId.toString();
}

/** Close a previous play by setting endedAt and computing playDuration. */
export async function closePlay(playId: string): Promise<void> {
  const plays = await getPlaysCollection();
  const endedAt = new Date();
  await plays.updateOne(
    { _id: new ObjectId(playId) },
    [
      {
        $set: {
          endedAt,
          playDuration: {
            $divide: [{ $subtract: [endedAt, '$detectedAt'] }, 1000],
          },
        },
      },
    ]
  );
}

/** Write a station health snapshot. */
export async function insertSnapshot(
  station: Station,
  isOnline: boolean,
  lastMetaSource: 'zetta' | 'icecast' | 'icy' | null,
  listeners: number | null
): Promise<void> {
  const snapshots = await getSnapshotsCollection();
  const doc: SnapshotDocument = {
    stationId: station.id,
    stationName: station.name,
    listeners,
    isOnline,
    lastMetaSource,
    snapshotAt: new Date(),
  };
  await snapshots.insertOne(doc);
}

// ── Reads ──────────────────────────────────────────────────────────────────

export interface TrendingEntry {
  title: string;
  artist: string | null;
  playCount: number;
  avgDuration: number | null;
  stations: string[];
  lastSeen: Date;
}

/** Top N songs by play count in the last `hours` hours. */
export async function getTrending(hours: number = 24, limit: number = 10): Promise<TrendingEntry[]> {
  const plays = await getPlaysCollection();
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  return plays.aggregate<TrendingEntry>([
    { $match: { detectedAt: { $gte: since }, title: { $exists: true } } },
    {
      $group: {
        _id: '$title',
        artist:      { $first: '$artist' },
        playCount:   { $sum: 1 },
        totalDur:    { $sum: { $ifNull: ['$playDuration', 0] } },
        completedCt: { $sum: { $cond: [{ $gt: ['$playDuration', 0] }, 1, 0] } },
        stations:    { $addToSet: '$stationName' },
        lastSeen:    { $max: '$detectedAt' },
      },
    },
    { $sort: { playCount: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        title:       '$_id',
        artist:      1,
        playCount:   1,
        avgDuration: {
          $cond: [
            { $gt: ['$completedCt', 0] },
            { $divide: ['$totalDur', '$completedCt'] },
            null,
          ],
        },
        stations:    1,
        lastSeen:    1,
      },
    },
  ]).toArray();
}

export interface StationPlayEntry {
  _id: string;
  title: string;
  artist: string | null;
  detectedAt: Date;
  endedAt: Date | null;
  playDuration: number | null;
  source: string | null;
}

/** Most recent plays for a station, newest first. */
export async function getStationHistory(stationId: number, limit: number = 50): Promise<StationPlayEntry[]> {
  const plays = await getPlaysCollection();
  return plays
    .find({ stationId })
    .sort({ detectedAt: -1 })
    .limit(limit)
    .project<StationPlayEntry>({
      _id: { $toString: '$_id' },
      title: 1,
      artist: 1,
      detectedAt: 1,
      endedAt: 1,
      playDuration: 1,
      source: 1,
    })
    .toArray();
}
