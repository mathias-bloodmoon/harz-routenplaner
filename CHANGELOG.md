# Changelog

All notable changes to this project. Format based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added

- M0 setup: pnpm workspace with `apps/web` (Vite, TypeScript strict, Leaflet) and `apps/api` (Fastify,
  TypeScript strict) with `GET /api/health`.
- Harz map with OpenTopoMap base map, Waymarked Trails hiking overlay and visible attribution.
- German/English toggle (translation files, choice kept in localStorage), collapsible side panel (bottom sheet on
  phones), keyboard-usable controls with 44 px touch targets.
- `infra/docker-compose.yml` for the local stack with memory limits (web 64 MB, api 256 MB).
- CI: lint, typecheck, unit tests, build, Docker Compose stack, Playwright E2E and screenshots.
