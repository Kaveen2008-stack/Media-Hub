export type Aspect = "original" | "9:16" | "1:1" | "16:9" | "4:5";
export type Look = "none" | "grayscale" | "sepia" | "invert";

export interface TextLayer {
  text: string;
  x: number;        // 0..1 (left..right)
  y: number;        // 0..1 (top..bottom)
  size: number;     // % of video height
  color: string;
  start: number;    // output-time seconds
  end: number | null;
  box: boolean;
}

export interface EditSpec {
  start: number;
  end: number | null;
  speed: number;
  rotate: 0 | 90 | 180 | 270;
  flipH: boolean;
  flipV: boolean;
  aspect: Aspect;
  zoom: number;
  panX: number;
  panY: number;
  height: number | null;
  brightness: number;
  contrast: number;
  saturation: number;
  gamma: number;
  hue: number;
  temperature: number;
  look: Look;
  blur: number;
  sharpen: number;
  vignette: number;
  grain: number;
  fadeIn: number;
  fadeOut: number;
  volume: number;
  mute: boolean;
  musicId: string | null;
  musicVolume: number;
  texts: TextLayer[];
  crf: number;
}

export const DEFAULT_SPEC: EditSpec = {
  start: 0, end: null, speed: 1,
  rotate: 0, flipH: false, flipV: false,
  aspect: "original", zoom: 1, panX: 0, panY: 0, height: null,
  brightness: 0, contrast: 1, saturation: 1, gamma: 1, hue: 0, temperature: 0, look: "none",
  blur: 0, sharpen: 0, vignette: 0, grain: 0, fadeIn: 0, fadeOut: 0,
  volume: 1, mute: false, musicId: null, musicVolume: 0.5,
  texts: [], crf: 20,
};

export const DEFAULT_TEXT: TextLayer = {
  text: "Your text", x: 0.5, y: 0.85, size: 6, color: "#ffffff", start: 0, end: null, box: true,
};

export const PRESETS: { name: string; patch: Partial<EditSpec> }[] = [
  { name: "Reset look", patch: { brightness: 0, contrast: 1, saturation: 1, gamma: 1, hue: 0, temperature: 0, look: "none", blur: 0, sharpen: 0, vignette: 0, grain: 0 } },
  { name: "Cinematic", patch: { contrast: 1.15, saturation: 0.9, temperature: -0.15, vignette: 0.5, grain: 6 } },
  { name: "Vivid", patch: { contrast: 1.1, saturation: 1.5, sharpen: 0.6 } },
  { name: "Warm", patch: { temperature: 0.5, saturation: 1.1, brightness: 0.03 } },
  { name: "Cool", patch: { temperature: -0.5, contrast: 1.05 } },
  { name: "Vintage", patch: { look: "sepia", contrast: 1.1, vignette: 0.6, grain: 12 } },
  { name: "B&W", patch: { look: "grayscale", contrast: 1.2 } },
  { name: "Dreamy", patch: { blur: 1.5, brightness: 0.06, saturation: 1.2 } },
];

export interface Job {
  job_id: string;
  status: string;
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
