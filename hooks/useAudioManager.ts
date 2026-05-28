import { useState, useRef, useCallback } from "react";
import type { Station } from "@/types/Station";

export function useAudioManager() {
  const [currentStation, setCurrentStation] = useState<Station | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playAttemptRef = useRef<boolean>(false);

  const initializeAudio = useCallback(() => {
    if (initialized || audioRef.current) return;

    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audio.preload = "none";
    // Don't set src - leave empty to avoid errors

    const handleCanPlay = () => {
      setIsLoading(false);
      if (playAttemptRef.current) {
        playAttemptRef.current = false;
        audio
          .play()
          .then(() => {
            setIsPlaying(true);
          })
          .catch(() => {
            setError("Click play to start listening");
          });
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
      setError(null);
    };

    const handlePause = () => setIsPlaying(false);
    const handleError = () => {
      if (audio.src && audio.src !== window.location.href) {
        setError("Failed to load audio stream");
        setIsLoading(false);
        setIsPlaying(false);
      }
    };

    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("error", handleError);

    audioRef.current = audio;
    setInitialized(true);
  }, [initialized]);

  const playStation = useCallback(
    (station: Station) => {
      initializeAudio();

      if (!audioRef.current) return;

      const audio = audioRef.current;

      if (currentStation?.id === station.id) {
        if (isPlaying) {
          audio.pause();
        } else if (audio.src && audio.src !== window.location.href) {
          audio.play().catch(() => setError("Failed to play audio"));
        }
        return;
      }

      setCurrentStation(station);
      setIsLoading(true);
      setError(null);
      playAttemptRef.current = true;

      audio.src = station.url;
      audio.volume = isMuted ? 0 : volume;
      audio.load();
    },
    [currentStation, isPlaying, isMuted, volume, initializeAudio]
  );

  const togglePlay = useCallback(() => {
    if (!audioRef.current || !currentStation) return;

    const audio = audioRef.current;
    if (isPlaying) {
      audio.pause();
    } else if (audio.src && audio.src !== window.location.href) {
      audio.play().catch(() => setError("Failed to play audio"));
    }
  }, [isPlaying, currentStation]);

  const updateVolume = useCallback(
    (newVolume: number) => {
      setVolume(newVolume);
      if (audioRef.current) {
        audioRef.current.volume = isMuted ? 0 : newVolume;
      }
    },
    [isMuted]
  );

  const toggleMute = useCallback(() => {
    setIsMuted(!isMuted);
    if (audioRef.current) {
      audioRef.current.volume = !isMuted ? 0 : volume;
    }
  }, [isMuted, volume]);

  return {
    currentStation,
    isPlaying,
    isLoading,
    volume,
    isMuted,
    error,
    playStation,
    togglePlay,
    updateVolume,
    toggleMute,
    clearError: () => setError(null),
  };
}
