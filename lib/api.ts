import type { Station } from '@/types/Station';
import { ENDPOINTS } from '@/lib/routes';

// Client-side: use relative path so requests go through the Next.js proxy (no CORS).
// Server-side (API routes): use absolute URL to reach the Flask backend directly.
const API_BASE_URL =
  typeof window === 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL || 'https://api.airwave.qzz.io/api')
    : '/api';

export type { Station } from '@/types/Station';

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
  private onUnauthorized?: () => void;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  setOnUnauthorized(fn: (() => void) | undefined): void {
    this.onUnauthorized = fn;
  }

  private async fetchWithRefresh(
    input: RequestInfo,
    init?: RequestInit
  ): Promise<Response> {
    const res = await fetch(input, { ...init, credentials: 'include' });
    if (res.status !== 401) return res;

    // Token refresh is only meaningful client-side (cookies live in the browser).
    // Server-side API routes have no session cookies, so skip refresh entirely.
    if (typeof window === 'undefined') return res;

    const refreshRes = await fetch(this.baseUrl + ENDPOINTS.auth.refresh, {
      method: 'POST',
      credentials: 'include',
    });

    if (!refreshRes.ok) {
      this.onUnauthorized?.();
      return res;
    }

    return fetch(input, { ...init, credentials: 'include' });
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
      const response = await this.fetchWithRefresh(url, { ...options, headers });

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
    return this.request<{ user: User }>(ENDPOINTS.auth.login, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(email: string, username: string, password: string): Promise<ApiResponse<{ user: User }>> {
    return this.request<{ user: User }>(ENDPOINTS.auth.register, {
      method: 'POST',
      body: JSON.stringify({ email, username, password }),
    });
  }

  async getProfile(): Promise<ApiResponse<{ user: User }>> {
    return this.request<{ user: User }>(ENDPOINTS.auth.profile);
  }

  async forgotPassword(email: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(ENDPOINTS.auth.forgotPassword, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, password: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(ENDPOINTS.auth.resetPassword, {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  }

  async googleAuth(accessToken: string): Promise<ApiResponse<{ user: User; message: string }>> {
    return this.request<{ user: User; message: string }>(ENDPOINTS.auth.google, {
      method: 'POST',
      body: JSON.stringify({ access_token: accessToken }),
    });
  }

  async updateProfile(username: string, email: string): Promise<ApiResponse<{ user: User; message: string }>> {
    return this.request<{ user: User; message: string }>(ENDPOINTS.auth.profile, {
      method: 'PUT',
      body: JSON.stringify({ username, email }),
    });
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(ENDPOINTS.auth.changePassword, {
      method: 'POST',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
  }

  async logout(): Promise<void> {
    // Plain fetch: logout doesn't require auth so no refresh retry needed
    await fetch(this.baseUrl + ENDPOINTS.auth.logout, {
      method: 'POST',
      credentials: 'include',
    });
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

    const endpoint = `${ENDPOINTS.stations.list}?${queryParams.toString()}`;
    return this.request<{ stations: Station[]; pagination: any }>(endpoint);
  }

  async getStation(id: number): Promise<ApiResponse<{ station: Station }>> {
    return this.request<{ station: Station }>(ENDPOINTS.stations.detail(id));
  }

  async playStation(id: number): Promise<ApiResponse<{ station: Station }>> {
    return this.request<{ station: Station }>(ENDPOINTS.stations.play(id), {
      method: 'POST',
    });
  }

  async toggleFavorite(id: number): Promise<ApiResponse<{ is_favorited: boolean; station: Station }>> {
    return this.request<{ is_favorited: boolean; station: Station }>(ENDPOINTS.stations.favorite(id), {
      method: 'POST',
    });
  }

  async getFavorites(): Promise<ApiResponse<{ favorites: Station[] }>> {
    return this.request<{ favorites: Station[] }>(ENDPOINTS.stations.favorites);
  }

  async getGenres(): Promise<ApiResponse<{ genres: string[] }>> {
    return this.request<{ genres: string[] }>(ENDPOINTS.stations.genres);
  }

  async getRegions(): Promise<ApiResponse<{ regions: string[] }>> {
    return this.request<{ regions: string[] }>(ENDPOINTS.stations.regions);
  }

  async getAllStations(): Promise<ApiResponse<{ stations: Station[] }>> {
    return this.request<{ stations: Station[] }>(ENDPOINTS.admin.stations);
  }

  async createStation(data: Partial<Station>): Promise<ApiResponse<{ station: Station }>> {
    return this.request<{ station: Station }>(ENDPOINTS.admin.stations, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateStation(id: number, data: Partial<Station>): Promise<ApiResponse<{ station: Station }>> {
    return this.request<{ station: Station }>(ENDPOINTS.admin.station(id), {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteStation(id: number): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(ENDPOINTS.admin.station(id), {
      method: 'DELETE',
    });
  }
}

export const apiService = new ApiService();
