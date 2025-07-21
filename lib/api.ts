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

class ApiService {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    this.baseUrl = API_BASE_URL;
    // Get token from localStorage if available
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('access_token');
    }
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

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error || 'Request failed' };
      }

      return { data };
    } catch (error) {
      return { error: 'Network error occurred' };
    }
  }

  // Auth methods
  async login(email: string, password: string): Promise<ApiResponse<{ user: User; access_token: string; refresh_token: string }>> {
    const response = await this.request<{ user: User; access_token: string; refresh_token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.data?.access_token) {
      this.setToken(response.data.access_token);
      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('refresh_token', response.data.refresh_token);
    }

    return response;
  }

  async register(email: string, username: string, password: string): Promise<ApiResponse<{ user: User; access_token: string; refresh_token: string }>> {
    const response = await this.request<{ user: User; access_token: string; refresh_token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, username, password }),
    });

    if (response.data?.access_token) {
      this.setToken(response.data.access_token);
      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('refresh_token', response.data.refresh_token);
    }

    return response;
  }

  async getProfile(): Promise<ApiResponse<{ user: User }>> {
    return this.request<{ user: User }>('/auth/profile');
  }

  logout() {
    this.token = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  setToken(token: string) {
    this.token = token;
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