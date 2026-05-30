import { useState, useEffect, useCallback } from 'react';
import { apiService, Station } from '@/lib/api';

const CACHE_TTL_MS = 60_000;
let cachedStations: Station[] | null = null;
let cacheExpiresAt = 0;

export function clearStationsCache() {
  cachedStations = null;
  cacheExpiresAt = 0;
}

export interface UseStationsParams {
  genre?: string;
  region?: string;
  search?: string;
  autoFetch?: boolean;
}

export function useStations(params: UseStationsParams = {}) {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(params.autoFetch !== false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<any>(null);

  const { genre, region, search } = params;

  const fetchStations = useCallback(async (page = 1) => {
    // Serve from cache on first page if still fresh (no filter active)
    if (page === 1 && !genre && !region && !search && cachedStations && Date.now() < cacheExpiresAt) {
      setStations(cachedStations);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const response = await apiService.getStations({
      genre, region, search,
      page,
      include_stats: true,
    });

    if (response.error) {
      setError(response.error);
    } else if (response.data) {
      setStations(response.data.stations);
      setPagination(response.data.pagination);
      // Cache only unfiltered page-1 results
      if (page === 1 && !genre && !region && !search) {
        cachedStations = response.data.stations;
        cacheExpiresAt = Date.now() + CACHE_TTL_MS;
      }
    }

    setLoading(false);
  }, [genre, region, search]);

  useEffect(() => {
    if (params.autoFetch !== false) {
      fetchStations();
    }
  }, [fetchStations, params.autoFetch]);

  return {
    stations,
    loading,
    error,
    pagination,
    refetch: fetchStations,
  };
}
