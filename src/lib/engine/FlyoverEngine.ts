import {
  Map as MapLibreMap,
  LngLat,
  type GeoJSONSource,
  type LngLatBoundsLike,
} from "maplibre-gl";
import type { Feature, FeatureCollection } from "geojson";

import type {
  CurSample,
  DisplayState,
  ParsedMeta,
  Settings,
  Sport,
  Stats,
  Theme,
  TrackPoint,
} from "../types";
import { STAGE_W, STAGE_H, EXPORT_FPS, MAP_STYLES } from "../constants";
import { bearing, easeInOut, lerp, lerpAngle, smootherstep } from "../geo";
import { fmtClock, fmtKm } from "../format";
import { buildStats } from "../stats";
import { buildDemo } from "../demo";
import { parseActivityFile } from "../parsers";
import { fetchWeather, type WeatherData } from "../weather";
import { reverseGeocode } from "../geocode";
import { tr } from "../i18n";
import { renderHud, drawEmpty } from "./hud";
import { pickMime, isAppleMobile, sanitizeBase, downloadBlob } from "../export/recorder";

export interface EngineRefs {
  canvas: HTMLCanvasElement;
  mapContainer: HTMLElement;
  stageArea: HTMLElement;
  stageWrap: HTMLElement;
  scrub: HTMLInputElement;
  time: HTMLElement;
}

export interface EngineCallbacks {
  onDisplay: (partial: Partial<DisplayState>) => void;
  onAdoptMeta: (meta: ParsedMeta) => void;
  /**
   * Fired when the map has finished painting a given theme. React uses this to
   * flip the app chrome's data-theme so the page and the map change in step,
   * instead of the chrome snapping ahead of the network-bound style reload.
   */
  onThemeApplied: (theme: Theme) => void;
  /**
   * Fired when the map has finished repainting the route/tracker in a given
   * accent. React uses this to flip the app chrome's accent so the page and the
   * map recolor together instead of the chrome jumping ahead.
   */
  onAccentApplied: (accent: string) => void;
}

interface CameraLike {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
}

interface SetDataMeta {
  fileName?: string;
  calories?: number | null;
  location?: string | null;
  name?: string | null;
}

function lineFeature(coords: [number, number][]): Feature {
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "LineString", coordinates: coords },
  };
}
function pointFeature(coord: [number, number]): Feature {
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Point", coordinates: coord },
  };
}

/**
 * The imperative core of the Studio: owns the MapLibre map, the export canvas,
 * the parsed track, the chase-camera animation and the video export. React owns
 * the user Settings and pushes them in via updateSettings(); the engine pushes
 * DisplayState back out via callbacks.onDisplay().
 */
export class FlyoverEngine {
  private refs: EngineRefs;
  private cb: EngineCallbacks;
  private settings: Settings;

  private map: MapLibreMap | null = null;
  private mapReady = false;
  private swapping = false;
  private recolorPending = false;
  private mapAnnounced = false;
  private running = false;
  private weather: WeatherData | null = null;
  private weatherKey = "";
  // Pre-rendered export from a preceding Play (see capturePlay).
  private prepared: { blob: Blob; sig: string } | null = null;
  private capturing = false;
  private mounted = false;

  private stats: Stats | null = null;
  private progress = 0;
  private overview: { center: [number, number]; zoom: number } | null = null;
  private bounds: LngLatBoundsLike | null = null;
  /** True once the overview was fit with a sized map (else the first idle refits). */
  private overviewFitted = false;

  private hint = 0;
  private brg: number | null = null;
  private dpr = 1;

  private hasData = false;
  private recording = false;
  private fileName = "";

  private raf: number | undefined;
  private lastPct = -1;
  private pendingRoute = false;
  private exportRes: (() => void) | null = null;
  private exportAborted = false;

  private ro: ResizeObserver | null = null;
  private onResize: (() => void) | null = null;

  constructor(refs: EngineRefs, cb: EngineCallbacks, settings: Settings) {
    this.refs = refs;
    this.cb = cb;
    this.settings = settings;
  }

  private disp(partial: Partial<DisplayState>): void {
    this.cb.onDisplay(partial);
  }

  // ---------- lifecycle ----------
  mount(): void {
    if (this.mounted) return;
    this.mounted = true;
    this.drawEmptyState();
    void (async () => {
      try {
        await (document.fonts && document.fonts.ready);
      } catch {
        /* ignore */
      }
      if (!this.mounted) return;
      this.setupStage();
      this.initMap();
      this.ro = new ResizeObserver(() => this.resizeStage());
      this.ro.observe(this.refs.stageArea);
      this.onResize = () => this.resizeStage();
      window.addEventListener("resize", this.onResize);
      this.disp({ ready: true });
      this.drawEmptyState();
    })();
  }

  destroy(): void {
    this.mounted = false;
    this.cancelRun();
    if (this.ro) this.ro.disconnect();
    if (this.onResize) window.removeEventListener("resize", this.onResize);
    if (this.map) {
      try {
        this.map.remove();
      } catch {
        /* ignore */
      }
      this.map = null;
    }
  }

