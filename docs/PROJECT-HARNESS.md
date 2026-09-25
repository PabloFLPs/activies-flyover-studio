# Route Flyover Studio — Project Harness

The living reference for the project: the vision, what shipped, and how the pieces
fit — so anyone (or any agent) can reconstruct intent without reading the whole tree.
Setup/run lives in `../README.md`; the *why* behind choices lives in `DECISIONS.md`;
the feature→file index lives in `FILE-MAP.md`; the agent operating manual is
`../CLAUDE.md`.

Status tags: ✅ built · 🔜 deferred · ❌ not in this build.

---

## 1 — Vision

Turn a GPS activity file into a cinematic **9:16 flyover video**, entirely in the
browser. Drop a run/ride, watch the camera chase the route over a MapLibre map with a
live stats HUD, and export it for social. No backend, no upload — everything runs
client-side.

## 2 — What it does (shipped)

- ✅ **Import** GPX, GeoJSON, KML, FIT, and Suunto **DeviceLog** JSON (radians). Parser
  dispatches by extension with a content-sniff fallback.
- ✅ **Map flyover** on MapLibre (OpenFreeMap tiles): overview → fly-in → chase camera
  that follows the route, with a growing trail and a head/tracker marker.
- ✅ **HUD** composited onto a fixed 1080×1920 canvas: sport badge + icon, name, date &
  location, distance / time / pace, max speed, elevation gain + chart, heart rate,
  calories, route mini-map, and an optional **weather** chip.
- ✅ **Weather** for the activity's place/date/hour from Open-Meteo (keyless).
- ✅ **Themes** (dark/light) that retint the whole app *and* the map/video together;
  **accent** presets; **language** (PT-BR default, EN-US) — all in a header menu.
- ✅ **Export**: MP4 (WebCodecs H.264, WebM fallback) or a PNG still.
- ✅ **Demo activity**: a real ~9.7 km Belo Horizonte street loop (OSRM/OSM).
- ✅ Camera **tilt** + intro/outro **fly-in**; adjustable **video length**.

## 3 — Architecture (one screen)

React owns the user-editable `Settings` and pushes them into the imperative
`FlyoverEngine`; the engine owns the map, the export canvas, the chase-camera
animation, timing, weather and export, and pushes read-only `DisplayState` back
through callbacks. The engine renders every frame by compositing the MapLibre WebGL
canvas (`preserveDrawingBuffer`) via `drawImage`, then painting the HUD on top. See
`DECISIONS.md` ADR-0001/0002/0005 for the split, the client-only constraint, and the
theme-sync mechanism; `FILE-MAP.md` for where each feature lives.

## 4 — Deliberately not in this build

- ❌ Shareable-link setup (removed — ADR-0007).
- ❌ WebM as a user-visible format (internal fallback only — ADR-0007).
- ❌ Manual activity-hour override (removed — ADR-0007).
- ❌ Accounts, cloud storage, server rendering — the app is fully client-side.
- 🔜 Exact surveyed demo routes — the demo is an OSRM approximation; a real GPX can be
  wired in verbatim.

## 5 — Maintenance

Agent-maintained, Yarn-only, no formatter; every change must pass `yarn check`
(typecheck + lint + tests). Held major upgrades and the reasons are in `DECISIONS.md`
(ADR-0012). The full operating manual — commands, guardrails, gotchas — is `../CLAUDE.md`.
