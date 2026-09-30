# Decision log (ADRs)

The *why* behind non-obvious choices, so future-you (and agents) don't relitigate
settled calls. Newest at the top. Format: date · decision · context · consequences.
Status: `Accepted` unless noted.

---

## ADR-0016 — Opening overview is refit once the map is sized · 2026-09-29
**Accepted.** `computeOverview` runs inside `setData`, which can fire before the
MapLibre canvas has its real size; `cameraForBounds` then frames the wrong area
and the route only slides into view partway through the fly-in. The fit is now
trusted only when `mapReady`, and the first `idle` refits + re-jumps the
overview (when still at the start, not playing) so the opening frame always
contains the route. Framing padding is a FRACTION of the actual map viewport (top 8%, bottom 30%
for the HUD, sides 8%) rather than fixed px: the container is sized in CSS px
(STAGE / devicePixelRatio), so fixed px ate most of the frame on 2x displays
and zoomed the route far out. maxZoom 15.5 avoids punching in on tiny activities.


## ADR-0015 — Manual weather override in the Identity panel · 2026-09-29
**Accepted.** The Open-Meteo lookup is right most of the time but a coarse global
model occasionally misses a same-day evening forecast (verified: it invented a
6pm shower + 8°C drop for a clear, dry BH run while the prior three days were
accurate). Rather than chase the model, `Settings` gains `weatherManual` /
`weatherTempC` / `weatherCode`: when on, the engine skips the fetch and renders
the user's chosen temperature + condition (`WEATHER_CONDITIONS` picker). Auto
stays the default; the override is the escape hatch.


## ADR-0014 — Weather uses the forecast model for recent dates; archive only for old ones · 2026-09-29
**Accepted.** `fetchWeather` queries Open-Meteo's **forecast** endpoint first for any
date within ~90 days (its past window) and only falls back to the **archive**
(ERA5 reanalysis) for older dates. Context: ERA5 is coarse (~25 km) and
over-reports light "drizzle" (code 51) in humid tropical climates like BH, so
querying it first mislabelled clear runs. The forecast model's hourly
`weather_code` is accurate for recent activities. On top of that, Open-Meteo's
`weather_code` reports light drizzle (51-67) even when precipitation is 0mm, so
`fetchWeather` now also pulls `precipitation` + `cloud_cover` and demotes a wet
code to a real sky condition (`resolveCode`) whenever it's actually dry. Also: an empty Location is now
prefilled by reverse-geocoding the start coordinate (BigDataCloud, keyless) —
`lib/geocode.ts`; a user-typed location always wins.

## ADR-0013 — Project harness: agent-maintained, Yarn-only, no formatter · 2026-09-21
**Accepted.** The repo is maintained by AI agents. Package manager is **Yarn 1**
(via Corepack); `yarn.lock` is committed and `package-lock.json`/npm are banned.
**Prettier was removed** — no formatter in the loop. `CLAUDE.md`/`AGENTS.md` are the
operating manual; CI (`.github/workflows/ci.yml`) runs `yarn check` (typecheck +
lint + vitest) on push/PR. Consequence: the definition of done for any change is a
green `yarn check`.

## ADR-0012 — Hold breaking major upgrades · 2026-09-21
**Accepted.** Everything is kept at the latest **within its major**. The remaining
majors are held because they need a real build/preview to validate, which the
maintenance harness can't do headlessly: `maplibre-gl` (v4 → v6 needs code changes),
`next` 16, `typescript` 7, `eslint` 10 / `eslint-config-next` 16, `fit-file-parser`
6, and `vitest` 5 (v5 makes `vite` a required peer — stay on v3). Upgrade them in a
branch where the app runs.

## ADR-0011 — Demo activity is real OSM road geometry · 2026-09-21
**Accepted.** The demo (`lib/demo.ts`) is a ~9.7 km loop through central Belo
Horizonte generated with **OSRM** over OpenStreetMap and decoded from its polyline —
not a hand-drawn shape. Context: a synthetic circle read as fake. Elevation, HR and
pacing are synthesised (route carries position only). To change it, route new
waypoints through OSRM and embed the decoded coordinates.

