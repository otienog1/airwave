import { useState, useEffect, useCallback, useRef } from 'react';
import { apiService } from '@/lib/api';

const LS_KEY = 'airwave_favorites';

function loadFromStorage(): Set<number> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? new Set<number>(JSON.parse(raw)) : new Set<number>();
  } catch {
    return new Set<number>();
  }
}

function saveToStorage(ids: Set<number>) {
  localStorage.setItem(LS_KEY, JSON.stringify(Array.from(ids)));
}

export function useFavorites(isAuthenticated: boolean) {
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [showHeart, setShowHeart] = useState(false);
  const heartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      apiService.getFavorites().then(res => {
        if (res.data) {
          const ids = new Set<number>(res.data.favorites.map(s => s.id));
          setFavorites(ids);
          saveToStorage(ids);
        }
      });
    } else {
      setFavorites(loadFromStorage());
    }
  }, [isAuthenticated]);

  const toggleFavorite = useCallback(
    async (stationId: number) => {
      const isFav = favorites.has(stationId);
      setFavorites(prev => {
        const next = new Set(prev);
        if (next.has(stationId)) {
          next.delete(stationId);
        } else {
          next.add(stationId);
        }
        saveToStorage(next);
        return next;
      });

      if (!isFav) {
        if (heartTimerRef.current) clearTimeout(heartTimerRef.current);
        setShowHeart(true);
        heartTimerRef.current = setTimeout(() => setShowHeart(false), 650);
      }

      if (isAuthenticated) {
        await apiService.toggleFavorite(stationId);
      }
    },
    [isAuthenticated, favorites]
  );

  return { favorites, toggleFavorite, showHeart };
}
