import type { ParseResult, TrackPoint } from "../types";
import { guessSport } from "./shared";

export function parseGeo(text: string): ParseResult {
  const j = JSON.parse(text);

  // Suunto / Movescount "DeviceLog" export (lat/lon in radians).
  if (j && j.DeviceLog) return parseSuunto(j);

  let coords: number[][] | null = null;
  let times: string[] | null = null;

  const scan = (g: any): void => {
    if (!g) return;
    if (g.type === "FeatureCollection") {
      g.features.forEach((f: any) => scan(f));
    } else if (g.type === "Feature") {
      if (g.properties) {
        const cp =
          g.properties.coordTimes ||
          (g.properties.coordinateProperties &&
            g.properties.coordinateProperties.times);
        if (cp) times = cp;
      }
      scan(g.geometry);
    } else if (g.type === "LineString" && !coords) {
      coords = g.coordinates;
    } else if (g.type === "MultiLineString" && !coords) {
      coords = g.coordinates.flat();
    } else if (g.type === "GeometryCollection") {
      g.geometries.forEach(scan);
    }
  };
  scan(j);

  if (!coords && Array.isArray(j)) coords = j; // bare [[lng,lat], ...] array
  if (!coords || !coords.length) {
    throw new Error("No LineString geometry in JSON.");
  }

  const cc: number[][] = coords;
  const tt: string[] | null = times;
  const pts: TrackPoint[] = cc
    .map((c, i) => ({
      lat: c[1],
      lng: c[0],
      ele: c[2] != null && isFinite(c[2]) ? c[2] : null,
      t: tt && tt[i] ? Date.parse(tt[i]) || null : null,
      hr: null,
    }))
    .filter((p) => isFinite(p.lat) && isFinite(p.lng));

  return { points: pts };
}

/**
 * Parse a Suunto "DeviceLog" JSON export. GPS samples store Latitude/Longitude
 * in radians and altitude in metres; heart rate lives in separate samples (in
 * Hz) which we merge onto the track by nearest timestamp.
 */
function parseSuunto(j: any): ParseResult {
  const log = j.DeviceLog || {};
  const samples: any[] = Array.isArray(log.Samples) ? log.Samples : [];
  const R2D = 180 / Math.PI;

  const toDeg = (v: number) => (Math.abs(v) <= Math.PI ? v * R2D : v);
  const tOf = (s: any): number | null => {
    const raw = s.TimeISO8601 || s.UTC;
    if (!raw) return null;
    const t = Date.parse(raw);
    return isFinite(t) ? t : null;
  };

  // Heart-rate timeline (Suunto stores HR in Hz; ×60 → bpm).
  const hrs: { t: number; hr: number }[] = [];
  for (const s of samples) {
    if (typeof s.HR === "number" && isFinite(s.HR)) {
      const t = tOf(s);
      if (t != null)
        hrs.push({ t, hr: s.HR <= 10 ? Math.round(s.HR * 60) : Math.round(s.HR) });
    }
  }
  hrs.sort((a, b) => a.t - b.t);
  const hrAt = (t: number | null): number | null => {
    if (t == null || !hrs.length) return null;
    if (t <= hrs[0].t) return hrs[0].hr;
    if (t >= hrs[hrs.length - 1].t) return hrs[hrs.length - 1].hr;
    let lo = 0,
      hi = hrs.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (hrs[mid].t < t) lo = mid + 1;
      else hi = mid;
    }
    const a = hrs[lo - 1];
    const b = hrs[lo];
    return t - a.t <= b.t - t ? a.hr : b.hr;
  };

  const pts: TrackPoint[] = [];
  for (const s of samples) {
    if (typeof s.Latitude !== "number" || typeof s.Longitude !== "number") continue;
    const lat = toDeg(s.Latitude);
    const lng = toDeg(s.Longitude);
    if (!isFinite(lat) || !isFinite(lng)) continue;
    const ele =
      typeof s.GPSAltitude === "number" && isFinite(s.GPSAltitude)
        ? s.GPSAltitude
        : typeof s.Altitude === "number" && isFinite(s.Altitude)
          ? s.Altitude
          : null;
    const t = tOf(s);
    pts.push({ lat, lng, ele, t, hr: hrAt(t) });
  }

  const sport = guessSport(log.Header && log.Header.Activity);
  return { points: pts, sport };
}
