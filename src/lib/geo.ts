export interface LatLng {
  lat: number;
  lng: number;
}

const R = 6371000;
const toR = Math.PI / 180;
const toD = 180 / Math.PI;

/** Haversine distance in metres. */
export function hav(a: LatLng, b: LatLng): number {
  const dLat = (b.lat - a.lat) * toR;
  const dLng = (b.lng - a.lng) * toR;
  const la1 = a.lat * toR;
  const la2 = b.lat * toR;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial bearing from a → b, degrees clockwise from north (0..360). */
export function bearing(a: LatLng, b: LatLng): number {
  const y = Math.sin((b.lng - a.lng) * toR) * Math.cos(b.lat * toR);
  const x =
    Math.cos(a.lat * toR) * Math.sin(b.lat * toR) -
    Math.sin(a.lat * toR) * Math.cos(b.lat * toR) * Math.cos((b.lng - a.lng) * toR);
  return (Math.atan2(y, x) * toD + 360) % 360;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Shortest-path interpolation between two angles (degrees). */
export function lerpAngle(a: number, b: number, t: number): number {
  const d = ((b - a + 540) % 360) - 180;
  return (a + d * t + 360) % 360;
}

export function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
