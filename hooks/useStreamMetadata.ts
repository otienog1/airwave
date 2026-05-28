import { useState, useEffect, useRef, useCallback } from 'react';
import type { Station } from '@/types/Station';

export interface StreamMetadata {
  title: string | null;
  artist: string | null;
  song: string | null;
  duration: string | null;
  durationSeconds: number | null;
  startTime: string | null;
  category: string | null;
  stationName: string | null;
  genre: string | null;
  bitrate: number | null;
  samplerate: number | null;
  listeners: number | null;
  source: 'zetta' | 'icecast' | 'icy' | null;
  loading: boolean;
}

const EMPTY_META: StreamMetadata = {
  title: null, artist: null, song: null,
  duration: null, durationSeconds: null, startTime: null, category: null,
  stationName: null, genre: null, bitrate: null, samplerate: null, listeners: null,
  source: null, loading: false,
};

const SMART_POLL_BUFFER_MS = 2_000;
const SMART_POLL_MIN_MS   = 2_000;
const SMART_POLL_MAX_MS   = 10 * 60 * 1000;

function parseDurationString(duration: string): number | null {
  const parts = duration.split(':');
  if (parts.length !== 2) return null;
  const [mm, ss] = parts.map(Number);
  if (isNaN(mm) || isNaN(ss)) return null;
  return mm * 60 + ss;
}

function msUntilSongEnd(data: StreamMetadata): number | null {
  const startMs = data.startTime ? new Date(data.startTime).getTime() : null;
  if (!startMs || isNaN(startMs)) return null;

  const durationSec =
    data.durationSeconds ??
    (data.duration ? parseDurationString(data.duration) : null);
  if (durationSec == null) return null;

  const songEndsAt = startMs + durationSec * 1000;
  const remaining  = songEndsAt - Date.now();

  if (remaining <= SMART_POLL_MIN_MS) return null;
  if (remaining > SMART_POLL_MAX_MS)  return null;
  return remaining;
}

async function postPlayEvent(station: Station, meta: StreamMetadata): Promise<string | null> {
  try {
    const res = await fetch('/api/analytics/play-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        station,
        track: {
          title:           meta.title,
          artist:          meta.artist,
          song:            meta.song,
          duration:        meta.duration,
          durationSeconds: meta.durationSeconds,
          category:        meta.category,
          source:          meta.source,
          bitrate:         meta.bitrate,
          listeners:       meta.listeners,
        },
      }),
    });
    const data = await res.json();
    return data.playId ?? null;
  } catch {
    return null;
  }
}

async function patchClosePlay(playId: string): Promise<void> {
  try {
    await fetch('/api/analytics/play-event', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playId }),
    });
  } catch {
    // best-effort
  }
}

export function useStreamMetadata(
  stationId: number | null,
  station: Station | null,
  pollInterval = 15_000
): StreamMetadata {
  const [meta, setMeta] = useState<StreamMetadata>(EMPTY_META);
  const timerRef          = useRef<ReturnType<typeof setInterval> | null>(null);
  const smartPollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevTitleRef      = useRef<string | null>(null);
  const openPlayIdRef     = useRef<string | null>(null);
  const stationRef        = useRef<Station | null>(station);
  const stationIdRef      = useRef<number | null>(stationId);

  useEffect(() => { stationRef.current  = station;   }, [station]);
  useEffect(() => { stationIdRef.current = stationId; }, [stationId]);

  const cancelSmartPoll = useCallback(() => {
    if (smartPollTimerRef.current) {
      clearTimeout(smartPollTimerRef.current);
      smartPollTimerRef.current = null;
    }
  }, []);

  const closeOpenPlay = useCallback(async () => {
    if (openPlayIdRef.current) {
      await patchClosePlay(openPlayIdRef.current);
      openPlayIdRef.current = null;
    }
  }, []);

  const fetchMetadata = useCallback(async (id: number) => {
    try {
      const res      = await fetch(`/api/stream-metadata?id=${id}`);
      const data: StreamMetadata = await res.json();
      const fullMeta = { ...EMPTY_META, ...data, loading: false };

      setMeta(fullMeta);

      // Cancel previous smart poll, then reschedule for current song's end
      cancelSmartPoll();
      const remaining = msUntilSongEnd(data);
      if (remaining !== null) {
        const delay = remaining + SMART_POLL_BUFFER_MS;
        smartPollTimerRef.current = setTimeout(() => {
          smartPollTimerRef.current = null;
          const currentId = stationIdRef.current;
          if (currentId != null) fetchMetadata(currentId);
        }, delay);
      }

      const currentStation = stationRef.current;
      if (data.title && data.title !== prevTitleRef.current && currentStation) {
        await closeOpenPlay();
        prevTitleRef.current = data.title;
        const playId = await postPlayEvent(currentStation, fullMeta);
        openPlayIdRef.current = playId;
      }

      if (currentStation) {
        fetch('/api/analytics/snapshot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            station: currentStation,
            isOnline: true,
            lastMetaSource: data.source ?? null,
            listeners: data.listeners ?? null,
          }),
        }).catch(() => {});
      }
    } catch {
      setMeta(prev => ({ ...prev, loading: false }));
      const currentStation = stationRef.current;
      if (currentStation) {
        fetch('/api/analytics/snapshot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ station: currentStation, isOnline: false, lastMetaSource: null, listeners: null }),
        }).catch(() => {});
      }
    }
  }, [closeOpenPlay, cancelSmartPoll]);

  useEffect(() => {
    if (stationId == null) {
      setMeta(EMPTY_META);
      prevTitleRef.current = null;
      cancelSmartPoll();
      closeOpenPlay();
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    setMeta(prev => ({ ...prev, loading: true }));
    fetchMetadata(stationId);

    timerRef.current = setInterval(() => fetchMetadata(stationId), pollInterval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      cancelSmartPoll();
    };
  }, [stationId, pollInterval, fetchMetadata, closeOpenPlay, cancelSmartPoll]);

  useEffect(() => {
    return () => {
      closeOpenPlay();
      cancelSmartPoll();
    };
  }, [closeOpenPlay, cancelSmartPoll]);

  return meta;
}
