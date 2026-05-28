import { MongoClient, Collection, Db } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is not set');
}

const uri = process.env.MONGODB_URI;

const globalWithMongo = global as typeof globalThis & {
  _mongoClient?: MongoClient;
};

let client: MongoClient;

if (process.env.NODE_ENV === 'development') {
  if (!globalWithMongo._mongoClient) {
    globalWithMongo._mongoClient = new MongoClient(uri);
  }
  client = globalWithMongo._mongoClient;
} else {
  client = new MongoClient(uri);
}

export async function getDb(): Promise<Db> {
  await client.connect();
  return client.db();
}

export async function getPlaysCollection(): Promise<Collection<PlayDocument>> {
  const db = await getDb();
  return db.collection<PlayDocument>('plays');
}

export async function getSnapshotsCollection(): Promise<Collection<SnapshotDocument>> {
  const db = await getDb();
  return db.collection<SnapshotDocument>('stationSnapshots');
}

export interface PlayDocument {
  _id?: import('mongodb').ObjectId;
  stationId: number;
  stationName: string;
  stationGenre: string | null;
  stationRegion: string | null;
  stationFrequency: string | null;
  title: string;
  artist: string | null;
  song: string | null;
  duration: string | null;
  durationSeconds: number | null;
  category: string | null;
  source: 'zetta' | 'icecast' | 'icy' | null;
  bitrate: number | null;
  listeners: number | null;
  detectedAt: Date;
  endedAt: Date | null;
  playDuration: number | null;
}

export interface SnapshotDocument {
  _id?: import('mongodb').ObjectId;
  stationId: number;
  stationName: string;
  listeners: number | null;
  isOnline: boolean;
  lastMetaSource: 'zetta' | 'icecast' | 'icy' | null;
  snapshotAt: Date;
}

export async function ensureIndexes(): Promise<void> {
  const plays = await getPlaysCollection();
  const snapshots = await getSnapshotsCollection();

  await plays.createIndex({ detectedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90, name: 'ttl_90d' });
  await plays.createIndex({ stationId: 1, detectedAt: -1 }, { name: 'station_time' });
  await plays.createIndex({ title: 1, detectedAt: -1 }, { name: 'title_time' });
  await plays.createIndex({ stationGenre: 1, detectedAt: -1 }, { name: 'genre_time' });
  await plays.createIndex({ endedAt: 1 }, { name: 'open_plays', sparse: true });

  await snapshots.createIndex({ stationId: 1, snapshotAt: -1 }, { name: 'snapshot_station_time' });
  await snapshots.createIndex({ snapshotAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30, name: 'snapshot_ttl_30d' });
}
