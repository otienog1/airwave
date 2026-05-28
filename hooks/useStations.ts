import { useState, useEffect } from 'react';
import { apiService, Station } from '@/lib/api';

export interface UseStationsParams {
  genre?: string;
  region?: string;
  search?: string;
  autoFetch?: boolean;
}

export function useStations(params: UseStationsParams = {}) {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<any>(null);

  const fetchStations = async (page = 1) => {
    setLoading(true);
    setError(null);

    const response = await apiService.getStations({
      ...params,
      page,
      include_stats: true,
    });

    if (response.error) {
      setError(response.error);
    } else if (response.data) {
      setStations(response.data.stations);
      setPagination(response.data.pagination);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (params.autoFetch !== false) {
      fetchStations();
    }
  }, [params.genre, params.region, params.search]);

  return {
    stations,
    loading,
    error,
    pagination,
    refetch: fetchStations,
  };
}