  /** React → engine: settings changed. Diff and react like the old componentDidUpdate. */
  updateSettings(next: Settings): void {
    const prev = this.settings;
    this.settings = next;
    if (!this.mounted) return;
    // Any settings change invalidates a pre-render (and aborts one in progress).
    if (this.capturing) {
      this.cancelRun();
      this.abortCapture();
      this.disp({ playing: false });
    }
    this.invalidatePrepared();

    if (next.theme !== prev.theme) {
      this.swapMapStyle();
      return; // style.load handler re-colors + renders
    }
    const accentChanged = next.accent !== prev.accent;
    if (accentChanged && this.mapReady) this.applyRouteColors();
    if (next.sport !== prev.sport && this.stats) this.stats.sport = next.sport;

    // An accent change repaints the map's route/tracker layers asynchronously.
    // Compositing now would snapshot them in the OLD color while the HUD (drawn
    // fresh) already shows the new one. Defer to the next map "idle" so the map
    // route/tracker recolor in the same frame as the HUD.
    if (accentChanged && this.mapReady && this.hasData && !this.running) {
      this.recolorPending = true;
      this.updateScrubberDom(this.progress);
      return; // onAccentApplied fires from the idle handler
    }

    this.maybeFetchWeather();
    this.staticRedraw();
    this.updateScrubberDom(this.progress);
    // Immediate cases (playing, empty state, map not yet ready): the accent is
    // already reflected, so let the chrome recolor now.
    if (accentChanged) this.cb.onAccentApplied(next.accent);
  }

  // ---------- map ----------
  private styleUrl(): string {
    return MAP_STYLES[this.settings.theme];
  }

  private pad2(n: number): string {
    return String(n).padStart(2, "0");
  }

  /** The activity's start hour from the file, else noon. */
  private effectiveHour(): number {
    const d = this.stats?.startDate;
    return d ? d.getHours() : 12;
  }

  /** "HH:MM" label for the datetime overlay, or null when unknown. */
  private timeLabel(): string | null {
    if (!this.hasData) return null;
    const d = this.stats?.startDate;
    if (d) return this.pad2(d.getHours()) + ":" + this.pad2(d.getMinutes());
    return null;
  }

  /**
   * Fetch weather for the activity's location/date/hour when the overlay is on.
   * Keyed + guarded so it only hits the network when inputs actually change and
   * a stale response can't overwrite a newer one.
   */
  private maybeFetchWeather(): void {
    if (!this.hasData || !this.stats || !this.settings.overlays.weather) return;
    // Manual override: the user set the weather by hand (model was wrong).
    if (this.settings.weatherManual) {
      const key = `manual,${this.settings.weatherTempC},${this.settings.weatherCode}`;
      if (key === this.weatherKey) return;
      this.weatherKey = key;
      this.weather = {
        tempC: this.settings.weatherTempC,
        code: this.settings.weatherCode,
      };
      if (!this.running) this.renderOnce(this.progress);
      return;
    }
    const c = this.stats.coords[0];
    if (!c) return;
    const lat = c[1];
    const lon = c[0];
    const date = this.stats.startDate ?? new Date();
    const hour = this.effectiveHour();
    const dayKey = `${date.getFullYear()}-${this.pad2(date.getMonth() + 1)}-${this.pad2(date.getDate())}`;
    const key = `${lat.toFixed(3)},${lon.toFixed(3)},${dayKey},${hour}`;
    if (key === this.weatherKey) return;
    this.weatherKey = key;
    void fetchWeather(lat, lon, date, hour).then((w) => {
      if (this.weatherKey !== key) return; // superseded
      this.weather = w;
      if (!this.running) this.renderOnce(this.progress);
    });
  }

  /**
   * Reload the base map for a dark/light theme change. The MapLibre container
   * crossfades (CSS) while the new style loads so the swap reads as one motion
   * with the app chrome instead of popping a beat later, and the route sources
   * + layers are carried across the reload so the trail and tracker stay on
   * screen (and re-color in the same frame) rather than vanishing last.
   */
  private swapMapStyle(): void {
    const map = this.map;
    if (!map) {
      if (!this.hasData) this.drawEmptyState();
      return;
    }
    this.mapReady = false;
    this.swapping = true;
    map.setStyle(this.styleUrl(), {
      diff: false,
      transformStyle: (previous, next) => {
        if (!previous) return next;
        const carry = new Set([
          "route-bg",
          "route-glow",
          "route-progress",
          "head-glow",
          "head",
        ]);
        const sources = { ...next.sources };
        for (const id of ["route-full", "route-prog", "route-head"]) {
          if (previous.sources[id]) sources[id] = previous.sources[id];
        }
        return {
          ...next,
          sources,
          layers: [...next.layers, ...previous.layers.filter((l) => carry.has(l.id))],
        };
      },
    });
  }

