import { useState, useEffect, useRef, useCallback } from 'react';
import { CLIENT_ROUTES } from '@/lib/routes';

const SESSION_KEY = 'airwave_session_id';
const DEVICE_KEY  = 'airwave_device_id';
const HEARTBEAT_MS = 20_000;
const COUNTS_POLL_MS = 15_000;

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

/**
 * Stable device identifier — lives in localStorage so it survives tab/browser
 * restarts. Used to build retention cohorts without requiring sign-in.
 */
function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return '';
  }
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
): Record<number, number> {
  const [listenerCounts, setListenerCounts] = useState<Record<number, number>>({});
  const sessionId      = useRef<string>('');
  const deviceId       = useRef<string>('');
  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const countsTimer    = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevStationId  = useRef<number | null>(null);

  useEffect(() => {
    sessionId.current = getOrCreateSessionId();
    deviceId.current  = getOrCreateDeviceId();
  }, []);

  const fetchCounts = useCallback(async () => {
    try {
      const res  = await fetch(CLIENT_ROUTES.listeners.counts);
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
        apiPost(CLIENT_ROUTES.listeners.heartbeat, { sessionId: sessionId.current });
      }
    }, HEARTBEAT_MS);
  }, [stopHeartbeat]);

  // Track based on currentStationId only — not isPlaying.
  // isPlaying is false during buffering/loading, which caused spurious
  // leave events every time the stream rebuffered. A user is a listener
  // from the moment they select a station.
  useEffect(() => {
    if (!sessionId.current) return;

    const sid = sessionId.current;

    if (currentStationId === null) {
      if (prevStationId.current !== null) {
        apiPost(CLIENT_ROUTES.listeners.leave, { sessionId: sid }).then(fetchCounts);
      }
      stopHeartbeat();
      prevStationId.current = null;
      return;
    }

    const stationChanged = currentStationId !== prevStationId.current;
    if (!stationChanged) return;

    const leavePromise = prevStationId.current !== null
      ? apiPost(CLIENT_ROUTES.listeners.leave, { sessionId: sid })
      : Promise.resolve();

    prevStationId.current = currentStationId;

    leavePromise.then(() =>
      apiPost(CLIENT_ROUTES.listeners.join, {
        sessionId: sid,
        deviceId: deviceId.current,
        stationId: currentStationId,
        stationName: currentStationName ?? '',
      }).then(fetchCounts)
    );

    startHeartbeat();
  }, [currentStationId, currentStationName, startHeartbeat, stopHeartbeat, fetchCounts]);

  // Poll counts on an interval
  useEffect(() => {
    fetchCounts();
    countsTimer.current = setInterval(fetchCounts, COUNTS_POLL_MS);
    return () => {
      if (countsTimer.current) clearInterval(countsTimer.current);
    };
  }, [fetchCounts]);

  // Leave on page unload
  useEffect(() => {
    const sendLeaveBeacon = () => {
      if (sessionId.current && prevStationId.current !== null) {
        navigator.sendBeacon(
          CLIENT_ROUTES.listeners.leave,
          new Blob([JSON.stringify({ sessionId: sessionId.current })], { type: 'application/json' })
        );
      }
    };
    window.addEventListener('beforeunload', sendLeaveBeacon);
    window.addEventListener('pagehide', sendLeaveBeacon);
    return () => {
      stopHeartbeat();
      if (sessionId.current && prevStationId.current !== null) {
        apiPost(CLIENT_ROUTES.listeners.leave, { sessionId: sessionId.current });
      }
      window.removeEventListener('beforeunload', sendLeaveBeacon);
      window.removeEventListener('pagehide', sendLeaveBeacon);
    };
  }, [stopHeartbeat]);

  return listenerCounts;
}
