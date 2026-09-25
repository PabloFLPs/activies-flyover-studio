import type { Lang, Settings, Theme } from "./types";

const THEMES: Theme[] = ["dark", "light"];
const LANGS_URL: Lang[] = ["pt-BR", "en-US"];

/**
 * Read the load-time settings from the URL. Only theme, accent and language are
 * honoured (they drive the pre-paint theme + readable-accent default). Every
 * other setting always uses the app default on load, so a stale link can't
 * override duration, fly-in, overlays, etc.
 */
export function readSettingsFromUrl(): Partial<Settings> {
  if (typeof window === "undefined") return {};
  const q = new URLSearchParams(window.location.search);
  const out: Partial<Settings> = {};

  const theme = q.get("theme");
  if (theme && THEMES.includes(theme as Theme)) out.theme = theme as Theme;

  const lang = q.get("lang");
  if (lang && LANGS_URL.includes(lang as Lang)) out.lang = lang as Lang;

  const accent = q.get("accent");
  if (accent && /^#?[0-9a-fA-F]{6}$/.test(accent)) {
    out.accent = accent.startsWith("#") ? accent : "#" + accent;
  }

  return out;
}
