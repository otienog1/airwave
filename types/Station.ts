export interface Station {
  id: number;
  name: string;
  url: string;
  genre: string;
  region: string;
  logo?: string;
  listeners?: number;
  isLive?: boolean;
  description?: string;
}