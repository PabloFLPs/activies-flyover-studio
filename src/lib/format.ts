/** Seconds → "m:ss" or "h:mm:ss". */
export function fmtClock(s: number): string {
  s = Math.max(0, Math.round(s));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return h
    ? `${h}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`
    : `${m}:${String(ss).padStart(2, "0")}`;
}

/** Seconds-per-unit → "m:ss" pace, or "—" when undefined. */
export function fmtPace(sec: number): string {
  if (!isFinite(sec) || sec <= 0) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Metres → "x.xx km". */
export function fmtKm(m: number): string {
  return (m / 1000).toFixed(2) + " km";
}
