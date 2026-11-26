# Changelog

All notable changes to this project. Format based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added

- Password protection (HTTP basic auth in `harz-web`, user/password from the GitHub secret `SITE_BASIC_AUTH`, only
  the hash on the server, fail closed without it), `X-Robots-Tag: noindex`; smoke test and Playwright log in.

- M5 go-live: production stack (`infra/docker-compose.prod.yml`, network `edge`, no ports, ≤ 832 MB), Caddy site
  file, deploy workflow (read-only server preflight, multi-arch images on ghcr.io, SSH deploy with Caddy
  validate-then-reload, smoke test incl. Playwright against the live site), pages Impressum, Datenschutz,
  Datenquellen (DE/EN, operator data at runtime from the server's `.env`), footer links.

- M4 GPX export: pure GPX 1.1 builder (schema-validated in tests, XML escaping), export dialog with Komoot
  instructions, download `harz-route-YYYY-MM-DD.gpx` generated in the browser with track, elevations, waypoints
  and stamp points on the route; script for the sample tours of the Komoot check.

- M3 route details: DIN 33466 walking time (main) and distance ÷ speed (secondary), length, ascent/descent with
  5 m hysteresis (also used on the cards), lowest/highest point, uPlot elevation chart with stamp points,
  chart ↔ map hover sync, stamp points within 100 m of the route, speed input (stored with the plan).

- M2b routing UI: "Routen berechnen" (enabled from 2 waypoints) with loading state, alternatives as coloured
  lines and cards (name, km, ↑ ↓), selection by card or line (others fade), "only N distinct routes" message,
  signage note, clear messages for every api error; routes are dropped when the waypoints change.

- M2a routing backend: BRouter 1.7.10 container with three generated Harz hiking profiles (shortest,
  trail-friendly, gentle) and segment download script; `POST /api/route` with validation, 2 waypoints → engine
  alternatives, 3+ → one route per profile, de-duplication (> 90 % overlap), per-IP rate limit, in-memory cache,
  no request logs. CI runs the real BRouter (cached segments) with a smoke test of the sample tours.

- M1b stamp layer: clusters, popups (number, name, booklets, link), booklet filter, layer toggle; runtime flag
  `STAMPS_ENABLED` via `/config.json` (web image default `false`); `data/` mounted read-only into the web container.
- M1b waypoints: add by map click or from a stamp popup, drag, reorder (keyboard), delete, reverse, clear; 2–25
  waypoints inside the planning area; plan stored in localStorage; status messages in a live region.

- M1a stamp data converter `scripts/stamps`: official GPX (222 stamps, pinned by SHA-256) + one-time extraction
  of the companion booklet pages → `data/stamps.geojson`. Generated locally, not committed (licence, see
  `data/README.md`).
- CI actions updated to the Node 24 versions.

- M0 setup: pnpm workspace with `apps/web` (Vite, TypeScript strict, Leaflet) and `apps/api` (Fastify,
  TypeScript strict) with `GET /api/health`.
- Harz map with OpenTopoMap base map, Waymarked Trails hiking overlay and visible attribution.
- German/English toggle (translation files, choice kept in localStorage), collapsible side panel (bottom sheet on
  phones), keyboard-usable controls with 44 px touch targets.
- `infra/docker-compose.yml` for the local stack with memory limits (web 64 MB, api 256 MB).
- CI: lint, typecheck, unit tests, build, Docker Compose stack, Playwright E2E and screenshots.
