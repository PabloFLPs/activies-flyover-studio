# File map — feature → where it lives

A lookup table so a change goes straight to the right file. Keep it short; update
it when a feature moves.

## App shell / boot
- Root layout, fonts, **pre-paint theme+accent script**, hydration-warning suppression — `src/app/layout.tsx`
- Global CSS, theme tokens (`--accent`, `--app-bg`…), light/dark, sidebar width, stage shadow — `src/app/globals.css`
- Page (renders the client studio) — `src/app/page.tsx`
- Client-only entry (`dynamic(..., { ssr:false })` + loading cover) — `src/components/StudioClient.tsx`
- Favicon — `src/app/icon.svg`
- Link-share preview (Open Graph/Twitter image) — `src/app/opengraph-image.png` (auto-wired by Next's file convention); tags + `metadataBase` in `layout.tsx`

## UI (React chrome)
- App shell: header, logo, map-ready loading cover, sidebar+stage layout — `src/components/RouteFlyoverStudio.tsx`
- Sidebar: file drop/demo, identity, camera, overlays, video length, export format — `src/components/Sidebar.tsx`
- Header menu popover: language · theme · accent — `src/components/HeaderMenu.tsx`
- Stage (map div + export canvas) — `src/components/Stage.tsx`
- Transport: play/restart/scrub + export (MP4/PNG dispatch) — `src/components/Transport.tsx`
- Themed dropdown (custom <select> replacement) — `src/components/Select.tsx`
- SVG icons — `src/components/icons.tsx`
- React ↔ engine wiring, `appliedTheme`/`appliedAccent`, actions — `src/hooks/useFlyover.ts`

## Engine (imperative core)
- MapLibre map, chase camera, animation, timing, theme/accent swap, weather fetch, MP4/PNG export — `src/lib/engine/FlyoverEngine.ts`
- Canvas HUD renderer (badge+sport icon, stats, elevation chart, mini-map, weather chip, empty state, progress) — `src/lib/engine/hud.ts`

## Parsers (dispatch by extension, content sniff fallback)
- Dispatcher — `src/lib/parsers/index.ts`
- GPX / KML — `src/lib/parsers/gpx.ts` · `kml.ts`
- GeoJSON **and Suunto DeviceLog** (radians) — `src/lib/parsers/geojson.ts`
- FIT — `src/lib/parsers/fit.ts`
- Sport guess helper — `src/lib/parsers/shared.ts`

## Export
- MediaRecorder helpers (video fallback, mime, download) — `src/lib/export/recorder.ts`
- WebCodecs H.264 + mp4-muxer — `src/lib/export/mp4.ts`

## Data / domain
- Types (Settings, Overlays, Stats, Theme, Lang…) — `src/lib/types.ts`
- Constants + `DEFAULT_SETTINGS`, map styles, accent presets, theme-default accent — `src/lib/constants.ts`
- Track stats (distance, gain, speed, elevation fill) — `src/lib/stats.ts`
- Geo helpers (haversine, bearing, lerp, easing) — `src/lib/geo.ts`
- Demo activity (real OSRM road geometry, Belo Horizonte) — `src/lib/demo.ts`
- Formatting (clock, pace, km) — `src/lib/format.ts`
- Load-time URL settings (theme/accent/lang only) — `src/lib/urlState.ts`
- i18n (PT-BR default + EN-US; UI + HUD strings) — `src/lib/i18n.ts`
- Weather (Open-Meteo, keyless; forecast model for recent dates) — `src/lib/weather.ts`
- Reverse geocode for the start address (BigDataCloud, keyless) — `src/lib/geocode.ts`
- Weather condition list for the manual override — `WEATHER_CONDITIONS` in `src/lib/weather.ts`

## Tests / tooling
- Unit tests (pure logic) — `src/lib/__tests__/*.test.ts`
- Vitest config — `vitest.config.ts`
- CI (`yarn check`) — `.github/workflows/ci.yml`
- Agent guides — `CLAUDE.md`, `AGENTS.md`, this `docs/` folder
