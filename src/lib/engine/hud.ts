import type { CurSample, Lang, Overlays, Sport, Stats, Theme } from "../types";
import type { TDict } from "../i18n";
import { tr, localeTag } from "../i18n";
import type { WeatherData } from "../weather";
import { weatherIconPath, weatherLabel } from "../weather";
import { mdiRun, mdiWalk, mdiHiking, mdiBike, mdiSwim } from "@mdi/js";
import { fmtClock, fmtPace } from "../format";

export interface HudInput {
  ctx: CanvasRenderingContext2D;
  W: number;
  H: number;
  p: number;
  theme: Theme;
  accent: string;
  overlays: Overlays;
  athleteName: string;
  location: string;
  lang: Lang;
  weather: WeatherData | null;
  timeLabel: string | null;
  stats: Stats;
  cur: CurSample;
}

interface Palette {
  ink: string;
  sub: string;
  panel: string;
  border: string;
  chip: string;
  track: string;
}

interface StatItem {
  label: string;
  value: string | number;
  unit: string;
}

function palette(theme: Theme): Palette {
  const d = theme === "dark";
  return d
    ? {
        ink: "#ffffff",
        sub: "rgba(255,255,255,0.62)",
        panel: "rgba(10,13,17,0.46)",
        border: "rgba(255,255,255,0.13)",
        chip: "rgba(255,255,255,0.09)",
        track: "rgba(255,255,255,0.16)",
      }
    : {
        ink: "#0c1116",
        sub: "rgba(12,17,22,0.60)",
        panel: "rgba(255,255,255,0.58)",
        border: "rgba(0,0,0,0.10)",
        chip: "rgba(0,0,0,0.055)",
        track: "rgba(0,0,0,0.14)",
      };
}

/** Truncate `text` with an ellipsis so it fits within maxW at the current font. */
function fitText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (maxW <= 0 || ctx.measureText(text).width <= maxW) return text;
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (ctx.measureText(text.slice(0, mid) + "…").width <= maxW) lo = mid;
    else hi = mid - 1;
  }
  return text.slice(0, lo).trimEnd() + "…";
}

