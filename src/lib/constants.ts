import type { OverlayKey, Overlays, Settings, Sport, Theme } from "./types";

export const STAGE_W = 1080;
export const STAGE_H = 1920;
export const EXPORT_FPS = 30;

export const SPORT_OPTIONS: { value: Sport; label: string }[] = [
  { value: "running", label: "Running" },
  { value: "cycling", label: "Cycling" },
  { value: "hiking", label: "Trail / hiking" },
  { value: "walking", label: "Walking" },
  { value: "swimming", label: "Swimming" },
];

export const SPORT_SHORT: Record<Sport, string> = {
  running: "Run",
  cycling: "Ride",
  hiking: "Hike",
  walking: "Walk",
  swimming: "Swim",
};

export const SPORT_BADGE: Record<Sport, string> = {
  running: "RUN",
  cycling: "RIDE",
  hiking: "HIKE",
  walking: "WALK",
  swimming: "SWIM",
};

/** Approximate MET values used to estimate calories when a file has none. */
export const MET_BY_SPORT: Record<Sport, number> = {
  running: 9.8,
  cycling: 7.5,
  hiking: 6.0,
  walking: 3.8,
  swimming: 8.0,
};

export const OVERLAY_ORDER: OverlayKey[] = [
  "distance",
  "duration",
  "pace",
  "maxspeed",
  "elevgain",
  "elevchart",
  "hr",
  "calories",
  "datetime",
  "routemap",
  "name",
  "weather",
];

export const OVERLAY_LABELS: Record<OverlayKey, string> = {
  distance: "Distance",
  duration: "Duration",
  pace: "Pace / speed",
  maxspeed: "Max speed",
  elevgain: "Elev gain",
  elevchart: "Elev chart",
  hr: "Heart rate",
  calories: "Calories",
  datetime: "Date & location",
  routemap: "Route map",
  name: "Athlete name",
  weather: "Weather",
};

/** The default accent per theme: green on dark, orange on light. */
export const THEME_DEFAULT_ACCENT: Record<Theme, string> = {
  dark: "#C8FF3D",
  light: "#FF5A1F",
};

export const ACCENT_PRESETS: { value: string; name: string }[] = [
  { value: "#C8FF3D", name: "Volt" },
  { value: "#FF5A1F", name: "Ember" },
  { value: "#22D3EE", name: "Cyan" },
  { value: "#FF3D7F", name: "Rose" },
  { value: "#A78BFA", name: "Violet" },
  { value: "#FACC15", name: "Amber" },
];

export const DEFAULT_OVERLAYS: Overlays = {
  distance: true,
  duration: true,
  pace: true,
  maxspeed: false,
  elevgain: false,
  elevchart: false,
  hr: false,
  calories: false,
  datetime: false,
  routemap: false,
  name: true,
  weather: false,
};

export const DURATION_MIN = 6;
export const DURATION_MAX = 60;
export const PITCH_MIN = 0;
export const PITCH_MAX = 70;

export const DEFAULT_SETTINGS: Settings = {
  sport: "running",
  athleteName: "",
  location: "",
  theme: "dark",
  accent: "#C8FF3D",
  lang: "pt-BR",
  durationSec: 20,
  overlays: { ...DEFAULT_OVERLAYS },
  cameraPitch: 55,
  introOutro: true,
  exportFormat: "mp4",
};

export const MAP_STYLES: Record<Settings["theme"], string> = {
  dark: "https://tiles.openfreemap.org/styles/dark",
  light: "https://tiles.openfreemap.org/styles/positron",
};
