import {
  mdiWeatherSunny,
  mdiWeatherPartlyCloudy,
  mdiWeatherCloudy,
  mdiWeatherFog,
  mdiWeatherRainy,
  mdiWeatherPouring,
  mdiWeatherSnowy,
  mdiWeatherLightningRainy,
} from "@mdi/js";
import type { Lang } from "./i18n";
import { tr } from "./i18n";

export interface WeatherData {
  tempC: number;
  code: number; // WMO weather code
}

type Group =
  | "clear"
  | "partly"
  | "overcast"
  | "fog"
  | "drizzle"
  | "rain"
  | "heavyRain"
  | "snow"
  | "showers"
  | "thunder";

/** Map a WMO weather code to a coarse group. */
function group(code: number): Group {
  if (code === 0) return "clear";
  if (code === 1 || code === 2) return "partly";
  if (code === 3) return "overcast";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 57) return "drizzle";
  if (code === 61 || code === 63 || code === 66) return "rain";
  if (code === 65 || code === 67) return "heavyRain";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 80 && code <= 82) return "showers";
  if (code >= 95) return "thunder";
  return "overcast";
}

const GROUP_ICON: Record<Group, string> = {
  clear: mdiWeatherSunny,
  partly: mdiWeatherPartlyCloudy,
  overcast: mdiWeatherCloudy,
  fog: mdiWeatherFog,
  drizzle: mdiWeatherRainy,
  rain: mdiWeatherRainy,
  heavyRain: mdiWeatherPouring,
  snow: mdiWeatherSnowy,
  showers: mdiWeatherPouring,
  thunder: mdiWeatherLightningRainy,
};

export function weatherIconPath(code: number): string {
  return GROUP_ICON[group(code)];
}

export function weatherLabel(code: number, lang: Lang): string {
  return tr(lang).weather[group(code)];
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Local YYYY-MM-DD for a Date. */
function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

interface HourlyResp {
  hourly?: {
    time?: string[];
    temperature_2m?: (number | null)[];
    weather_code?: (number | null)[];
    precipitation?: (number | null)[];
    cloud_cover?: (number | null)[];
  };
}

/** A dry-sky WMO code derived from cloud cover (%). */
function skyFromCloud(cloud: number | null): number {
  if (cloud == null) return 2; // unknown -> partly cloudy
  if (cloud < 20) return 0; // clear
  if (cloud < 60) return 2; // partly cloudy
  return 3; // overcast
}

/**
 * Correct a WMO weather code against measured precipitation. Open-Meteo often
 * reports a light drizzle/rain code even when precipitation is 0mm; when it is
 * dry, swap that wet code for a real sky condition from cloud cover. Fog, snow
 * and thunder codes are always kept. Exported for testing.
 */
export function resolveCode(
  code: number,
  precip: number | null,
  cloud: number | null,
): number {
  // Trust the model for these distinctive states.
  if (code === 45 || code === 48) return code; // fog
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return code; // snow
  if (code >= 95) return code; // thunder
  // For everything else, classify by MEASURED precipitation rather than the
  // weather_code, which fires drizzle/rain even at 0mm. This is what stops a
  // clear, dry run from being labelled "drizzle".
  const p = precip ?? 0;
  if (p >= 2.5) return 65; // heavy rain
  if (p >= 0.5) return 61; // rain
  if (p >= 0.1) return 51; // genuine light drizzle
  return skyFromCloud(cloud); // dry -> sky by cloud cover
}

function pickHour(json: HourlyResp, hour: number): WeatherData | null {
  const h = json.hourly;
  if (!h || !h.time || !h.temperature_2m || !h.weather_code) return null;
  // times look like "2026-09-13T14:00"; find the closest to the wanted hour.
  let best = -1;
  let bestDiff = Infinity;
  for (let i = 0; i < h.time.length; i++) {
    const hh = parseInt(h.time[i].slice(11, 13), 10);
    const diff = Math.abs(hh - hour);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  }
  if (best < 0) return null;
  const t = h.temperature_2m[best];
  const c = h.weather_code[best];
  if (t == null || c == null) return null;
  // Open-Meteo's weather_code often reports light drizzle/rain (51-67) even when
  // precipitation is 0mm. Trust the measured precipitation: if it's dry, replace
  // the wet code with a real sky condition derived from cloud cover.
  const precip = h.precipitation?.[best] ?? null;
  const cloud = h.cloud_cover?.[best] ?? null;
  return { tempC: t, code: resolveCode(c, precip, cloud) };
}

/**
 * Fetch the weather for a place, date and hour from Open-Meteo (keyless).
 * Prefers the forecast model for recent dates (accurate hourly codes) and falls
 * back to the ERA5 archive only for older activities. Returns null on any
 * failure — callers treat weather as optional.
 */
export async function fetchWeather(
  lat: number,
  lon: number,
  date: Date,
  hour: number,
): Promise<WeatherData | null> {
  const day = dateKey(date);
  const common =
    `latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}` +
    `&hourly=temperature_2m,weather_code,precipitation,cloud_cover&timezone=auto` +
    `&start_date=${day}&end_date=${day}`;
  const forecast = `https://api.open-meteo.com/v1/forecast?${common}`;
  const archive = `https://archive-api.open-meteo.com/v1/archive?${common}`;
  // For recent dates use the FORECAST model — its hourly weather_code is accurate.
  // The archive (ERA5 reanalysis) is coarse and over-reports light drizzle, so it
  // is only used for older dates outside the forecast API's ~90-day past window.
  const ageDays = (Date.now() - date.getTime()) / 86_400_000;
  const urls = ageDays <= 90 ? [forecast, archive] : [archive, forecast];
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const json = (await res.json()) as HourlyResp;
      const w = pickHour(json, hour);
      if (w) return w;
    } catch {
      /* try the next endpoint */
    }
  }
  return null;
}
