# CLAUDE.md — agent maintenance guide

Operating manual for AI agents maintaining **Route Flyover Studio**
(`activies-flyover-studio`): a browser-only app that turns a GPS activity file
(GPX / GeoJSON / KML / FIT / Suunto DeviceLog JSON) into a cinematic 9:16 flyover
video on a MapLibre map. Next.js (App Router) + TypeScript + React 19. No backend.

## Commands (Yarn only)

```
yarn install        # Yarn 1 via Corepack — NEVER use npm here
yarn dev            # dev server
yarn build          # production build
yarn typecheck      # tsc --noEmit
yarn lint           # next lint
yarn test           # vitest (unit tests in src/lib/__tests__)
yarn check          # tsc + next lint + vitest — the gate; run before finishing
```

**Definition of done for any change: `yarn check` passes.** Keep the test suite
green; add/adjust tests when you touch pure logic (`src/lib/**`).

## Golden rules

- **Yarn only.** Commit `yarn.lock`. Never create `package-lock.json`; never run
  `npm install` in this repo. (`packageManager` pins yarn@1.)
- **No formatter.** Prettier was intentionally removed — do not reintroduce one.
- **Agent-maintained.** No Husky/pre-commit; CI (`.github/workflows/ci.yml`) runs
  `yarn check` on push/PR — don't break it.
- **Edit in place**; match the existing style. Keep changes minimal and scoped.
- **Do NOT upgrade these without running the app + a real build/preview** (they
  are breaking and can't be validated by `yarn check` alone):
  `maplibre-gl` (needs code changes — leave at v4), `next`, `typescript`,
  `eslint`, `eslint-config-next`, `fit-file-parser`, `vitest` (v5 needs a `vite`
  peer — stay on v3). Everything else is already latest-within-major.
- **Removed features — do not reintroduce** unless explicitly asked: shareable
  link, WebM export, manual activity-hour picker. Export is **MP4 + PNG** only.
- **Client-only.** `RouteFlyoverStudio` is loaded `dynamic(..., { ssr:false })`.
  All map/canvas/WebCodecs/File code must stay out of SSR.

## Architecture

React owns the user-editable `Settings` (single source of truth) and pushes them
into the imperative `FlyoverEngine` via `updateSettings()`. The engine owns the
MapLibre map, the export `<canvas>`, the chase-camera animation, timing and
export, and pushes read-only `DisplayState` back to React through callbacks
(`onDisplay`, `onAdoptMeta`, `onThemeApplied`, `onAccentApplied`). This keeps the
render loop off React's critical path while inputs stay declarative.

Rendering: a fixed 1080×1920 canvas composites the MapLibre WebGL canvas
(`preserveDrawingBuffer:true`) via `drawImage`, then paints the HUD on top.
MP4 = WebCodecs `VideoEncoder` per frame (WebM `MediaRecorder` fallback);
PNG = `canvas.toBlob`.

## Directory map

```
src/app/            layout.tsx (pre-paint theme script), page.tsx, globals.css, icon.svg
src/components/     RouteFlyoverStudio (shell), Sidebar, HeaderMenu (lang/theme/accent),
                    Stage, Transport, StudioClient (ssr:false loader), icons
src/hooks/          useFlyover.ts — wires React <-> engine, holds appliedTheme/appliedAccent
src/lib/engine/     FlyoverEngine.ts (imperative core), hud.ts (canvas HUD)
src/lib/parsers/    gpx / kml / geojson (+ Suunto) / fit + index dispatcher
src/lib/export/     recorder.ts (MediaRecorder), mp4.ts (WebCodecs + mp4-muxer)
src/lib/            stats, geo, demo, format, urlState, constants, types, i18n, weather
src/lib/__tests__/  vitest unit tests (pure logic)
```

## Domain knowledge & gotchas (learned the hard way)

- **Theme/accent sync.** The chrome must change *with* the map, not before it.
  The engine applies the map style/colors then fires `onThemeApplied` /
  `onAccentApplied` from its `idle`; React's `appliedTheme`/`appliedAccent` (in
  `useFlyover`) drive `data-theme` and `--accent`. Compositing is deferred to the
  map's `idle` so base tiles + route + HUD update in one frame.
- **No first-paint flash.** `layout.tsx` has an inline pre-paint script that sets
  `data-theme` + `--accent` from the URL before render. If you change the
  load-time accent rule, mirror it in BOTH that script and `useFlyover`'s
  initializer, or the two disagree and it flickers. Default accent is
  theme-dependent: green on dark, **orange on light** (green-on-light has poor
  contrast). `<html>`/`<body>` carry `suppressHydrationWarning` because the
  script mutates them — keep it.
- **Fly-in camera.** Intro/outro blend overview <-> chase. Rotate the fly-in
  toward ONE fixed heading (`bearing(pos(0), pos(0.12))`), not the moving
  `headingAt(p)`, or `lerpAngle` flips rotation direction mid-turn. Keep the
  hand-offs continuous at p=0.12 / p=0.9.
- **MapLibre theme swap** uses `setStyle(..., { transformStyle })` to carry the
  route sources/layers across the reload (else the trail vanishes).
- **Suunto DeviceLog** stores lat/lon in **radians** (×180/π) and HR in **Hz**
  (×60 → bpm); HR lives in separate samples merged by nearest timestamp. Lives in
  `parsers/geojson.ts` (`parseSuunto`, dispatched when `j.DeviceLog` exists).
- **Demo route** (`lib/demo.ts`) is real OSM road geometry generated with OSRM
  (`router.project-osrm.org`), decoded from its polyline. To change it, route new
  waypoints through OSRM and embed the decoded coords — don't hand-draw a circle.
- **Weather** = Open-Meteo (keyless), fetched engine-side, keyed/guarded; optional
  overlay. HUD text (incl. weather) is localized via `i18n` `tr(lang)`.
- **i18n.** PT-BR default + EN-US. UI and burned-in HUD/export text both localize.
  Add new strings to the `Dict` interface and both `pt`/`en` in `lib/i18n.ts`.
- **ESLint flat config** here does not define `@typescript-eslint/no-explicit-any`
  — do not add `eslint-disable` for it (the directive itself errors).
- `urlState` reads ONLY `theme`, `accent`, `lang` from the URL. All other settings
  use `DEFAULT_SETTINGS` on load — don't re-add URL persistence for them.

## Sandbox note

In this cloud sandbox, yarn's default registry is blocked; use
`YARN_REGISTRY=https://registry.npmjs.org corepack yarn ...`. On a normal machine
plain `yarn` works. The npm optional-dep/rollup quirk here does not occur locally.
