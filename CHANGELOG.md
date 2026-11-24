# Changelog

All notable changes to this project. Format based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added

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
