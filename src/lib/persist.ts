import type { Theme } from "./types";

/**
 * Consent-gated local persistence for the two cosmetic preferences (theme +
 * accent). Nothing is stored until the user accepts the cookie/storage notice;
 * everything is wrapped in try/catch so private mode / blocked storage is safe.
 */

export type Consent = "granted" | "denied" | null;

const CONSENT_KEY = "rfs:consent";
const THEME_KEY = "rfs:theme";
const ACCENT_KEY = "rfs:accent";

export function getConsent(): Consent {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(v: Exclude<Consent, null>): void {
  try {
    localStorage.setItem(CONSENT_KEY, v);
  } catch {
    /* ignore */
  }
}

/** Stored theme/accent, but only when consent was granted. */
export function loadThemeAccent(): { theme?: Theme; accent?: string } {
  try {
    if (localStorage.getItem(CONSENT_KEY) !== "granted") return {};
    const out: { theme?: Theme; accent?: string } = {};
    const t = localStorage.getItem(THEME_KEY);
    if (t === "dark" || t === "light") out.theme = t;
    const a = localStorage.getItem(ACCENT_KEY);
    if (a && /^#[0-9a-fA-F]{6}$/.test(a)) out.accent = a;
    return out;
  } catch {
    return {};
  }
}

export function saveThemeAccent(theme: Theme, accent: string): void {
  try {
    if (localStorage.getItem(CONSENT_KEY) !== "granted") return;
    localStorage.setItem(THEME_KEY, theme);
    localStorage.setItem(ACCENT_KEY, accent);
  } catch {
    /* ignore */
  }
}

/** Forget the stored preferences (used when consent is declined/withdrawn). */
export function clearThemeAccent(): void {
  try {
    localStorage.removeItem(THEME_KEY);
    localStorage.removeItem(ACCENT_KEY);
  } catch {
    /* ignore */
  }
}
