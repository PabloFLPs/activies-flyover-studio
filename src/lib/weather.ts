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
  };
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
  return { tempC: t, code: c };
}

/**
 * Fetch the weather for a place, date and hour from Open-Meteo (keyless).
 * Tries the historical archive first, then the forecast API (which also covers
 * the recent past + near future), so both old and very recent activities work.
 * Returns null on any failure — callers treat weather as optional.
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
    `&hourly=temperature_2m,weather_code&timezone=auto` +
    `&start_date=${day}&end_date=${day}`;
  const urls = [
    `https://archive-api.open-meteo.com/v1/archive?${common}`,
    `https://api.open-meteo.com/v1/forecast?${common}`,
  ];
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
