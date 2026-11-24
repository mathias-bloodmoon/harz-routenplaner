# CLAUDE.md – Harz Routenplaner

Entry point for every agent working on this repository (FlashBot and its sub-agents). **Read before any work.**

## What this is

A free, public, no-login hiking route planner for the Harz at https://routing.pixelcenter.de. Owner: Mathias Nagel.
The full specification is [CONCEPT.md](CONCEPT.md). Build exactly that; anything listed under "Later" is out of scope.

## Stack (decided)

- Frontend: Vite + TypeScript (strict), MapLibre GL JS or Leaflet (raster tiles), uPlot for the elevation chart.
  No heavy framework unless the UI clearly needs one (then Svelte; ask Mathias first).
- Backend: Node.js LTS + Fastify, TypeScript (strict). Stateless, no database.
- Routing: BRouter (self-hosted, Docker), hiking profiles in `infra/brouter/profiles/`.
- Tests: Vitest (unit), Playwright (E2E for the main flow). Package manager: pnpm workspaces.
- Infra: Docker Compose, images for linux/arm64 **and** linux/amd64, GitHub Actions, ghcr.io.

## Conventions

- **Language:** code, comments, docs, commit messages and PRs in **English**. UI texts in German and English via
  translation files (`apps/web/src/i18n/de.json`, `en.json`); no hard-coded UI strings. German UI uses "du".
- **Pure logic in pure modules** with unit tests: GPX builder, DIN 33466 walking time, ascent smoothing,
  route de-duplication, bounding-box check. No DOM access in these modules.
- **Accessibility:** WCAG 2.2 AA where possible (keyboard use of panel and buttons, visible focus, contrast,
  touch targets ≥ 44 px on phones). The map itself is exempt; everything else is not.
- **Privacy:** no cookies, no tracking, no third-party scripts except map tiles. Never log full routes with IPs.
- **No secrets in the repo.** Configuration via environment variables; keep `.env.example` current.
- **Don't guess unknowns:** mark them in docs with `> ⚠️ OFFEN:` and report them to Mathias.
- Attribution for OSM, OpenTopoMap, Waymarked Trails and the Harzer Wandernadel must always be visible.

## Shared server – hard rules

The app runs on Hetzner `nsc-demo` (CAX11, Arm64, 4 GB RAM) next to the NSC portal demo of the Northeimer Segelclub.

- Never touch `/opt/nsc-portal` or the NSC containers. Never publish ports 80/443 from this stack.
- Join the Docker network `edge` as `external: true`; expose the site only via `/opt/caddy-sites/routing.caddy`.
- Validate the Caddy file before every reload (command in `infra/README.md`); a broken file can take the NSC demo offline.
- Memory limits in compose are mandatory; whole stack ≤ 1 GB.
- Deployment (M5) depends on NSC package 1.7e (Caddy hook + `edge` network). Check that `/opt/caddy-sites` exists and
  `docker network ls` shows `edge` before deploying; if not, stop and tell Mathias.
- Stamp layer in production only with `STAMPS_ENABLED=true`, which Mathias sets once the Harzer Wandernadel office has
  agreed in writing.

## Way of working

- Work milestone by milestone (M0 → M5 in CONCEPT.md §7). One branch per milestone (`m1-stamps-waypoints`, …),
  one PR per milestone. **No direct pushes to `main`.** Mathias reviews and merges.
- Keep PRs reviewable: if a milestone grows beyond ~1,500 changed lines, split it into sub-PRs.
- Ask Mathias (Telegram) before changing scope, stack, licences or anything on the server outside this app.

### Definition of done (every milestone)

- [ ] "Done when" criteria of the milestone in CONCEPT.md §7 met and covered by automated tests where possible
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` green in CI; Playwright E2E green for UI changes
- [ ] Runs locally with `docker compose -f infra/docker-compose.yml up` (documented in README)
- [ ] Screenshots (1280 px and 390 px wide) or a short GIF in the PR
- [ ] README / infra docs updated in the same PR (new variable, container or command = docs)
- [ ] `CHANGELOG.md` entry

## Documentation standard

Someone new, with their own AI, must be able to run, change and operate the app from this repo alone:
step-by-step instructions, copy-paste commands, "this is what success looks like".