  private initMap(): void {
    this.map = new MapLibreMap({
      container: this.refs.mapContainer,
      style: this.styleUrl(),
      center: [-43.9378, -19.9208], // Belo Horizonte
      zoom: 12,
      pitch: 0,
      bearing: 0,
      interactive: false,
      attributionControl: false,
      preserveDrawingBuffer: true,
      fadeDuration: 0,
      dragRotate: false,
      refreshExpiredTiles: false,
    });
    this.map.on("style.load", () => {
      this.addRouteLayers();
      // Re-apply accent + theme-aware dim: after a theme swap the carried-over
      // route layers still hold the previous theme's colors.
      this.applyRouteColors();
      this.mapReady = true;
      // Prime the map's own state with the new style, but DON'T composite the
      // canvas yet during a theme swap — updateTrail() re-sets the route source,
      // which the map paints asynchronously. Compositing now would snapshot the
      // base map without the freshly-moved route/tracker. The "idle" handler
      // below composites once everything is painted, and flips the app chrome in
      // the very same beat so the page and the map change together.
      if (this.stats) {
        this.pushRoute();
        this.updateTrail(this.progress);
        if (!this.swapping) this.renderOnce(this.progress);
      } else {
        if (this.pendingRoute) this.pushRoute();
        if (!this.swapping) this.drawEmptyState();
      }
      if (!this.swapping) this.cb.onThemeApplied(this.settings.theme);
    });
    this.map.on("idle", () => {
      if (this.running) return;
      if (!this.mapAnnounced) {
        this.mapAnnounced = true;
        this.disp({ mapReady: true });
      }
      if (this.swapping) {
        // New base + route are fully painted now: composite the whole stage in
        // one frame (base, route, tracker and HUD together) and flip the chrome.
        this.swapping = false;
        this.draw(this.progress);
        this.cb.onThemeApplied(this.settings.theme);
        return;
      }
      if (this.recolorPending) {
        // Route/tracker paint properties are now applied: composite the whole
        // stage in one frame so map colors and HUD colors change together, and
        // flip the app chrome's accent in the same beat.
        this.recolorPending = false;
        this.draw(this.progress);
        this.cb.onAccentApplied(this.settings.accent);
        return;
      }
      if (this.hasData && this.stats && !this.overviewFitted) {
        // The overview was computed before the map was sized; refit now that it
        // is so the opening frame actually contains the route.
        this.computeOverview();
        if (!this.running && this.progress === 0) this.jumpOverview();
      }
      if (this.hasData) this.renderOnce(this.progress);
      else this.drawEmptyState();
    });
    this.map.on("error", () => {
      /* tile hiccups are non-fatal */
    });
  }

