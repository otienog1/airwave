const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface Station {
  id: number;
  name: string;
  description: string;
  url: string;
  logo_url?: string;
  website?: string;
  genre: string;
  region: string;
  language: string;
  frequency?: string;
  is_active: boolean;
  is_live: boolean;
  current_listeners?: number;
  total_plays?: number;
  rating?: number;
  favorites_count?: number;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  email: string;
  username: string;
  is_admin: boolean;
  last_login?: string;
  created_at: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

async function fetchWithRefresh(
  input: RequestInfo,
  init?: RequestInit
): Promise<Response> {
  const res = await fetch(input, { ...init, credentials: 'include' });
  if (res.status !== 401) return res;

  // Attempt silent token refresh
  const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!refreshRes.ok) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth:expired'));
    }
    return res; // return original 401 to caller
  }

  // Retry original request once with new access cookie
  return fetch(input, { ...init, credentials: 'include' });
}

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    try {
      const response = await fetchWithRefresh(url, { ...options, headers });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error || 'Request failed' };
      }

      return { data };
    } catch {
      return { error: 'Network error occurred' };
    }
  }

  // Auth methods
  async login(email: string, password: string): Promise<ApiResponse<{ user: User }>> {
    return this.request<{ user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(email: string, username: string, password: string): Promise<ApiResponse<{ user: User }>> {
    return this.request<{ user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, username, password }),
    });
  }

  async getProfile(): Promise<ApiResponse<{ user: User }>> {
    return this.request<{ user: User }>('/auth/profile');
  }

  async logout(): Promise<void> {
    await fetchWithRefresh(`${this.baseUrl}/auth/logout`, { method: 'POST' });
  }

  // Station methods
  async getStations(params?: {
    genre?: string;
    region?: string;
    search?: string;
    page?: number;
    per_page?: number;
    include_stats?: boolean;
  }): Promise<ApiResponse<{ stations: Station[]; pagination: any }>> {
    const queryParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const endpoint = `/stations?${queryParams.toString()}`;
    return this.request<{ stations: Station[]; pagination: any }>(endpoint);
  }

  async getStation(id: number): Promise<ApiResponse<{ station: Station }>> {
    return this.request<{ station: Station }>(`/stations/${id}`);
  }

  async playStation(id: number): Promise<ApiResponse<{ station: Station }>> {
    return this.request<{ station: Station }>(`/stations/${id}/play`, {
      method: 'POST',
    });
  }

  async toggleFavorite(id: number): Promise<ApiResponse<{ is_favorited: boolean; station: Station }>> {
    return this.request<{ is_favorited: boolean; station: Station }>(`/stations/${id}/favorite`, {
      method: 'POST',
    });
  }

  async getFavorites(): Promise<ApiResponse<{ favorites: Station[] }>> {
    return this.request<{ favorites: Station[] }>('/stations/favorites');
  }

  async getGenres(): Promise<ApiResponse<{ genres: string[] }>> {
    return this.request<{ genres: string[] }>('/stations/genres');
  }

  async getRegions(): Promise<ApiResponse<{ regions: string[] }>> {
    return this.request<{ regions: string[] }>('/stations/regions');
  }
}

export const apiService = new ApiService();