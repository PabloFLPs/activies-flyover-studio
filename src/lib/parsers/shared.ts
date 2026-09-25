import type { Sport } from "../types";

/** Best-effort mapping of a free-text activity type to one of our sports. */
export function guessSport(s: unknown): Sport | null {
  if (!s) return null;
  const str = ("" + s).toLowerCase();
  if (/run|jog/.test(str)) return "running";
  if (/cycl|bike|ride/.test(str)) return "cycling";
  if (/hik|trail|mountain/.test(str)) return "hiking";
  if (/walk/.test(str)) return "walking";
  if (/swim/.test(str)) return "swimming";
  return null;
}
