import { useState, useRef, useEffect, useCallback } from "react";
import type { Station } from "@/types/Station";

interface UseAudioPlayerOptions {
  volume?: number;
  onPlay?: (station: Station) => void;
  onPause?: () => void;
  onError?: (error: string) => void;
}

export function useAudioPlayer(options: UseAudioPlayerOptions = {}) {
  const [currentStation, setCurrentStation] = useState<Station | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [volume, setVolume] = useState(options.volume ?? 0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);

  // Refs so event handlers always see the latest values without re-registering
  const currentStationRef = useRef<Station | null>(null);
  const isPlayingRef = useRef(false);
  const optionsRef = useRef(options);

  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const MAX_RECONNECT = 5;

  // Keep refs in sync with state/props
  useEffect(() => { currentStationRef.current = currentStation; }, [currentStation]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { optionsRef.current = options; });

  // Set up the audio element and attach listeners ONCE (empty deps).
  // Previously this had [currentStation, options] which caused the cleanup
  // to run on every station change — the cleanup's .then(audio.pause) fired
  // right after play() resolved, immediately pausing the stream.
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "none";
    audioRef.current = audio;

    const handleCanPlay = () => setIsLoading(false);

    // `play` fires when play() is called — too early, audio may still be buffering.
    // Only use it to reset reconnect state and call the onPlay callback.
    const handlePlay = () => {
      reconnectAttemptsRef.current = 0;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      setError(null);
    };

    // `playing` fires when audio actually becomes audible (after buffering).
    // This is the correct moment to flip isPlaying = true.
    const handlePlaying = () => {
      setIsPlaying(true);
      setIsLoading(false);
      if (currentStationRef.current) {
        optionsRef.current.onPlay?.(currentStationRef.current);
      }
    };

    const handlePause = () => {
      setIsPlaying(false);
      setIsLoading(false);
      optionsRef.current.onPause?.();
    };

    const handleError = () => {
      if (!audio.src || audio.src === window.location.href) return;
      setIsLoading(false);
      setIsPlaying(false);

      if (reconnectAttemptsRef.current < MAX_RECONNECT) {
        const delay = Math.min(2000 * 2 ** reconnectAttemptsRef.current, 30_000);
        reconnectAttemptsRef.current += 1;
        setError(
          `Stream lost. Reconnecting in ${delay / 1000}s… (${reconnectAttemptsRef.current}/${MAX_RECONNECT})`
        );
        reconnectTimerRef.current = setTimeout(() => {
          setError(null);
          setIsLoading(true);
          audio.load();
          audio.play().catch(() => {});
        }, delay);
      } else {
        const msg = "Stream unavailable. Please try again.";
        setError(msg);
        reconnectAttemptsRef.current = 0;
        optionsRef.current.onError?.(msg);
      }
    };

    const handleWaiting = () => setIsLoading(true);
    const handleLoadStart = () => { setIsLoading(true); setError(null); };

    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("playing", handlePlaying);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("error", handleError);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("loadstart", handleLoadStart);

    return () => {
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("playing", handlePlaying);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("loadstart", handleLoadStart);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      audio.pause();
      audio.src = "";
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync volume/mute to audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const playStation = useCallback(async (station: Station) => {
    if (!audioRef.current) return;
    const audio = audioRef.current;

    // Same station: toggle play/pause
    if (currentStationRef.current?.id === station.id) {
      if (isPlayingRef.current) {
        if (playPromiseRef.current) {
          try { await playPromiseRef.current; } catch {}
        }
        audio.pause();
      } else {
        setIsLoading(true);
        try {
          playPromiseRef.current = audio.play();
          await playPromiseRef.current;
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') return;
          console.error("Play failed:", err);
          setIsLoading(false);
          setError("Failed to play audio. Try again.");
        }
      }
      return;
    }

    // Interrupt any in-flight play immediately — don't await it.
    // The pending promise will reject with AbortError, which is silently ignored below.
    playPromiseRef.current = null;
    audio.pause();

    // Reset reconnect state for new station
    reconnectAttemptsRef.current = 0;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    setCurrentStation(station);
    setIsPlaying(false);
    setIsLoading(true);
    setError(null);

    audio.src = station.url;
    audio.load();

    try {
      playPromiseRef.current = audio.play();
      await playPromiseRef.current;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      // NotAllowedError = browser blocked autoplay
      setError("Click play to start listening");
      setIsLoading(false);
    }
  }, []);

  const togglePlay = useCallback(async () => {
    if (!audioRef.current || !currentStationRef.current) return;
    const audio = audioRef.current;

    if (isPlayingRef.current) {
      if (playPromiseRef.current) {
        try { await playPromiseRef.current; } catch {}
      }
      audio.pause();
    } else {
      setIsLoading(true);
      try {
        playPromiseRef.current = audio.play();
        await playPromiseRef.current;
        setError(null);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.error("Play failed:", err);
        setIsLoading(false);
        setError("Failed to play audio. Try again.");
      }
    }
  }, []);

  const handleVolumeChange = useCallback((newVolume: number) => {
    setVolume(newVolume);
    if (newVolume === 0) {
      setIsMuted(true);
    } else {
      setIsMuted(prev => (prev ? false : prev));
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  return {
    currentStation,
    isPlaying,
    isLoading,
    volume,
    isMuted,
    error,
    playStation,
    togglePlay,
    handleVolumeChange,
    toggleMute,
    clearError: () => setError(null),
  };
}