function hexA(hex: string, a: number): string {
  hex = hex.replace("#", "");
  if (hex.length === 3)
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  const n = parseInt(hex, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function rr(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** MDI icon path data (24×24 viewBox) per sport, drawn on the canvas so the
 * activity type reads at a glance from the animation and the export. */
const SPORT_ICON_PATH: Record<Sport, string> = {
  running: mdiRun,
  walking: mdiWalk,
  hiking: mdiHiking,
  cycling: mdiBike,
  swimming: mdiSwim,
};
const SPORT_ICON_CACHE = new Map<Sport, Path2D>();

/**
 * Fill a sport's MDI glyph inside a `size`×`size` box at top-left (x, y).
 */
function drawSportIcon(
  ctx: CanvasRenderingContext2D,
  sport: Sport,
  x: number,
  y: number,
  size: number,
  color: string,
): void {
  const d = SPORT_ICON_PATH[sport];
  if (!d) return;
  let path = SPORT_ICON_CACHE.get(sport);
  if (!path) {
    path = new Path2D(d);
    SPORT_ICON_CACHE.set(sport, path);
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  ctx.fillStyle = color;
  ctx.fill(path);
  ctx.restore();
}

function panelBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  pal: Palette,
): void {
  ctx.save();
  rr(ctx, x, y, w, h, r);
  ctx.fillStyle = pal.panel;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = pal.border;
  ctx.stroke();
  ctx.restore();
}

function primaryPace(stats: Stats, cur: CurSample, t: TDict): StatItem {
  const sp = stats.sport;
  const v = cur.spd;
  if (v == null) return { label: t.hud.pace, value: "—", unit: "" };
  if (sp === "cycling")
    return { label: t.hud.speed, value: v.toFixed(1), unit: "KM/H" };
  const ms = v / 3.6;
  if (sp === "swimming") {
    const sec = ms > 0 ? 100 / ms : 0;
    return { label: t.hud.pace, value: fmtPace(sec), unit: "/100M" };
  }
  const secKm = v > 0 ? 3600 / v : 0;
  return { label: t.hud.pace, value: fmtPace(secKm), unit: "/KM" };
}

function drawPrimary(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  items: StatItem[],
  pal: Palette,
  acc: string,
): void {
  const n = items.length;
  const cw = w / n;
  items.forEach((it, i) => {
    const cx = x + cw * i;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = pal.sub;
    ctx.font = '600 26px "Space Grotesk", sans-serif';
    ctx.fillText(it.label, cx, y + 30);
    const size = n <= 2 ? 96 : 82;
    ctx.fillStyle = pal.ink;
    ctx.font = `600 ${size}px "IBM Plex Mono", monospace`;
    const value = "" + it.value;
    ctx.fillText(value, cx, y + 30 + size * 0.92);
    if (it.unit) {
      const vw = ctx.measureText(value).width;
      ctx.fillStyle = hexA(acc, 1);
      ctx.font = '600 30px "IBM Plex Mono", monospace';
      ctx.fillText(it.unit, cx + vw + 14, y + 30 + size * 0.92);
    }
  });
}

function drawChips(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  items: StatItem[],
  pal: Palette,
  acc: string,
): void {
  const n = items.length;
  const gap = 18;
  const cw = (w - gap * (n - 1)) / n;
  const h = 104;
  items.forEach((it, i) => {
    const cx = x + (cw + gap) * i;
    rr(ctx, cx, y, cw, h, 16);
    ctx.fillStyle = pal.chip;
    ctx.fill();
    ctx.beginPath();
    rr(ctx, cx, y, 5, h, 3);
    ctx.fillStyle = acc;
    ctx.fill();
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = pal.sub;
    ctx.font = '600 22px "Space Grotesk", sans-serif';
    ctx.fillText(it.label, cx + 20, y + 34);
    ctx.fillStyle = pal.ink;
    ctx.font = '600 42px "IBM Plex Mono", monospace';
    const vs = "" + it.value;
    ctx.fillText(vs, cx + 20, y + 80);
    if (it.unit) {
      const vw = ctx.measureText(vs).width;
      ctx.fillStyle = pal.sub;
      ctx.font = '500 22px "IBM Plex Mono", monospace';
      ctx.fillText(it.unit, cx + 20 + vw + 9, y + 80);
    }
  });
}

function drawChart(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  cur: CurSample,
  pal: Palette,
  acc: string,
  stats: Stats,
  overlays: Overlays,
  t: TDict,
): void {
  const s = stats;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = pal.sub;
  ctx.font = '600 24px "Space Grotesk", sans-serif';
  ctx.fillText(t.hud.elevation, x, y + 6);
  ctx.textAlign = "right";
  ctx.fillStyle = pal.ink;
  ctx.font = '600 30px "IBM Plex Mono", monospace';
  ctx.fillText((cur.ele != null ? Math.round(cur.ele) : "—") + " m", x + w, y + 6);
  ctx.textAlign = "left";

  const cy = y + 22;
  const ch = h - 22;
  const range = Math.max(1, s.eMax - s.eMin);
  const yOf = (e: number) => cy + ch - ((e - s.eMin) / range) * ch;
  const xOf = (d: number) => x + (d / (s.total || 1)) * w;

  const N = Math.min(240, s.coords.length);
  const pts: [number, number][] = [];
  for (let k = 0; k < N; k++) {
    const idx = Math.round((k / (N - 1)) * (s.coords.length - 1));
    const e = s.ele[idx];
    if (e != null) pts.push([xOf(s.cum[idx]), yOf(e)]);
  }
  if (pts.length < 2) return;

  // area fill
  ctx.beginPath();
  ctx.moveTo(pts[0][0], cy + ch);
  pts.forEach((pt) => ctx.lineTo(pt[0], pt[1]));
  ctx.lineTo(pts[pts.length - 1][0], cy + ch);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, cy, 0, cy + ch);
  g.addColorStop(0, hexA(acc, 0.34));
  g.addColorStop(1, hexA(acc, 0.02));
  ctx.fillStyle = g;
  ctx.fill();

  // line
  ctx.beginPath();
  pts.forEach((pt, k) => (k ? ctx.lineTo(pt[0], pt[1]) : ctx.moveTo(pt[0], pt[1])));
  ctx.strokeStyle = hexA(acc, 0.85);
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.stroke();

  // marker
  const mx = xOf(cur.dist);
  const my = cur.ele != null ? yOf(cur.ele) : cy + ch;
  ctx.strokeStyle = pal.border;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(mx, cy);
  ctx.lineTo(mx, cy + ch);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(mx, my, 9, 0, 7);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = acc;
  ctx.stroke();

  if (overlays.elevgain === false && s.hasEle) {
    ctx.textAlign = "left";
    ctx.fillStyle = pal.sub;
    ctx.font = '500 22px "IBM Plex Mono", monospace';
    ctx.fillText("+" + Math.round(cur.gain) + " " + t.hud.gainSuffix, x, cy + ch + 2);
  }
}

function drawMini(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  S: number,
  cur: CurSample,
  pal: Palette,
  acc: string,
  stats: Stats,
  t: TDict,
): void {
  panelBox(ctx, x, y, S, S, 20, pal);
  const s = stats;
  const pad = 30;
  let mnx = Infinity,
    mny = Infinity,
    mxx = -Infinity,
    mxy = -Infinity;
  for (const c of s.coords) {
    mnx = Math.min(mnx, c[0]);
    mxx = Math.max(mxx, c[0]);
    mny = Math.min(mny, c[1]);
    mxy = Math.max(mxy, c[1]);
  }
  const bw = Math.max(1e-6, mxx - mnx);
  const bh = Math.max(1e-6, mxy - mny);
  const iw = S - pad * 2;
  const ih = S - pad * 2;
  const sc = Math.min(iw / bw, ih / bh);
  const ox = x + pad + (iw - bw * sc) / 2;
  const oy = y + pad + (ih - bh * sc) / 2;
  const X = (lng: number) => ox + (lng - mnx) * sc;
  const Y = (lat: number) => oy + (mxy - lat) * sc;

  ctx.save();
  rr(ctx, x + 6, y + 6, S - 12, S - 12, 16);
  ctx.clip();
  ctx.beginPath();
  s.coords.forEach((c, i) =>
    i ? ctx.lineTo(X(c[0]), Y(c[1])) : ctx.moveTo(X(c[0]), Y(c[1])),
  );
  ctx.strokeStyle = pal.track;
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.beginPath();
  for (let i = 0; i <= cur.idx; i++) {
    const c = s.coords[i];
    if (i) ctx.lineTo(X(c[0]), Y(c[1]));
    else ctx.moveTo(X(c[0]), Y(c[1]));
  }
  ctx.lineTo(X(cur.lng), Y(cur.lat));
  ctx.strokeStyle = acc;
  ctx.lineWidth = 3.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(X(cur.lng), Y(cur.lat), 7, 0, 7);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = acc;
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = pal.sub;
  ctx.font = '600 18px "Space Grotesk", sans-serif';
  ctx.textAlign = "left";
  ctx.fillText(t.hud.route, x + 16, y + 26);
}

function drawScrims(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  theme: Theme,
): void {
  const d = theme === "dark";
  let g = ctx.createLinearGradient(0, 0, 0, 340);
  g.addColorStop(0, d ? "rgba(4,6,10,0.55)" : "rgba(240,243,246,0.6)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, 340);
  g = ctx.createLinearGradient(0, H - 720, 0, H);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, d ? "rgba(3,5,9,0.72)" : "rgba(236,240,243,0.78)");
  ctx.fillStyle = g;
  ctx.fillRect(0, H - 720, W, 720);
}

/** Draw scrims + the full HUD over the (already-composited) map frame. */
export function renderHud(h: HudInput): void {
  const { ctx, W, H, p } = h;
  drawScrims(ctx, W, H, h.theme);

  const pal = palette(h.theme);
  const acc = h.accent;
  const ov = h.overlays;
  const s = h.stats;
  const cur = h.cur;
  const M = 64;
  const t = tr(h.lang);

  // ---- TOP: name / sport / date / route map ----
  let ty = M + 6;
  if (ov.name) {
    const label = t.badge[s.sport] || "ACTIVITY";
    ctx.font = '700 26px "IBM Plex Mono", monospace';
    const padX = 16;
    const iconSize = 30;
    const iconGap = 12;
    const textW = ctx.measureText(label).width;
    const cw = padX + iconSize + iconGap + textW + padX;
    rr(ctx, M, ty, cw, 46, 12);
    ctx.fillStyle = acc;
    ctx.fill();
    // sport glyph, then label — both in the pill's ink color
    drawSportIcon(ctx, s.sport, M + padX, ty + 23 - iconSize / 2, iconSize, "#0b0d10");
    ctx.fillStyle = "#0b0d10";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillText(label, M + padX + iconSize + iconGap, ty + 24);
    ty += 46 + 16;
    ctx.textBaseline = "alphabetic";
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 18;
    ctx.fillStyle = pal.ink;
    ctx.font = '700 62px "Space Grotesk", sans-serif';
    ctx.fillText(h.athleteName || t.sidebar.athletePlaceholder, M, ty + 42);
    ctx.restore();
    ty += 64;
  }
  // Keep top-left text from running under the route mini-map (top-right).
  const leftLimit = ov.routemap ? W - M - 250 - 24 : W - M;
  const leftMaxW = leftLimit - M;
  if (ov.datetime) {
    // Line 1: date · time.
    const line1: string[] = [];
    if (s.startDate) {
      line1.push(
        s.startDate
          .toLocaleDateString(localeTag(h.lang), {
            weekday: "short",
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
          .toUpperCase(),
      );
    }
    if (h.timeLabel) line1.push(h.timeLabel);
    if (line1.length) {
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.45)";
      ctx.shadowBlur = 12;
      ctx.fillStyle = pal.sub;
      ctx.font = '500 28px "IBM Plex Mono", monospace';
      ctx.fillText(fitText(ctx, line1.join("   ·   "), leftMaxW), M, ty + 30);
      ctx.restore();
      ty += 44;
    }
    // Line 2: location on its own line so a long place never overlaps the mini-map.
    if (h.location) {
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.45)";
      ctx.shadowBlur = 12;
      ctx.fillStyle = pal.sub;
      ctx.font = '500 28px "IBM Plex Mono", monospace';
      ctx.fillText(fitText(ctx, h.location.toUpperCase(), leftMaxW), M, ty + 28);
      ctx.restore();
      ty += 42;
    }
  }
  if (ov.weather && h.weather) {
    ty += 6; // breathing room from the date/location above
    const temp = Math.round(h.weather.tempC) + "°C";
    const lbl = weatherLabel(h.weather.code, h.lang);
    const iconS = 38;
    const gap = 12;
    const cy = ty + iconS / 2;
    // No card — just the icon + reading, inline like the date line above.
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 12;
    ctx.translate(M, cy - iconS / 2);
    ctx.scale(iconS / 24, iconS / 24);
    ctx.fillStyle = acc;
    ctx.fill(new Path2D(weatherIconPath(h.weather.code)));
    ctx.restore();
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 12;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = pal.ink;
    ctx.font = '600 30px "IBM Plex Mono", monospace';
    ctx.fillText(temp, M + iconS + gap, cy + 1);
    const tempW = ctx.measureText(temp).width;
    ctx.fillStyle = pal.sub;
    ctx.font = '500 26px "Space Grotesk", sans-serif';
    ctx.fillText(lbl, M + iconS + gap + tempW + gap, cy + 1);
    ctx.textBaseline = "alphabetic";
    ctx.restore();
    ty += iconS + 14;
  }
  if (ov.routemap) {
    drawMini(ctx, W - M - 250, M + 6, 250, cur, pal, acc, s, t);
  }

  // ---- BOTTOM dashboard ----
  const primary: StatItem[] = [];
  if (ov.distance)
    primary.push({
      label: t.hud.distance,
      value: (cur.dist / 1000).toFixed(2),
      unit: "KM",
    });
  if (ov.duration)
    primary.push({ label: t.hud.time, value: fmtClock(cur.elapsed), unit: "" });
  if (ov.pace) primary.push(primaryPace(s, cur, t));

  const chips: StatItem[] = [];
  if (ov.maxspeed)
    chips.push({
      label: t.hud.maxSpeed,
      value: s.hasTime ? s.maxSpeed.toFixed(1) : "—",
      unit: "KM/H",
    });
  if (ov.elevgain)
    chips.push({
      label: t.hud.elevGain,
      value: s.hasEle ? Math.round(cur.gain) : "—",
      unit: "M",
    });
  if (ov.hr)
    chips.push({
      label: t.hud.heartRate,
      value: s.hasHr && cur.hr ? cur.hr : "—",
      unit: "BPM",
    });
  if (ov.calories)
    chips.push({ label: t.hud.calories, value: Math.round(cur.cal), unit: "KCAL" });

  const showChart = ov.elevchart && s.hasEle;

  const pad = 38;
  const gap = 30;
  const primH = primary.length ? 150 : 0;
  const chartH = showChart ? 210 : 0;
  const chipsH = chips.length ? 104 : 0;
  let inner = 0;
  [primH, chartH, chipsH].forEach((hh) => {
    if (hh) inner += (inner ? gap : 0) + hh;
  });

  if (inner > 0) {
    const panelW = W - 2 * M;
    const panelX = M;
    const panelH = inner + pad * 2;
    // Anchor above the attribution/brand line (drawn at H-64) so the panel never
    // overlaps that text or the progress bar below it.
    const panelY = H - 64 - 30 - panelH;
    panelBox(ctx, panelX, panelY, panelW, panelH, 30, pal);
    let y = panelY + pad;
    const ix = panelX + pad;
    const iw = panelW - 2 * pad;
    if (primH) {
      drawPrimary(ctx, ix, y, iw, primary, pal, acc);
      y += primH + gap;
    }
    if (chartH) {
      drawChart(ctx, ix, y, iw, chartH - 26, cur, pal, acc, s, ov, t);
      y += chartH + gap;
    }
    if (chipsH) {
      drawChips(ctx, ix, y, iw, chips, pal, acc);
    }
  }

  // progress bar (always)
  const bx = M;
  const bw = W - 2 * M;
  const by = H - 46;
  ctx.save();
  rr(ctx, bx, by, bw, 7, 4);
  ctx.fillStyle = pal.track;
  ctx.fill();
  rr(ctx, bx, by, Math.max(7, bw * p), 7, 4);
  ctx.fillStyle = acc;
  ctx.fill();
  const kx = bx + bw * p;
  ctx.beginPath();
  ctx.arc(kx, by + 3.5, 10, 0, 7);
  ctx.fillStyle = acc;
  ctx.shadowColor = hexA(acc, 0.7);
  ctx.shadowBlur = 16;
  ctx.fill();
  ctx.restore();

  // attribution
  ctx.fillStyle = pal.sub;
  ctx.font = '400 18px "IBM Plex Mono", monospace';
  ctx.textAlign = "left";
  ctx.fillText("© OpenStreetMap  © OpenFreeMap", M, H - 64);
  // brand mark — matches the attribution's font/size/case so both sit on the
  // same baseline with equal spacing to the panel above.
  ctx.textAlign = "right";
  ctx.fillStyle = hexA(acc, 0.9);
  ctx.font = '700 18px "IBM Plex Mono", monospace';
  ctx.fillText("Route Flyover", W - M, H - 64);
  ctx.textAlign = "left";
}

/** The idle "drop a file" canvas shown before any data is loaded. */
export function drawEmpty(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  theme: Theme,
  accent: string,
  lang: Lang,
  map?: CanvasImageSource | null,
): void {
  const t = tr(lang);
  const d = theme === "dark";
  const acc = accent;

  // If the live map is ready, show it behind the prompt so the idle screen feels
  // alive; otherwise fall back to a flat radial gradient.
  let hasMap = false;
  if (map) {
    try {
      ctx.drawImage(map, 0, 0, W, H);
      hasMap = true;
    } catch {
      hasMap = false;
    }
  }
  if (hasMap) {
    // Keep the map clearly readable: only a light edge vignette, so streets and
    // labels stay visible while the centered copy still reads (it carries its
    // own shadow below).
    const v = ctx.createRadialGradient(W / 2, H * 0.5, 160, W / 2, H * 0.5, H * 0.78);
    v.addColorStop(0, d ? "rgba(6,8,12,0.06)" : "rgba(244,247,249,0.18)");
    v.addColorStop(1, d ? "rgba(4,6,10,0.4)" : "rgba(226,231,237,0.62)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  } else {
    const g = ctx.createRadialGradient(W / 2, H * 0.34, 80, W / 2, H * 0.5, H * 0.7);
    if (d) {
      g.addColorStop(0, "#131820");
      g.addColorStop(1, "#080a0e");
    } else {
      g.addColorStop(0, "#f3f6f8");
      g.addColorStop(1, "#dde3e8");
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // Decorative dashed route (original).
  ctx.save();
  ctx.setLineDash([16, 18]);
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.strokeStyle = hexA(acc, 0.5);
  ctx.beginPath();
  ctx.moveTo(180, 1180);
  ctx.bezierCurveTo(360, 980, 340, 760, 560, 720);
  ctx.bezierCurveTo(800, 676, 760, 940, 900, 940);
  ctx.stroke();
  ctx.setLineDash([]);
  (
    [
      [180, 1180],
      [900, 940],
    ] as [number, number][]
  ).forEach(([px, py], i) => {
    ctx.beginPath();
    ctx.arc(px, py, i ? 16 : 14, 0, 7);
    ctx.fillStyle = i ? acc : "#fff";
    ctx.fill();
    if (!i) {
      ctx.lineWidth = 5;
      ctx.strokeStyle = acc;
      ctx.stroke();
    }
  });
  ctx.restore();

  ctx.textAlign = "center";
  // Over a live (busy) map, frost the map behind the prompt (blur + faint tint)
  // so the copy never fights the street labels, while the map stays visible.
  if (hasMap && map) {
    ctx.font = '700 64px "Space Grotesk", sans-serif';
    const w1 = ctx.measureText(t.empty.title).width;
    ctx.font = '500 32px "IBM Plex Mono", monospace';
    const w2 = Math.max(
      ctx.measureText(t.empty.formats).width,
      ctx.measureText(t.empty.demo).width,
    );
    const rW = Math.min(W - 80, Math.max(w1, w2) + 160);
    const rH = 260;
    const rX = W / 2 - rW / 2;
    const rY = H * 0.5 - 104;
    // Build the frosted panel on an offscreen canvas, then feather its edges
    // with a blurred mask so it fades into the map instead of a hard cut.
    const off = document.createElement("canvas");
    off.width = W;
    off.height = H;
    const octx = off.getContext("2d");
    if (octx) {
      octx.filter = "blur(11px)";
      octx.drawImage(map, -24, -24, W + 48, H + 48);
      octx.filter = "none";
      octx.fillStyle = d ? "rgba(8,10,14,0.30)" : "rgba(247,249,251,0.34)";
      octx.fillRect(0, 0, W, H);
      // Feather: keep only a rounded rect whose edge is softened by a blurred mask.
      octx.globalCompositeOperation = "destination-in";
      octx.filter = "blur(26px)";
      octx.fillStyle = "#fff";
      rr(octx, rX + 26, rY + 26, rW - 52, rH - 52, 30);
      octx.fill();
      octx.filter = "none";
      octx.globalCompositeOperation = "source-over";
      ctx.drawImage(off, 0, 0);
    }
  }
  ctx.save();
  if (hasMap) {
    ctx.shadowColor = d ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.5)";
    ctx.shadowBlur = 12;
  }
  ctx.fillStyle = d ? "#ffffff" : "#0c1116";
  ctx.font = '700 64px "Space Grotesk", sans-serif';
  ctx.fillText(t.empty.title, W / 2, H * 0.5);
  ctx.fillStyle = d ? "rgba(255,255,255,0.62)" : "rgba(12,17,22,0.6)";
  ctx.font = '500 32px "IBM Plex Mono", monospace';
  ctx.fillText(t.empty.formats, W / 2, H * 0.5 + 56);
  ctx.fillText(t.empty.demo, W / 2, H * 0.5 + 104);
  ctx.restore();
  ctx.textAlign = "left";
}
