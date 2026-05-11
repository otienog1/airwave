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
  const [volume, setVolume] = useState(options.volume || 0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.crossOrigin = "anonymous";
      audioRef.current.preload = "none";
    }

    const audio = audioRef.current;

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      setError(null);
      options.onPlay?.(currentStation!);
    };

    const handlePause = () => {
      setIsPlaying(false);
      options.onPause?.();
    };

    const handleError = () => {
      const errorMsg = "Failed to load audio stream";
      setError(errorMsg);
      setIsLoading(false);
      setIsPlaying(false);
      options.onError?.(errorMsg);
    };

    const handleWaiting = () => {
      setIsLoading(true);
    };

    const handleLoadStart = () => {
      setIsLoading(true);
      setError(null);
    };

    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("error", handleError);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("loadstart", handleLoadStart);

    return () => {
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("loadstart", handleLoadStart);

      // Clean stop
      if (playPromiseRef.current) {
        playPromiseRef.current
          .then(() => {
            audio.pause();
          })
          .catch(() => {
            // Ignore cleanup errors
          });
      } else {
        audio.pause();
      }
    };
  }, [currentStation, options]);

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const playStation = useCallback(
    async (station: Station) => {
      if (!audioRef.current) return;

      const audio = audioRef.current;

      // If same station, toggle play/pause
      if (currentStation?.id === station.id) {
        if (isPlaying) {
          audio.pause();
        } else {
          try {
            playPromiseRef.current = audio.play();
            await playPromiseRef.current;
          } catch (error) {
            console.error("Play failed:", error);
            setError("Failed to play audio. Try again.");
          }
        }
        return;
      }

      // Stop current playback
      if (playPromiseRef.current) {
        try {
          await playPromiseRef.current;
          audio.pause();
        } catch (error) {
          // Ignore interruption errors
        }
      } else {
        audio.pause();
      }

      // Set new station
      setCurrentStation(station);
      setIsPlaying(false);
      setIsLoading(true);
      setError(null);

      // Load new audio
      audio.src = station.url;
      audio.load();

      // Try to play when ready
      try {
        playPromiseRef.current = audio.play();
        await playPromiseRef.current;
      } catch (error) {
        console.error("Autoplay failed:", error);
        setError("Click play to start listening");
        setIsLoading(false);
      }
    },
    [currentStation, isPlaying]
  );

  const togglePlay = useCallback(async () => {
    if (!audioRef.current || !currentStation) return;

    const audio = audioRef.current;

    if (isPlaying) {
      audio.pause();
    } else {
      try {
        playPromiseRef.current = audio.play();
        await playPromiseRef.current;
        setError(null);
      } catch (error) {
        console.error("Play failed:", error);
        setError("Failed to play audio. Try again.");
      }
    }
  }, [isPlaying, currentStation]);

  const handleVolumeChange = useCallback(
    (newVolume: number) => {
      setVolume(newVolume);
      if (newVolume === 0) {
        setIsMuted(true);
      } else if (isMuted) {
        setIsMuted(false);
      }
    },
    [isMuted]
  );

  const toggleMute = useCallback(() => {
    setIsMuted(!isMuted);
  }, [isMuted]);

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
