import { NextRequest, NextResponse } from 'next/server';
import { stations } from '@/lib/stations';

// ── Types ──────────────────────────────────────────────────────────────────

export interface StreamInfo {
  // Now Playing
  title: string | null;          // "Artist - Song" composite
  artist: string | null;         // Artist name when known separately
  song: string | null;           // Track title when known separately
  duration: string | null;       // "MM:SS" from Zetta
  durationSeconds: number | null;// Duration as a float
  startTime: string | null;      // ISO 8601 timestamp (Zetta StartTime)
  category: string | null;       // Zetta category code e.g. "U1", "D"

  // Stream / station
  stationName: string | null;    // icy-name or Icecast server_name
  genre: string | null;          // icy-genre or Icecast genre
  bitrate: number | null;        // kbps
  samplerate: number | null;     // Hz (Icecast only)
  listeners: number | null;      // Current listener count (Icecast only)

  // Diagnostics
  source: 'zetta' | 'icecast' | 'icy' | null;
}

const EMPTY: StreamInfo = {
  title: null, artist: null, song: null,
  duration: null, durationSeconds: null, startTime: null, category: null,
  stationName: null, genre: null, bitrate: null, samplerate: null, listeners: null,
  source: null,
};

// ── XML helpers ────────────────────────────────────────────────────────────

function xmlAttr(fragment: string, name: string): string | null {
  const m = new RegExp(`\\b${name}="([^"]*)"`).exec(fragment);
  if (!m) return null;
  return m[1]
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .trim();
}

/**
 * RCS Zetta playout system embeds its XML event log in ICY StreamTitle.
 * Extract current-song fields from the <LogEvent Status="CURRENT"> block.
 */
function parseZettaXml(xml: string): Partial<StreamInfo> | null {
  if (!xml.includes('ZettaLite') && !xml.includes('LogEvent')) return null;

  const eventRe = /<LogEvent\b([^>]*)>([\s\S]*?)<\/LogEvent>/g;
  let m: RegExpExecArray | null;

  while ((m = eventRe.exec(xml)) !== null) {
    const [, evAttrs, body] = m;
    if (xmlAttr(evAttrs, 'Type') !== 'SONG') continue;
    if (xmlAttr(evAttrs, 'Status') !== 'CURRENT') continue;

    const assetM = /<Asset\b([^>]*)\/?>/.exec(body);
    if (!assetM) continue;
    const aAttrs = assetM[1];

    const song   = xmlAttr(aAttrs, 'Title');
    const artist = xmlAttr(aAttrs, 'Artist1');
    if (!song) continue;

    const totalLengthRaw = xmlAttr(aAttrs, 'TotalLength');
    const durationSeconds = totalLengthRaw ? parseFloat(totalLengthRaw) : null;

    // Convert float seconds → "MM:SS"
    let duration: string | null = null;
    if (durationSeconds != null && !isNaN(durationSeconds)) {
      const m = Math.floor(durationSeconds / 60);
      const s = Math.floor(durationSeconds % 60);
      duration = `${m}:${s.toString().padStart(2, '0')}`;
    }
    // Prefer Zetta's own Duration attribute ("03:28") if present
    const zetDuration = xmlAttr(evAttrs, 'Duration');
    if (zetDuration) duration = zetDuration;

    return {
      song,
      artist: artist || null,
      title: artist ? `${artist} - ${song}` : song,
      duration,
      durationSeconds: durationSeconds ?? null,
      startTime: xmlAttr(evAttrs, 'StartTime'),
      category: xmlAttr(aAttrs, 'Category'),
      source: 'zetta',
    };
  }
  return null;
}

/** Returns true for placeholder titles that carry no real information. */
function isMeaningless(s: string): boolean {
  const t = s.trim().replace(/\s+/g, ' ');
  // Empty, lone dashes/dots, "artist - " with no track, common placeholders
  return (
    !t ||
    /^[-–—.]+$/.test(t) ||          // "–", "-", "---", "..."
    /^[-–—]\s*$/.test(t) ||          // "- "
    /^\s*[-–—]\s*$/.test(t) ||       // " - "
    t.toLowerCase() === 'unknown' ||
    t.toLowerCase() === 'n/a' ||
    t.toLowerCase() === 'no artist' ||
    t === '-'
  );
}

/** Normalise a raw StreamTitle string. May contain Zetta XML or plain text. */
function parseRawTitle(raw: string): Partial<StreamInfo> {
  const trimmed = raw.trim();
  if (!trimmed || isMeaningless(trimmed)) return { title: null, song: null };

  if (trimmed.startsWith('<?xml') || trimmed.startsWith('<ZettaLite') || trimmed.includes('<LogEvent')) {
    return parseZettaXml(trimmed) ?? { title: null };
  }

  return { title: trimmed, song: trimmed };
}

