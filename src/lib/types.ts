export type Sport = "running" | "cycling" | "hiking" | "walking" | "swimming";
export type Theme = "dark" | "light";
export type Lang = "pt-BR" | "en-US";
export type ExportFormat = "mp4" | "png";

/** A single sample along the track. */
export interface TrackPoint {
  lat: number;
  lng: number;
  ele: number | null;
  t: number | null; // epoch ms
  hr: number | null;
}

/** [lng, lat] — GeoJSON / MapLibre ordering. */
export type LngLat = [number, number];

/** Result of parsing an uploaded activity file. */
export interface ParseResult {
  points: TrackPoint[];
  sport?: Sport | null;
  calories?: number | null;
  location?: string | null;
  name?: string | null;
}

export type OverlayKey =
  | "distance"
  | "duration"
  | "pace"
  | "maxspeed"
  | "elevgain"
  | "elevchart"
  | "hr"
  | "calories"
  | "datetime"
  | "routemap"
  | "name"
  | "weather";

export type Overlays = Record<OverlayKey, boolean>;

/** Everything the user can tweak. Serialisable → shareable via the URL. */
export interface Settings {
  sport: Sport;
  athleteName: string;
  location: string;
  theme: Theme;
  accent: string;
  lang: Lang;
  durationSec: number;
  overlays: Overlays;
  cameraPitch: number; // 0..70 degrees
  introOutro: boolean;
  exportFormat: ExportFormat;
}

/** Pre-computed track statistics used by the render loop. */
export interface Stats {
  sport: Sport;
  coords: LngLat[];
  cum: number[]; // cumulative distance (m) per point
  ele: (number | null)[];
  hr: (number | null)[];
  gain: number[]; // cumulative elevation gain (m)
  spd: number[]; // per-point speed (km/h); empty when no timing
  times: number[] | null; // relative seconds from start; null when no timing
  total: number; // total distance (m)
  hasTime: boolean;
  hasEle: boolean;
  hasHr: boolean;
  dur: number; // seconds (real duration, or fallback video length)
  maxSpeed: number; // km/h
  calories: number;
  eMin: number;
  eMax: number;
  startDate: Date | null;
  chaseZoom: number;
}

/** A sampled instant along the route (interpolated) for the HUD. */
export interface CurSample {
  lng: number;
  lat: number;
  idx: number;
  dist: number;
  ele: number | null;
  hr: number | null;
  spd: number | null;
  elapsed: number;
  gain: number;
  cal: number;
}

/** Meta suggested by a parse, merged into Settings while respecting user overrides. */
export interface ParsedMeta {
  fileName: string;
  sport: Sport | null;
  athleteName: string | null;
  location: string | null;
}

/** State the engine pushes up to React for rendering the chrome. */
export interface DisplayState {
  ready: boolean;
  /** True once the map has painted its first frame — used to hold the loader. */
  mapReady: boolean;
  hasData: boolean;
  loading: boolean;
  error: string | null;
  playing: boolean;
  recording: boolean;
  exportPct: number;
  exportStage: string;
  fileName: string;
  sumDist: string;
  sumDur: string;
  sumPts: string;
}