## ADR-0010 — Suunto DeviceLog JSON support · 2026-09-21
**Accepted.** `.json` may be a Suunto/Movescount **DeviceLog** export: lat/lon in
**radians** (×180/π), altitude in metres, HR in a separate **Hz** stream (×60 → bpm)
merged by nearest timestamp. Handled in `parsers/geojson.ts` (`parseSuunto`,
dispatched when `j.DeviceLog` exists) so `.json`/`.geojson` share one entry point.

## ADR-0009 — Weather overlay via Open-Meteo (keyless) · 2026-09-20
**Accepted.** Optional weather overlay fetched client-side from **Open-Meteo** (no
API key) by the activity's coordinates + date + start hour; archive endpoint first,
forecast fallback. Engine-side, keyed/guarded so it only hits the network when inputs
change; fails silently (weather is optional). WMO codes → MDI icon + localized label.

## ADR-0008 — i18n: PT-BR default, EN-US option; HUD localizes too · 2026-09-20
**Accepted.** Portuguese (BR) is the default language, English selectable in the
header menu. Both the app UI **and** the burned-in HUD/export text localize via
`i18n` `tr(lang)`. Add new strings to the `Dict` interface and both `pt`/`en`.

## ADR-0007 — Export is MP4 + PNG; WebM/share/manual-hour removed · 2026-09-21
**Accepted.** User-facing export is **MP4** (WebCodecs H.264, internal WebM
`MediaRecorder` fallback) or **PNG** (single 1080×1920 frame). The shareable-link
feature, the WebM option, and the manual activity-hour picker were removed as
scope-trimming — do not reintroduce without being asked.

## ADR-0006 — Fly-in rotates toward a fixed heading · 2026-09-21
**Accepted.** The intro/outro blend overview ↔ chase. The fly-in rotates toward ONE
fixed target (`bearing(pos(0), pos(0.12))`), not the moving `headingAt(p)`. Context:
a moving target makes `lerpAngle` re-pick the shortest path each frame and flip
rotation direction mid-turn (CCW→CW). Hand-offs at p=0.12 / p=0.9 stay continuous in
center, zoom, tilt and bearing.

## ADR-0005 — Theme/accent change with the map, not before it · 2026-09-21
**Accepted.** Chrome theme/accent follow the **map's** applied value. The engine
reloads the style (MapLibre `setStyle` with `transformStyle` to carry route layers),
recolors, then fires `onThemeApplied`/`onAccentApplied` from the map's `idle`;
React's `appliedTheme`/`appliedAccent` (in `useFlyover`) drive `data-theme` and
`--accent`. Compositing is deferred to `idle` so base tiles + route + HUD update in
one frame. A **pre-paint inline script** in `layout.tsx` sets theme+accent from the
URL before first paint (no flash); the load-time accent rule is mirrored there and in
`useFlyover`. `<html>`/`<body>` carry `suppressHydrationWarning` because the script
mutates them.

## ADR-0004 — Theme-dependent default accent · 2026-09-21
**Accepted.** On load the accent defaults to the theme's readable choice — green on
dark, **orange on light** (green-on-light has poor contrast). A URL-supplied custom
accent still wins; a stale "other theme's default" is snapped to the current theme's.

## ADR-0003 — URL carries only theme/accent/lang · 2026-09-21
**Accepted.** After the share feature was removed, `urlState` reads only `theme`,
`accent`, `lang` from the URL (they drive the pre-paint default). All other settings
use `DEFAULT_SETTINGS` on load, so a stale link can't override duration, fly-in, etc.

## ADR-0002 — Client-only rendering · 2026-09-20
**Accepted.** The whole studio depends on browser-only APIs (MapLibre GL, canvas,
MediaRecorder, WebCodecs, File). It is loaded `dynamic(..., { ssr:false })`; no
map/canvas/export code runs on the server.

## ADR-0001 — React owns Settings, the engine owns everything imperative · 2026-09-20
**Accepted.** React holds the user-editable `Settings` (single source of truth) and
pushes them into `FlyoverEngine.updateSettings()`. The engine owns the map, canvas,
animation, timing and export, and pushes read-only `DisplayState` back via callbacks
(`onDisplay`, `onAdoptMeta`, `onThemeApplied`, `onAccentApplied`). Keeps the render
loop off React's critical path while inputs stay declarative.
