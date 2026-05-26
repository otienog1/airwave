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
  streamUrl: string | null,
  station: Station | null,
  pollInterval = 15_000
): StreamMetadata {
  const [meta, setMeta] = useState<StreamMetadata>(EMPTY_META);
  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevTitleRef   = useRef<string | null>(null);
  const openPlayIdRef  = useRef<string | null>(null);
  const stationRef     = useRef<Station | null>(station);

  // Keep stationRef in sync so fetchMetadata closure always sees the latest station
  useEffect(() => { stationRef.current = station; }, [station]);

  const closeOpenPlay = useCallback(async () => {
    if (openPlayIdRef.current) {
      await patchClosePlay(openPlayIdRef.current);
      openPlayIdRef.current = null;
    }
  }, []);

  const fetchMetadata = useCallback(async (url: string) => {
    try {
      const res  = await fetch(`/api/stream-metadata?url=${encodeURIComponent(url)}`);
      const data: StreamMetadata = await res.json();
      const fullMeta = { ...EMPTY_META, ...data, loading: false };

      setMeta(fullMeta);

      // Detect title change — only record if we have a real title and station
      const currentStation = stationRef.current;
      if (data.title && data.title !== prevTitleRef.current && currentStation) {
        await closeOpenPlay();
        prevTitleRef.current = data.title;
        const playId = await postPlayEvent(currentStation, fullMeta);
        openPlayIdRef.current = playId;
      }

      // Fire-and-forget health snapshot
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
  }, [closeOpenPlay]);

  useEffect(() => {
    if (!streamUrl) {
      setMeta(EMPTY_META);
      prevTitleRef.current = null;
      closeOpenPlay();
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    setMeta(prev => ({ ...prev, loading: true }));
    fetchMetadata(streamUrl);

    timerRef.current = setInterval(() => fetchMetadata(streamUrl), pollInterval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [streamUrl, pollInterval, fetchMetadata, closeOpenPlay]);

  // Close open play on unmount
  useEffect(() => {
    return () => { closeOpenPlay(); };
  }, [closeOpenPlay]);

  return meta;
}
