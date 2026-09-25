"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FlyoverEngine } from "@/lib/engine/FlyoverEngine";
import type { DisplayState, ParsedMeta, Settings, Theme } from "@/lib/types";
import { DEFAULT_SETTINGS, THEME_DEFAULT_ACCENT } from "@/lib/constants";
import { readSettingsFromUrl } from "@/lib/urlState";

const INITIAL_DISPLAY: DisplayState = {
  ready: false,
  mapReady: false,
  hasData: false,
  loading: false,
  error: null,
  playing: false,
  recording: false,
  exportPct: 0,
  exportStage: "",
  fileName: "",
  sumDist: "—",
  sumDur: "—",
  sumPts: "—",
};

export function useFlyover() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const stageAreaRef = useRef<HTMLDivElement>(null);
  const stageWrapRef = useRef<HTMLDivElement>(null);
  const scrubRef = useRef<HTMLInputElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);

  const engineRef = useRef<FlyoverEngine | null>(null);

  // ssr:false guarantees we're in the browser, so reading the URL here is safe.
  const [settings, setSettings] = useState<Settings>(() => {
    const fromUrl = readSettingsFromUrl();
    const base = { ...DEFAULT_SETTINGS, ...fromUrl };
    // On open/reload, keep the accent readable for the theme (orange on light,
    // green on dark). With no accent in the URL, use that theme's default; if the
    // URL carries the OTHER theme's default (e.g. a stale green from a copied
    // light-theme link), snap it — green-on-light has poor contrast. A genuinely
    // custom accent is preserved.
    if (fromUrl.accent === undefined) {
      base.accent = THEME_DEFAULT_ACCENT[base.theme];
    } else {
      const other = base.theme === "dark" ? "light" : "dark";
      if (base.accent.toLowerCase() === THEME_DEFAULT_ACCENT[other].toLowerCase()) {
        base.accent = THEME_DEFAULT_ACCENT[base.theme];
      }
    }
    return base;
  });
  const [display, setDisplay] = useState<DisplayState>(INITIAL_DISPLAY);
  // The theme the MAP has actually finished painting. The app chrome follows
  // this (not settings.theme) so page + map flip together on a theme swap.
  const [appliedTheme, setAppliedTheme] = useState<Theme>(settings.theme);
  // The accent the MAP/HUD has actually finished painting. The app chrome
  // follows this (not settings.accent) so page + map recolor together.
  const [appliedAccent, setAppliedAccent] = useState<string>(settings.accent);

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Create + tear down the engine once.
  useEffect(() => {
    if (
      !canvasRef.current ||
      !mapRef.current ||
      !stageAreaRef.current ||
      !stageWrapRef.current ||
      !scrubRef.current ||
      !timeRef.current
    ) {
      return;
    }
    const engine = new FlyoverEngine(
      {
        canvas: canvasRef.current,
        mapContainer: mapRef.current,
        stageArea: stageAreaRef.current,
        stageWrap: stageWrapRef.current,
        scrub: scrubRef.current,
        time: timeRef.current,
      },
      {
        onDisplay: (partial) => setDisplay((d) => ({ ...d, ...partial })),
        onAdoptMeta: (meta: ParsedMeta) =>
          setSettings((s) => ({
            ...s,
            sport: meta.sport ?? s.sport,
            athleteName: meta.athleteName ?? s.athleteName,
            location: meta.location ?? s.location,
          })),
        onThemeApplied: (theme: Theme) => setAppliedTheme(theme),
        onAccentApplied: (accent: string) => setAppliedAccent(accent),
      },
      settingsRef.current,
    );
    engineRef.current = engine;
    engine.mount();
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // Push user setting changes into the engine.
  useEffect(() => {
    engineRef.current?.updateSettings(settings);
  }, [settings]);

  const patch = useCallback((p: Partial<Settings>) => {
    setSettings((s) => ({ ...s, ...p }));
  }, []);

  const toggleOverlay = useCallback((key: keyof Settings["overlays"]) => {
    setSettings((s) => ({
      ...s,
      overlays: { ...s.overlays, [key]: !s.overlays[key] },
    }));
  }, []);

  const handleFile = useCallback((f: File) => {
    void engineRef.current?.handleFile(f);
  }, []);
  const loadDemo = useCallback(() => engineRef.current?.loadDemo(), []);
  const togglePlay = useCallback(() => engineRef.current?.togglePlay(), []);
  const restart = useCallback(() => engineRef.current?.restart(), []);
  const onSeek = useCallback((v: number) => engineRef.current?.onSeek(v), []);
  const exportVideo = useCallback(() => engineRef.current?.exportVideo(), []);
  const exportImage = useCallback(() => engineRef.current?.exportImage(), []);

  return {
    refs: { canvasRef, mapRef, stageAreaRef, stageWrapRef, scrubRef, timeRef },
    settings,
    appliedTheme,
    appliedAccent,
    setSettings,
    patch,
    toggleOverlay,
    display,
    actions: {
      handleFile,
      loadDemo,
      togglePlay,
      restart,
      onSeek,
      exportVideo,
      exportImage,
    },
  };
}

export type UseFlyover = ReturnType<typeof useFlyover>;