  private addRouteLayers(): void {
    if (!this.map || this.map.getSource("route-full")) return;
    const empty: FeatureCollection = {
      type: "FeatureCollection",
      features: [],
    };
    this.map.addSource("route-full", { type: "geojson", data: empty });
    this.map.addSource("route-prog", { type: "geojson", data: empty });
    this.map.addSource("route-head", { type: "geojson", data: empty });
    const acc = this.settings.accent;
    const dim =
      this.settings.theme === "dark" ? "rgba(255,255,255,0.28)" : "rgba(20,25,30,0.30)";
    this.map.addLayer({
      id: "route-bg",
      type: "line",
      source: "route-full",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": dim, "line-width": 4 },
    });
    this.map.addLayer({
      id: "route-glow",
      type: "line",
      source: "route-prog",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": acc,
        "line-width": 16,
        "line-blur": 12,
        "line-opacity": 0.5,
      },
    });
    this.map.addLayer({
      id: "route-progress",
      type: "line",
      source: "route-prog",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": acc, "line-width": 6 },
    });
    this.map.addLayer({
      id: "head-glow",
      type: "circle",
      source: "route-head",
      paint: {
        "circle-radius": 22,
        "circle-color": acc,
        "circle-opacity": 0.22,
        "circle-blur": 1,
      },
    });
    this.map.addLayer({
      id: "head",
      type: "circle",
      source: "route-head",
      paint: {
        "circle-radius": 8,
        "circle-color": "#ffffff",
        "circle-stroke-color": acc,
        "circle-stroke-width": 4,
      },
    });
  }

  private applyRouteColors(): void {
    if (!this.map || !this.map.getLayer("route-progress")) return;
    const a = this.settings.accent;
    this.map.setPaintProperty("route-glow", "line-color", a);
    this.map.setPaintProperty("route-progress", "line-color", a);
    this.map.setPaintProperty("head-glow", "circle-color", a);
    this.map.setPaintProperty("head", "circle-stroke-color", a);
    const dim =
      this.settings.theme === "dark" ? "rgba(255,255,255,0.28)" : "rgba(20,25,30,0.30)";
    this.map.setPaintProperty("route-bg", "line-color", dim);
  }

  private pushRoute(): void {
    if (!this.mapReady || !this.stats || !this.map) return;
    const src = this.map.getSource("route-full") as GeoJSONSource | undefined;
    src?.setData(lineFeature(this.stats.coords));
    this.pendingRoute = false;
  }

  // ---------- stage sizing ----------
  private setupStage(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const m = this.refs.mapContainer;
    m.style.width = STAGE_W / dpr + "px";
    m.style.height = STAGE_H / dpr + "px";
    this.dpr = dpr;
    this.resizeStage();
  }

  private resizeStage(): void {
    const area = this.refs.stageArea;
    const wrap = this.refs.stageWrap;
    if (!area || !wrap) return;
    const pad = 34;
    const s = Math.min(
      (area.clientWidth - pad) / STAGE_W,
      (area.clientHeight - pad) / STAGE_H,
    );
    wrap.style.transform = `translate(-50%,-50%) scale(${Math.max(0.05, s)})`;
  }

  // ---------- overview camera ----------
  private computeOverview(): void {
    if (!this.stats) return;
    let minLng = Infinity,
      minLat = Infinity,
      maxLng = -Infinity,
      maxLat = -Infinity;
    for (const c of this.stats.coords) {
      minLng = Math.min(minLng, c[0]);
      maxLng = Math.max(maxLng, c[0]);
      minLat = Math.min(minLat, c[1]);
      maxLat = Math.max(maxLat, c[1]);
    }
    this.bounds = [
      [minLng, minLat],
      [maxLng, maxLat],
    ];
    this.overviewFitted = false;
    // The map container is sized in CSS px (STAGE / devicePixelRatio), so its
    // viewport is ~960px tall on a 2x display, not 1920. Padding must therefore
    // be a fraction of the ACTUAL viewport, otherwise fixed px values eat the
    // whole frame on high-DPI screens and the route gets zoomed way out.
    const canvas = this.map?.getCanvas();
    const vw = canvas?.clientWidth ?? 0;
    const vh = canvas?.clientHeight ?? 0;
    if (this.map && vw > 0 && vh > 0) {
      try {
        const cam = this.map.cameraForBounds(this.bounds, {
          padding: {
            top: Math.round(vh * 0.08),
            bottom: Math.round(vh * 0.3), // room for the HUD stats card
            left: Math.round(vw * 0.08),
            right: Math.round(vw * 0.08),
          },
          maxZoom: 15.5, // don't punch in to street level on a tiny activity
          bearing: 0,
        });
        if (cam && cam.center) {
          const c = LngLat.convert(cam.center);
          this.overview = { center: [c.lng, c.lat], zoom: cam.zoom ?? 13 };
          // Trust the fit only once the map is sized; otherwise the first
          // "idle" refits it (see the idle handler).
          this.overviewFitted = this.mapReady;
        }
      } catch {
        /* fall through to bbox centre */
      }
    }
    if (!this.overview) {
      this.overview = {
        center: [(minLng + maxLng) / 2, (minLat + maxLat) / 2],
        zoom: 13,
      };
    }
  }

  private jumpOverview(): void {
    if (this.map && this.overview) {
      this.map.jumpTo({
        center: this.overview.center,
        zoom: this.overview.zoom,
        pitch: 0,
        bearing: 0,
      });
    }
  }

  // ---------- position sampling ----------
  private posAt(p: number): {
    lng: number;
    lat: number;
    idx: number;
    frac: number;
    dist: number;
  } {
    const s = this.stats!;
    const { cum, coords, total } = s;
    if (p <= 0)
      return { lng: coords[0][0], lat: coords[0][1], idx: 0, frac: 0, dist: 0 };
    if (p >= 1) {
      const n = coords.length - 1;
      return { lng: coords[n][0], lat: coords[n][1], idx: n, frac: 0, dist: total };
    }
    const target = p * total;
    let i = this.hint || 0;
    if (cum[i] > target) i = 0;
    while (i < cum.length - 1 && cum[i + 1] < target) i++;
    this.hint = i;
    const seg = cum[i + 1] - cum[i] || 1;
    const frac = (target - cum[i]) / seg;
    return {
      lng: lerp(coords[i][0], coords[i + 1][0], frac),
      lat: lerp(coords[i][1], coords[i + 1][1], frac),
      idx: i,
      frac,
      dist: target,
    };
  }

  private getCur(p: number): CurSample {
    const s = this.stats!;
    const at = this.posAt(p);
    const i = at.idx;
    const f = at.frac;
    const j = Math.min(i + 1, s.coords.length - 1);
    const li = (arr: (number | null)[]): number | null => {
      const a = arr[i];
      const b = arr[j];
      return a == null || b == null ? a : lerp(a, b, f);
    };
    const hrv = s.hasHr ? li(s.hr) : null;
    return {
      lng: at.lng,
      lat: at.lat,
      idx: i,
      dist: at.dist,
      ele: s.hasEle ? li(s.ele) : null,
      hr: hrv == null ? null : Math.round(hrv),
      spd: s.hasTime ? li(s.spd) : null,
      elapsed:
        s.hasTime && s.times ? (li(s.times) as number) : p * this.settings.durationSec,
      gain: lerp(s.gain[i], s.gain[j], f),
      cal: s.calories * (at.dist / (s.total || 1)),
    };
  }

  private headingAt(p: number): number {
    const a = this.posAt(p);
    const b = this.posAt(Math.min(1, p + 0.012));
    const brg = bearing(a, b);
    this.brg = this.brg == null ? brg : lerpAngle(this.brg, brg, 0.22);
    return this.brg;
  }

  // ---------- chase camera ----------
  private setCamera(p: number): void {
    if (!this.stats || !this.overview || !this.map) return;
    const io = this.settings.introOutro !== false;
    const pitch = this.settings.cameraPitch == null ? 55 : +this.settings.cameraPitch;
    const chase = (pp: number): CameraLike => {
      const c = this.posAt(pp);
      return {
        center: [c.lng, c.lat],
        zoom: this.stats!.chaseZoom,
        pitch,
        bearing: this.headingAt(pp),
      };
    };
    const ov: CameraLike = {
      center: this.overview.center,
      zoom: this.overview.zoom,
      pitch: 0,
      bearing: 0,
    };
    let cam: CameraLike;
    if (io && p < 0.12) {
      // Fly in from the overview toward the chase camera at the CURRENT position
      // (not the start), so center/zoom/pitch land continuously at p=0.12.
      // smootherstep (quintic) has zero 1st AND 2nd derivative at both ends, so
      // the hand-off carries no velocity or acceleration jump.
      const k = smootherstep(p / 0.12);
      const g = chase(p);
      // Aim the fly-in at the heading the chase will actually HOLD at the
      // hand-off (its instantaneous heading at 0.12, computed with the same
      // forward step as headingAt), and seed brg to it. Then headingAt(0.12)
      // reproduces exactly this angle, so there is no yaw kick when the chase
      // takes over. A single fixed target also avoids lerpAngle flipping the
      // rotation direction mid-fly-in.
      const introHead = bearing(this.posAt(0.12), this.posAt(Math.min(1, 0.132)));
      this.brg = introHead;
      cam = this.blend(ov, g, k);
      cam.bearing = lerpAngle(ov.bearing, introHead, k);
    } else if (io && p > 0.9) {
      // Pull back to the overview from the chase at the current position, so the
      // start of the outro equals chase(0.9) — continuous the same way.
      const k = smootherstep((p - 0.9) / 0.1);
      cam = this.blend(chase(p), ov, k);
    } else {
      cam = chase(p);
    }
    this.map.jumpTo(cam);
  }

  private blend(a: CameraLike, b: CameraLike, k: number): CameraLike {
    return {
      center: [lerp(a.center[0], b.center[0], k), lerp(a.center[1], b.center[1], k)],
      zoom: lerp(a.zoom, b.zoom, k),
      pitch: lerp(a.pitch, b.pitch, k),
      bearing: lerpAngle(a.bearing, b.bearing, k),
    };
  }

  private updateTrail(p: number): void {
    if (!this.mapReady || !this.stats || !this.map) return;
    const at = this.posAt(p);
    const coords: [number, number][] = this.stats.coords
      .slice(0, at.idx + 1)
      .map((c) => [c[0], c[1]]);
    coords.push([at.lng, at.lat]);
    const prog = this.map.getSource("route-prog") as GeoJSONSource | undefined;
    prog?.setData(lineFeature(coords.length > 1 ? coords : [coords[0], coords[0]]));
    const head = this.map.getSource("route-head") as GeoJSONSource | undefined;
    head?.setData(pointFeature([at.lng, at.lat]));
  }

  // ---------- run loop ----------
  private startRun(
    fromP: number,
    opts: {
      record?: boolean;
      onFrame?: (elapsedMs: number, p: number) => void;
    } = {},
  ): void {
    const rec = !!opts.record;
    this.cancelRun();
    const dur = Math.max(3, this.settings.durationSec) * 1000;
    const start = performance.now() - fromP * dur;
    this.running = true;
    this.lastPct = -1;
    if (!rec) this.disp({ playing: true });
    const step = (now: number) => {
      if (!this.running) return;
      let p = (now - start) / dur;
      if (p >= 1) p = 1;
      this.progress = p;
      this.renderOnce(p);
      if (opts.onFrame) opts.onFrame(Math.max(0, now - start), p);
      if (rec) {
        const pc = Math.round(p * 100);
        if (pc !== this.lastPct) {
          this.lastPct = pc;
          this.disp({ exportPct: pc });
        }
      }
      if (p >= 1) {
        this.running = false;
        if (rec) this.exportRes?.();
        else this.disp({ playing: false });
        return;
      }
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }

  private cancelRun(): void {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = undefined;
  }

  togglePlay = (): void => {
    if (!this.hasData || this.recording) return;
    if (this.running) {
      const wasCapturing = this.capturing;
      this.cancelRun();
      if (wasCapturing) this.abortCapture(); // pausing a capture discards it
      this.disp({ playing: false });
      return;
    }
    if (this.progress >= 1) this.progress = 0;
    // A fresh MP4 play doubles as the export render: capture the frames now so a
    // later "Export" downloads instantly with no second render. Any other play
    // (seeked, or PNG format) is just a preview.
    if (this.progress === 0 && this.settings.exportFormat === "mp4") {
      void this.capturePlay();
    } else {
      this.startRun(this.progress, {});
    }
  };

  private outputSig(): string {
    const s = this.settings;
    return JSON.stringify([
      this.fileName,
      s.sport,
      s.accent,
      s.theme,
      s.overlays,
      s.durationSec,
      s.cameraPitch,
      s.introOutro,
      s.exportFormat,
      s.athleteName,
      s.location,
    ]);
  }

  private invalidatePrepared(): void {
    this.prepared = null;
  }

  /** Abort an in-flight capture play and unblock its awaiter. */
  /** Cancel an in-flight export (e.g. Restart pressed mid-render) and re-enable
   * the controls. The export method's abort branch does the cleanup. */
  private abortExport(): void {
    if (!this.recording) return;
    this.exportAborted = true;
    const r = this.exportRes;
    this.exportRes = null;
    if (r) r();
  }

  private abortCapture(): void {
    if (!this.capturing) return;
    this.capturing = false;
    this.prepared = null;
    const r = this.exportRes;
    this.exportRes = null;
    if (r) r();
  }

  /** Play the flyover once AND capture it, storing the blob for a later Export. */
  private async capturePlay(): Promise<void> {
    if (!this.hasData || this.recording || this.capturing) return;
    const sig = this.outputSig();
    if (isAppleMobile()) {
      await this.exportViaMediaRecorder(true, undefined, { capture: true, sig });
      return;
    }
    let codec: string | null = null;
    try {
      const { pickAvcCodec } = await import("../export/mp4");
      codec = await pickAvcCodec(STAGE_W, STAGE_H, 9_000_000, EXPORT_FPS);
    } catch {
      codec = null;
    }
    if (codec) await this.exportViaWebCodecs(codec, { capture: true, sig });
    else await this.exportViaMediaRecorder(true, undefined, { capture: true, sig });
  }

  restart = (): void => {
    if (!this.hasData) return;
    if (this.recording) {
      this.abortExport(); // don't leave the render stuck; re-enables Play/Export
      return;
    }
    this.cancelRun();
    this.abortCapture();
    this.invalidatePrepared();
    this.progress = 0;
    this.brg = null;
    this.disp({ playing: false });
    this.renderOnce(0);
  };

  onSeek = (value: number): void => {
    if (!this.hasData) return;
    const p = value / 1000;
    this.cancelRun();
    this.abortCapture();
    this.invalidatePrepared();
    this.progress = p;
    this.disp({ playing: false });
    this.renderOnce(p);
  };

  private updateScrubberDom(p: number): void {
    const s = this.refs.scrub;
    if (s && document.activeElement !== s) s.value = String(Math.round(p * 1000));
    const t = this.refs.time;
    if (t) {
      const dur =
        this.stats && this.stats.hasTime ? this.stats.dur : this.settings.durationSec;
      t.textContent = fmtClock(p * dur) + " / " + fmtClock(dur);
    }
  }

  // ---------- rendering ----------
  private staticRedraw(): void {
    if (this.running) return;
    if (this.hasData) this.renderOnce(this.progress);
    else this.drawEmptyState();
  }

  private renderOnce(p: number): void {
    if (!this.map) {
      if (!this.stats) this.drawEmptyState();
      return;
    }
    if (this.stats) {
      this.setCamera(p);
      this.updateTrail(p);
    }
    this.draw(p);
    this.updateScrubberDom(p);
  }

  private draw(p: number): void {
    const cv = this.refs.canvas;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const W = STAGE_W;
    const H = STAGE_H;
    ctx.clearRect(0, 0, W, H);
    if (!this.stats) {
      this.drawEmptyState();
      return;
    }
    const mc = this.map?.getCanvas();
    if (mc) {
      try {
        ctx.drawImage(mc, 0, 0, W, H);
      } catch {
        ctx.fillStyle = this.settings.theme === "dark" ? "#0a0c10" : "#e7ebef";
        ctx.fillRect(0, 0, W, H);
      }
    }
    renderHud({
      ctx,
      W,
      H,
      p,
      theme: this.settings.theme,
      accent: this.settings.accent,
      overlays: this.settings.overlays,
      athleteName: this.settings.athleteName,
      location: this.settings.location,
      lang: this.settings.lang,
      weather: this.weather,
      timeLabel: this.timeLabel(),
      stats: this.stats,
      cur: this.getCur(p),
    });
  }

  private drawEmptyState(): void {
    const cv = this.refs.canvas;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    let mapCanvas: HTMLCanvasElement | null = null;
    if (this.mapReady && this.map) {
      try {
        mapCanvas = this.map.getCanvas();
      } catch {
        mapCanvas = null;
      }
    }
    drawEmpty(
      ctx,
      STAGE_W,
      STAGE_H,
      this.settings.theme,
      this.settings.accent,
      this.settings.lang,
      mapCanvas,
    );
  }

  // ---------- data loading ----------
  handleFile = async (file: File): Promise<void> => {
    this.disp({ loading: true, error: null });
    try {
      const res = await parseActivityFile(file);
      this.setData(res.points, res.sport || this.settings.sport, {
        fileName: file.name || "activity",
        calories: res.calories ?? null,
        location: res.location ?? null,
        name: res.name ?? null,
      });
    } catch (err) {
      this.disp({
        loading: false,
        error:
          err instanceof Error && err.message
            ? err.message
            : tr(this.settings.lang).errors.readFail,
      });
    }
  };

  loadDemo = (): void => {
    const demo = buildDemo();
    const athleteName = this.settings.athleteName || demo.athleteName;
    const location = this.settings.location || demo.location;
    this.settings = { ...this.settings, athleteName, location };
    this.cb.onAdoptMeta({
      fileName: demo.fileName,
      sport: demo.sport,
      athleteName,
      location,
    });
    this.setData(demo.points, demo.sport, { fileName: demo.fileName });
  };

  private setData(points: TrackPoint[], sport: Sport, meta: SetDataMeta): void {
    this.cancelRun();
    const stats = buildStats(points, sport, {
      calories: meta.calories ?? null,
      fallbackDurationSec: this.settings.durationSec,
    });

    const athleteName = meta.name || this.settings.athleteName;
    const location = meta.location != null ? meta.location : this.settings.location;
    const fileName = meta.fileName || this.fileName || "activity";

    this.stats = stats;
    this.weather = null;
    this.weatherKey = "";
    this.invalidatePrepared();
    this.hasData = true;
    this.hint = 0;
    this.progress = 0;
    this.brg = null;
    this.fileName = fileName;

    // Keep engine settings correct for the immediate render; React re-syncs via onAdoptMeta.
    this.settings = { ...this.settings, sport, athleteName, location };

    if (this.mapReady) this.pushRoute();
    else this.pendingRoute = true;
    this.computeOverview();

    this.cb.onAdoptMeta({ fileName, sport, athleteName, location });
    this.disp({
      hasData: true,
      loading: false,
      error: null,
      playing: false,
      fileName,
      sumDist: fmtKm(stats.total),
      sumDur: stats.hasTime ? fmtClock(stats.dur) : "—",
      sumPts: "" + points.length,
    });

    this.jumpOverview();
    this.renderOnce(0);
    this.maybeFetchWeather();
    this.maybeFillLocation();
  }

  /** When the file/user gave no location, prefill it from the start address. */
  private maybeFillLocation(): void {
    if (this.settings.location || !this.stats) return;
    const c = this.stats.coords[0];
    if (!c) return;
    const lang = this.settings.lang;
    void reverseGeocode(c[1], c[0], lang).then((loc) => {
      if (!loc || this.settings.location) return; // user typed one meanwhile
      this.settings = { ...this.settings, location: loc };
      this.cb.onAdoptMeta({
        fileName: this.fileName,
        sport: this.settings.sport,
        athleteName: this.settings.athleteName,
        location: loc,
      });
      this.staticRedraw();
    });
  }

  // ---------- export ----------
  private awaitIdle(timeout: number): Promise<void> {
    return new Promise<void>((res) => {
      let done = false;
      const f = () => {
        if (done) return;
        done = true;
        try {
          this.map?.off("idle", f);
        } catch {
          /* ignore */
        }
        res();
      };
      try {
        this.map?.once("idle", f);
      } catch {
        res();
      }
      setTimeout(f, timeout);
    });
  }

  /** Export a single PNG frame of the current view of the activity. */
  exportImage = async (): Promise<void> => {
    if (!this.hasData || this.recording) return;
    this.cancelRun();
    this.disp({ playing: false });
    // Let the map settle so the snapshot is crisp, then composite one frame.
    await this.awaitIdle(1500);
    this.renderOnce(this.progress);
    const cv = this.refs.canvas;
    const base = sanitizeBase(this.fileName || "activity");
    await new Promise<void>((res) => {
      cv.toBlob((blob) => {
        if (blob) downloadBlob(blob, base + ".png");
        res();
      }, "image/png");
    });
  };

  exportVideo = async (): Promise<void> => {
    if (!this.hasData || this.recording || this.capturing) return;
    // Reuse a pre-render captured during a preceding Play when it still matches
    // the current settings — instant, no second render.
    if (this.prepared && this.prepared.sig === this.outputSig()) {
      const base = sanitizeBase(
        this.settings.athleteName || this.settings.sport || "activity",
      );
      const ext = this.prepared.blob.type.indexOf("mp4") >= 0 ? "mp4" : "webm";
      downloadBlob(this.prepared.blob, `${base}-flyover.${ext}`);
      return;
    }
    const wantMp4 = this.settings.exportFormat === "mp4";
    // iOS (all browsers are WebKit) has a flaky WebCodecs H.264 encoder but
    // records H.264 MP4 natively via MediaRecorder — route straight there so it
    // works and doesn't render twice (attempt + fallback).
    if (wantMp4 && !isAppleMobile()) {
      let codec: string | null = null;
      try {
        const { pickAvcCodec } = await import("../export/mp4");
        codec = await pickAvcCodec(STAGE_W, STAGE_H, 9_000_000, EXPORT_FPS);
      } catch {
        codec = null;
      }
      if (codec) {
        await this.exportViaWebCodecs(codec);
        return;
      }
    }
    await this.exportViaMediaRecorder(wantMp4);
  };

  /** MP4 via the browser's WebCodecs H.264 encoder — frames captured live. */
  private async exportViaWebCodecs(
    codec: string,
    opts: { capture?: boolean; sig?: string } = {},
  ): Promise<void> {
    const cap = !!opts.capture;
    const cv = this.refs.canvas;
    this.cancelRun();
    this.exportAborted = false;
    if (cap) this.capturing = true;
    else this.recording = true;
    this.disp(
      cap
        ? { playing: true, error: null }
        : {
            recording: true,
            playing: false,
            exportPct: 0,
            exportStage: "Rendering frames",
            error: null,
          },
    );
    this.progress = 0;
    this.brg = null;
    this.jumpOverview();
    await this.awaitIdle(cap ? 1200 : 2600);
    if (cap && !this.capturing) return; // aborted during idle

    const { Mp4FrameRecorder } = await import("../export/mp4");
    let recorder: InstanceType<typeof Mp4FrameRecorder>;
    try {
      recorder = new Mp4FrameRecorder({
        width: STAGE_W,
        height: STAGE_H,
        fps: EXPORT_FPS,
        bitrate: 9_000_000,
        codec,
      });
    } catch {
      if (cap) {
        this.capturing = false;
        this.disp({ playing: false });
        return;
      }
      this.recording = false;
      await this.exportViaMediaRecorder(
        true,
        "The MP4 encoder isn’t available here — saved with your browser’s recorder instead.",
      );
      return;
    }

    let frameErr: unknown = null;
    await new Promise<void>((res) => {
      this.exportRes = res;
      this.startRun(0, {
        record: true,
        onFrame: (elapsedMs) => {
          if (frameErr || (cap && !this.capturing)) return;
          try {
            recorder.addFrame(cv, Math.round(elapsedMs * 1000));
          } catch (e) {
            frameErr = e;
          }
        },
      });
    });
    if (cap && !this.capturing) {
      recorder.abort();
      this.disp({ playing: false });
      return;
    }
    if (this.exportAborted) {
      recorder.abort();
      this.recording = false;
      this.exportAborted = false;
      this.disp({ recording: false, playing: false, exportPct: 0, exportStage: "" });
      this.renderOnce(this.progress);
      return;
    }

    const base = sanitizeBase(
      this.settings.athleteName || this.settings.sport || "activity",
    );
    try {
      if (frameErr) throw frameErr;
      if (!cap) this.disp({ exportStage: "Finishing MP4" });
      const blob = await recorder.finish();
      if (cap) {
        this.prepared = { blob, sig: opts.sig ?? this.outputSig() };
        this.capturing = false;
        this.disp({ playing: false });
      } else {
        downloadBlob(blob, `${base}-flyover.mp4`);
        this.recording = false;
        this.disp({ recording: false, exportPct: 100, exportStage: "Done" });
      }
    } catch {
      recorder.abort();
      if (cap) {
        this.capturing = false;
        this.prepared = null;
        this.disp({ playing: false });
        return;
      }
      this.recording = false;
      await this.exportViaMediaRecorder(
        true,
        "MP4 encoding failed on this device — saved with your browser’s recorder instead.",
      );
      return;
    }

    if (!cap) setTimeout(() => this.disp({ exportPct: 0, exportStage: "" }), 1400);
    this.renderOnce(1);
  }

  /** WebM via MediaRecorder (also native MP4 on Safari/iOS). Fallback + capture. */
  private async exportViaMediaRecorder(
    wantedMp4: boolean,
    note?: string,
    opts: { capture?: boolean; sig?: string } = {},
  ): Promise<void> {
    const cap = !!opts.capture;
    const cv = this.refs.canvas;
    const mime = pickMime(wantedMp4);
    if (!mime) {
      if (cap) {
        this.capturing = false;
        this.disp({ playing: false });
        return;
      }
      this.recording = false;
      this.disp({
        recording: false,
        error:
          "Video recording isn’t supported in this browser. Try Chrome or Edge.",
      });
      return;
    }
    this.cancelRun();
    this.exportAborted = false;
    if (cap) this.capturing = true;
    else this.recording = true;
    this.disp(
      cap
        ? { playing: true, error: null }
        : {
            recording: true,
            playing: false,
            exportPct: 0,
            exportStage: "Rendering frames",
            error: null,
          },
    );
    this.progress = 0;
    this.brg = null;
    this.jumpOverview();
    await this.awaitIdle(cap ? 1200 : 2600);
    if (cap && !this.capturing) return;

    let stream: MediaStream;
    try {
      stream = cv.captureStream(EXPORT_FPS);
    } catch {
      if (cap) {
        this.capturing = false;
        this.disp({ playing: false });
        return;
      }
      this.recording = false;
      this.disp({ recording: false, error: "Could not capture the canvas." });
      return;
    }

    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(stream, {
        mimeType: mime,
        videoBitsPerSecond: 9_000_000,
      });
    } catch {
      if (cap) {
        this.capturing = false;
        this.disp({ playing: false });
        return;
      }
      this.recording = false;
      this.disp({ recording: false, error: "Recorder init failed." });
      return;
    }

    const chunks: BlobPart[] = [];
    rec.ondataavailable = (e) => {
      if (e.data && e.data.size) chunks.push(e.data);
    };
    const stopped = new Promise<void>((r) => {
      rec.onstop = () => r();
    });
    try {
      rec.start(120);
    } catch {
      if (cap) {
        this.capturing = false;
        this.disp({ playing: false });
        return;
      }
      this.recording = false;
      this.disp({ recording: false, error: "Recorder could not start." });
      return;
    }

    await new Promise<void>((res) => {
      this.exportRes = res;
      this.startRun(0, { record: true });
    });
    await new Promise((r) => setTimeout(r, 200));
    try {
      rec.stop();
    } catch {
      /* ignore */
    }
    await stopped;
    if (cap && !this.capturing) {
      this.disp({ playing: false });
      return;
    }
    if (this.exportAborted) {
      this.recording = false;
      this.exportAborted = false;
      this.disp({ recording: false, playing: false, exportPct: 0, exportStage: "" });
      this.renderOnce(this.progress);
      return;
    }

    const recordedMp4 = mime.indexOf("mp4") >= 0;
    const blob = new Blob(chunks, { type: mime });
    const base = sanitizeBase(
      this.settings.athleteName || this.settings.sport || "activity",
    );

    if (cap) {
      this.prepared = { blob, sig: opts.sig ?? this.outputSig() };
      this.capturing = false;
      this.disp({ playing: false });
      this.renderOnce(1);
      return;
    }

    downloadBlob(blob, `${base}-flyover.${recordedMp4 ? "mp4" : "webm"}`);
    const fallbackNote =
      note ??
      (wantedMp4 && !recordedMp4
        ? "This browser can’t encode MP4 — saved a WebM. Try Chrome or Edge for MP4."
        : null);
    this.recording = false;
    this.disp({
      recording: false,
      exportPct: 100,
      exportStage: "Done",
      error: fallbackNote,
    });
    setTimeout(() => this.disp({ exportPct: 0, exportStage: "" }), 1400);
    this.renderOnce(1);
  }
}
