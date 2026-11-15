export interface MediaItem {
  id: string;
  title: string;
  url: string;
  thumbnail?: string | null;
  duration?: number | null;
}

export interface Settings {
  speed: number;
  zoom: number;
  brightness: number;
  contrast: number;
  saturation: number;
}

export const DEFAULT_SETTINGS: Settings = {
  speed: 1, zoom: 1, brightness: 0, contrast: 1, saturation: 1,
};

export interface Job {
  job_id: string;
  status: "queued" | "in_progress" | "completed" | "waiting" | string;
  conclusion: string | null;
  created_at: string;
  url: string;
  outputs: number;
}

export interface LibFile {
  id: string;
  name: string;
  size: number;
  date_upload: string;
}

export interface ProcessItem {
  title: string;
  url?: string;
  pd_id?: string;
}