// ── ICY stream fetch ───────────────────────────────────────────────────────

const STREAM_TITLE_RE = /StreamTitle='([^']*)'/;

async function fetchIcyData(streamUrl: string): Promise<Partial<StreamInfo>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(streamUrl, {
      headers: { 'Icy-MetaData': '1', 'User-Agent': 'WinampMPEG/5.0' },
      signal: controller.signal,
    });

    const partial: Partial<StreamInfo> = { source: 'icy' };

    // Station-level headers present regardless of metadata interval
    const icyName   = res.headers.get('icy-name');
    const icyGenre  = res.headers.get('icy-genre');
    const icyBr     = res.headers.get('icy-br');

    if (icyName)  partial.stationName = icyName;
    if (icyGenre) partial.genre       = icyGenre;
    if (icyBr)    partial.bitrate     = parseInt(icyBr) || null;

    const metaInt = parseInt(res.headers.get('icy-metaint') ?? '0');
    if (!metaInt || !res.body) return partial;

    // Read just enough bytes to reach the first metadata block
    const reader  = res.body.getReader();
    const needed  = metaInt + 1 + 512;
    const chunks: Uint8Array[] = [];
    let total = 0;

    try {
      while (total < needed) {
        const { done, value } = await reader.read();
        if (done || !value) break;
        chunks.push(value);
        total += value.length;
      }
    } finally {
      reader.cancel().catch(() => {});
    }

    if (total <= metaInt) return partial;

    const buf = new Uint8Array(total);
    let off = 0;
    for (const chunk of chunks) { buf.set(chunk, off); off += chunk.length; }

    const metaLenByte = buf[metaInt];
    if (!metaLenByte) return partial;

    const metaText = new TextDecoder('utf-8', { fatal: false }).decode(
      buf.slice(metaInt + 1, metaInt + 1 + metaLenByte * 16)
    );

    const titleMatch = STREAM_TITLE_RE.exec(metaText);
    const rawTitle   = titleMatch?.[1] ?? null;

    return { ...partial, ...parseRawTitle(rawTitle ?? '') };
  } catch {
    return {};
  } finally {
    clearTimeout(timer);
  }
}

// ── Icecast JSON fetch ─────────────────────────────────────────────────────

async function fetchIcecastData(streamUrl: string): Promise<Partial<StreamInfo>> {
  try {
    const url       = new URL(streamUrl);
    const statusUrl = `${url.protocol}//${url.host}/status-json.xsl`;

    const res = await fetch(statusUrl, {
      headers: { 'User-Agent': 'AirWave/1.0' },
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) return {};

    const data    = await res.json();
    const sources = data?.icestats?.source;
    if (!sources) return {};

    const arr: any[] = Array.isArray(sources) ? sources : [sources];
    const src = arr.find(s => s.listenurl?.endsWith(url.pathname)) ?? arr[0];

    const rawTitle = src?.title ?? src?.song ?? null;
    const titleInfo = rawTitle ? parseRawTitle(String(rawTitle)) : {};

    return {
      ...titleInfo,
      stationName: src?.server_name ?? null,
      genre:       src?.genre ?? null,
      bitrate:     src?.bitrate != null ? parseInt(src.bitrate) || null : null,
      samplerate:  src?.samplerate != null ? parseInt(src.samplerate) || null : null,
      listeners:   src?.listeners != null ? parseInt(src.listeners) || null : null,
      source: 'icecast',
    };
  } catch {
    return {};
  }
}

// ── Handler ────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const idParam = req.nextUrl.searchParams.get('id');
  if (!idParam) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const id = parseInt(idParam, 10);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const station = stations.find(s => s.id === id);
  if (!station) return NextResponse.json({ error: 'Station not found' }, { status: 404 });

  const streamUrl = station.url;

  // Try Icecast JSON first (no audio data download)
  const icecast = await fetchIcecastData(streamUrl);

  // If Icecast gave us a title we're done; otherwise also read ICY stream
  const icy = icecast.title ? {} : await fetchIcyData(streamUrl);

  // Merge: ICY stream-level headers fill in gaps left by Icecast JSON
  const merged: StreamInfo = { ...EMPTY, ...icy, ...icecast };

  return NextResponse.json(merged, {
    headers: { 'Cache-Control': 's-maxage=15, stale-while-revalidate=30' },
  });
}
