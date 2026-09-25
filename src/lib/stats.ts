import type { LngLat, Sport, Stats, TrackPoint } from "./types";
import { hav } from "./geo";
import { MET_BY_SPORT } from "./constants";

/** Hysteresis threshold (m) for counting a confirmed climb — rejects small wiggles. */
const GAIN_THRESHOLD_M = 2;
/** Half-window (samples) for the light moving-average used before gain accumulation. */
const SMOOTH_HALF_WINDOW = 3;

/**
 * Fill a partially-null elevation series: leading/trailing gaps take the nearest
 * value, interior gaps are linearly interpolated. Returns null if fewer than half
 * the points have elevation (treat as "no elevation").
 */
function fillElevation(ele: (number | null)[]): number[] | null {
  const n = ele.length;
  let present = 0;
  for (const e of ele) if (e != null) present++;
  if (present < 2 || present / n < 0.5) return null;

  const firstIdx = ele.findIndex((e) => e != null);
  let lastIdx = n - 1;
  while (lastIdx >= 0 && ele[lastIdx] == null) lastIdx--;

  const out = new Array<number>(n);
  for (let i = 0; i < firstIdx; i++) out[i] = ele[firstIdx] as number;
  for (let i = lastIdx + 1; i < n; i++) out[i] = ele[lastIdx] as number;

  let i = firstIdx;
  while (i <= lastIdx) {
    if (ele[i] != null) {
      out[i] = ele[i] as number;
      i++;
      continue;
    }
    let j = i;
    while (j <= lastIdx && ele[j] == null) j++;
    const a = ele[i - 1] as number;
    const b = ele[j] as number;
    for (let k = i; k < j; k++) {
      out[k] = a + (b - a) * ((k - (i - 1)) / (j - (i - 1)));
    }
    i = j;
  }
  return out;
}

function smoothSeries(arr: number[], half: number): number[] {
  const n = arr.length;
  const out = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    let c = 0;
    for (let j = Math.max(0, i - half); j <= Math.min(n - 1, i + half); j++) {
      sum += arr[j];
      c++;
    }
    out[i] = sum / c;
  }
  return out;
}

/**
 * Cumulative elevation gain per point using a hysteresis threshold: a climb is
 * only counted once the rise from the running low exceeds GAIN_THRESHOLD_M. This
 * is sampling-rate independent, so it recovers real gain from smooth 1 Hz
 * barometric data (which a per-sample threshold zeroes out) while still rejecting
 * GPS-altitude jitter. Returns a monotonic non-decreasing series.
 */
function cumulativeGainSeries(ele: number[], threshold: number): number[] {
  const n = ele.length;
  const gain = new Array<number>(n).fill(0);
  if (n === 0) return gain;
  let acc = 0;
  let ref = ele[0];
  for (let i = 0; i < n; i++) {
    const d = ele[i] - ref;
    if (d >= threshold) {
      acc += d;
      ref = ele[i];
    } else if (d < 0) {
      ref = ele[i];
    }
    gain[i] = acc;
  }
  return gain;
}

/**
 * Turn raw track points into the derived series the render loop consumes:
 * cumulative distance, smoothed speed, cumulative elevation gain, relative
 * timing, calories and the chase-camera zoom.
 */
export function buildStats(
  points: TrackPoint[],
  sport: Sport,
  opts: { calories?: number | null; fallbackDurationSec: number },
): Stats {
  const n = points.length;
  const coords: LngLat[] = [];
  const cum: number[] = [0];
  const eleRaw: (number | null)[] = [];
  const hr: (number | null)[] = [];
  const times: (number | null)[] = [];
  const spdRaw: number[] = [];

  let hasTime = true;
  let hasHr = true;
  let total = 0;

  for (let i = 0; i < n; i++) {
    const p = points[i];
    coords.push([p.lng, p.lat]);
    eleRaw.push(p.ele);
    hr.push(p.hr);
    if (p.hr == null) hasHr = false;
    times.push(p.t);
    if (p.t == null) hasTime = false;
    if (i > 0) {
      total += hav(points[i - 1], points[i]);
      cum.push(total);
    }
  }

  // Elevation: fill gaps, then derive a robust cumulative gain series.
  const filled = fillElevation(eleRaw);
  const hasEle = filled !== null;
  const ele: (number | null)[] = filled ?? eleRaw;
  let eMin = Infinity;
  let eMax = -Infinity;
  let gain: number[];
  if (filled) {
    for (const e of filled) {
      if (e < eMin) eMin = e;
      if (e > eMax) eMax = e;
    }
    gain = cumulativeGainSeries(
      smoothSeries(filled, SMOOTH_HALF_WINDOW),
      GAIN_THRESHOLD_M,
    );
  } else {
    gain = new Array<number>(n).fill(0);
  }

  // Per-point speed (km/h) via ±2-sample time deltas.
  let maxSpeed = 0;
  if (hasTime) {
    for (let i = 0; i < n; i++) {
      const a = Math.max(0, i - 2);
      const b = Math.min(n - 1, i + 2);
      const dist = cum[b] - cum[a];
      const dt = ((times[b] as number) - (times[a] as number)) / 1000;
      const v = dt > 0 ? (dist / dt) * 3.6 : 0;
      spdRaw.push(v);
      if (v > maxSpeed && v < 80) maxSpeed = v;
    }
  }

  const t0 = hasTime ? (times[0] as number) : null;
  const dur = hasTime
    ? ((times[n - 1] as number) - (times[0] as number)) / 1000
    : opts.fallbackDurationSec;

  let cal = opts.calories ?? null;
  if (cal == null) {
    const met = MET_BY_SPORT[sport] ?? 7;
    const hours = (hasTime ? dur : opts.fallbackDurationSec) / 3600;
    cal = Math.round(met * 72 * hours);
  }

  const relTimes = hasTime
    ? (times as number[]).map((t) => (t - (t0 as number)) / 1000)
    : null;

  const chaseZoom = Math.max(
    13.0,
    Math.min(15.9, 15.7 - 0.42 * Math.log2(Math.max(total, 700) / 700)),
  );

  return {
    sport,
    coords,
    cum,
    ele,
    hr,
    gain,
    spd: spdRaw,
    times: relTimes,
    total,
    hasTime,
    hasEle,
    hasHr,
    dur,
    maxSpeed,
    calories: cal,
    eMin: isFinite(eMin) ? eMin : 0,
    eMax: isFinite(eMax) ? eMax : 0,
    startDate: t0 ? new Date(t0) : null,
    chaseZoom,
  };
}
