# Route Flyover Studio

> **On this repository's history.** The commit history was reconstructed in one pass
> to read as a legible, incremental build of the existing code. Commits use today's
> dates (not backdated) and describe what each change contains — see `docs/` and
> `CLAUDE.md` for the project's context and conventions.
Turn a GPS activity file into a cinematic **9:16 (1080×1920)** flyover video — a 3D map that chases your route while an animated HUD counts up your stats. Everything runs **in the browser**: parsing, map rendering, the canvas overlay and video encoding. No server, no API keys.

Built with **Next.js (App Router) + TypeScript**, **MapLibre GL** and free **OpenFreeMap / OpenStreetMap** tiles.

<br>

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000, click **Load demo activity** (or drop your own file), then **Export**.

Other scripts:

```bash
npm run build      # production build
npm run start      # serve the production build
npm run typecheck  # tsc --noEmit
npm run lint       # next lint
```

Requires Node 18.18+ (Node 20+ recommended). Best in Chrome/Edge — video export needs `MediaRecorder`.

<br>

## What it does

- **Import** GPX, GeoJSON/JSON, FIT and KML activity files (drag-and-drop or browse), with a built-in demo run.
- **Flyover** — a MapLibre 3D map follows the route with a chase camera, an animated trail and a glowing head marker, plus an intro/outro fly-in from the full-route overview.
- **HUD overlays** (all toggleable): athlete name + sport badge, date & location, distance, time, pace/speed, max speed, elevation gain, an elevation chart, heart rate, calories and a mini route map.
- **Themes** — dark or light map styling.
- **Playback** — play/pause, restart and a scrubbable timeline.
- **Export** — records the canvas to **WebM**, or transcodes to **MP4** (H.264) for Instagram/TikTok.

### Enhancements over the original prototype

- **MP4 export** via the browser-native **WebCodecs** H.264 encoder + `mp4-muxer` — fast, hardware-accelerated where available, no wasm/CDN/headers. Frames are captured live during the flyover (so the async map render is handled), then muxed to MP4. Where H.264 encode isn’t available (e.g. Firefox) it falls back to WebM with a note. (This replaced an earlier ffmpeg.wasm approach that fetched a 30 MB core from a CDN and was too slow at 1080×1920.)
- **Light theme for the whole app** — the Dark/Light toggle themes the entire UI (header, sidebar, transport) as well as the map/video, via CSS variables on `data-theme`.
- **Responsive layout** — fits a laptop screen at 100% (no clipping); the sidebar scrolls independently on desktop and the panels stack above the stage on narrow/mobile widths.
- **Accent presets** and **camera controls** (tilt + intro/outro toggle) surfaced in the UI.
- **Shareable links** — “Copy shareable link” encodes every setting (theme, accent, overlays, camera, length…) into the URL. The activity file isn’t included; recipients drop their own.

<br>

## How it’s structured

```
src/
  app/
    layout.tsx            Root layout; loads Space Grotesk + IBM Plex Mono (needed by the canvas HUD)
    page.tsx              Server page → renders the client shell
    icon.svg, globals.css
  components/
    StudioClient.tsx      dynamic(ssr:false) boundary — keeps all browser-only code off the server
    RouteFlyoverStudio.tsx  Top-level layout (header + sidebar + stage + transport)
    Sidebar.tsx  Stage.tsx  Transport.tsx  icons.tsx
  hooks/
    useFlyover.ts         Owns Settings state, instantiates the engine, wires React ↔ engine
  lib/
    engine/
      FlyoverEngine.ts    Imperative core: MapLibre, chase camera, animation loop, export
      hud.ts              Canvas HUD renderer (scrims, stats, elevation chart, mini-map, progress bar)
    parsers/              gpx.ts kml.ts geojson.ts fit.ts (+ dispatcher)
    export/
      recorder.ts         MediaRecorder helpers (mime pick, download) — video fallback
      mp4.ts              WebCodecs H.264 encoder + mp4-muxer — MP4 path
    stats.ts geo.ts demo.ts format.ts urlState.ts constants.ts types.ts
```

**Design:** React owns the user-editable `Settings` (single source of truth) and pushes them into `FlyoverEngine` via `updateSettings()`. The engine owns everything imperative (map, canvas, animation, timing, export) and pushes read-only `DisplayState` (ready, hasData, playing, recording, export progress, summaries) back to React through callbacks. This keeps the render loop off React’s critical path while inputs stay declarative.

The export canvas is a fixed 1080×1920 `<canvas>`. Each frame it composites the MapLibre WebGL canvas (`preserveDrawingBuffer: true`) via `drawImage`, then paints the HUD on top. **MP4** feeds each rendered frame as a `VideoFrame` to a WebCodecs `VideoEncoder` (with an internal `MediaRecorder`/WebM fallback when WebCodecs H.264 encode is unavailable). **PNG** snapshots the current composited frame via `canvas.toBlob`.

<br>

## Notes & limitations

- Map tiles come from OpenFreeMap; if it’s unreachable the route/HUD still render over a blank map.
- FIT decoding uses `fit-file-parser` (lazy-loaded), parsed in metres. Note: a device that records flat/constant altitude (some watches indoors) legitimately has ~0 elevation gain.
- Export is **MP4** (video) or **PNG** (a single 1080×1920 image of the current view). MP4 needs a browser with WebCodecs H.264 encode (Chrome, Edge, desktop Safari); elsewhere it transparently falls back to a WebM file.
- Weather (optional overlay) is fetched client-side from Open-Meteo (keyless) by the activity's coordinates, date and hour.

<br>

## Development

Package manager: **Yarn** (v1, via Corepack). Agent-maintained.

```
yarn dev            # dev server
yarn build          # production build
yarn typecheck      # tsc --noEmit
yarn lint           # eslint (next lint)
yarn test           # vitest (unit tests, src/lib/__tests__)
yarn test:watch     # vitest in watch mode
yarn check          # typecheck + lint + test (run before committing)
```

Unit tests cover the pure logic — distance/format helpers, stats, the GeoJSON + Suunto parsers and the demo generator. Lint is `eslint-config-next`.
