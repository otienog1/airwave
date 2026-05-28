export interface Station {
  id: number;
  name: string;
  description?: string;
  url: string;
  logo_url?: string;
  website?: string;
  genre: string;
  region: string;
  language?: string;
  frequency?: string;
  is_active?: boolean;
  is_live?: boolean;
  current_listeners?: number;
  total_plays?: number;
  rating?: number;
  favorites_count?: number;
  created_at?: string;
  updated_at?: string;
  // Legacy support
  listeners?: number;
  isLive?: boolean;
  logo?: string;
}
