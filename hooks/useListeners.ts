import { useState, useEffect, useRef, useCallback } from 'react';

const LS_KEY = 'airwave_session_id';
const HEARTBEAT_MS = 30_000;
const COUNTS_POLL_MS = 30_000;

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(LS_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(LS_KEY, id);
  }
  return id;
}

async function apiPost(path: string, body: object): Promise<void> {
  try {
    await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    // best-effort — never throw
  }
}

export function useListeners(
  currentStationId: number | null,
  currentStationName: string | null,
  isPlaying: boolean
): Record<number, number> {
  const [listenerCounts, setListenerCounts] = useState<Record<number, number>>({});
  const sessionId = useRef<string>('');
  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const countsTimer    = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevStationId  = useRef<number | null>(null);

  useEffect(() => {
    sessionId.current = getOrCreateSessionId();
  }, []);

  const fetchCounts = useCallback(async () => {
    try {
      const res = await fetch('/api/listeners/counts');
      const data = await res.json() as { counts: Record<number, number> };
      setListenerCounts(data.counts ?? {});
    } catch {
      // keep stale counts
    }
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current);
      heartbeatTimer.current = null;
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    stopHeartbeat();
    heartbeatTimer.current = setInterval(() => {
      if (sessionId.current) {
        apiPost('/api/listeners/heartbeat', { sessionId: sessionId.current });
      }
    }, HEARTBEAT_MS);
  }, [stopHeartbeat]);

  useEffect(() => {
    if (!sessionId.current) return;

    const sid = sessionId.current;
    const stationChanged = currentStationId !== prevStationId.current;

    if (!isPlaying || currentStationId === null) {
      if (prevStationId.current !== null) {
        apiPost('/api/listeners/leave', { sessionId: sid });
      }
      stopHeartbeat();
      prevStationId.current = null;
      return;
    }

    if (stationChanged) {
      if (prevStationId.current !== null) {
        apiPost('/api/listeners/leave', { sessionId: sid });
      }
      prevStationId.current = currentStationId;
      apiPost('/api/listeners/join', {
        sessionId: sid,
        stationId: currentStationId,
        stationName: currentStationName ?? '',
      });
      startHeartbeat();
      fetchCounts();
    }
  }, [isPlaying, currentStationId, currentStationName, startHeartbeat, stopHeartbeat, fetchCounts]);

  useEffect(() => {
    fetchCounts();
    countsTimer.current = setInterval(fetchCounts, COUNTS_POLL_MS);
    return () => {
      if (countsTimer.current) clearInterval(countsTimer.current);
    };
  }, [fetchCounts]);

  useEffect(() => {
    return () => {
      stopHeartbeat();
      if (sessionId.current && prevStationId.current !== null) {
        apiPost('/api/listeners/leave', { sessionId: sessionId.current });
      }
    };
  }, [stopHeartbeat]);

  return listenerCounts;
}
