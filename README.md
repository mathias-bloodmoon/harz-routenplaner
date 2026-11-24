# Harz Routenplaner

Free hiking route planner for the Harz: set waypoints on the map, compare 2–3 route alternatives with elevation
profile and walking time, see the Harzer Wandernadel stamp points, and export the route as GPX for Komoot.
No login, no tracking.

- Live (planned): https://routing.pixelcenter.de
- Specification: [CONCEPT.md](CONCEPT.md) · Rules for agents: [CLAUDE.md](CLAUDE.md) · Changes: [CHANGELOG.md](CHANGELOG.md)
- Status: milestone M0 (skeleton, Harz map, DE/EN). See the milestones in CONCEPT.md §7.

## Run locally with Docker (recommended)

Requirements: Docker with Compose v2.

```sh
git clone https://github.com/mathias-bloodmoon/harz-routenplaner.git
cd harz-routenplaner
docker compose -f infra/docker-compose.yml up --build
```

Open http://localhost. **Success looks like:** a topographic map of the Harz with the hiking trail overlay, the
attribution "© OpenStreetMap … OpenTopoMap … Waymarked Trails" at the bottom right, and a side panel on the left
with a DE/EN button. `curl http://localhost/api/health` prints `{"status":"ok"}`.

Port 80 taken? `WEB_PORT=8080 docker compose -f infra/docker-compose.yml up --build` → http://localhost:8080.
Stop with `Ctrl+C`, clean up with `docker compose -f infra/docker-compose.yml down`.

## Develop without Docker

Requirements: Node.js 22 LTS and pnpm (`corepack enable` once; the pnpm version is pinned in `package.json`).

```sh
pnpm install
pnpm dev            # web on http://localhost:5173 (proxies /api to :3000), api on http://localhost:3000
```

| Command          | What it does                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| `pnpm lint`      | ESLint + Prettier check (`pnpm format` fixes formatting)                                          |
| `pnpm typecheck` | TypeScript strict check of all packages                                                           |
| `pnpm test`      | Unit tests (Vitest)                                                                               |
| `pnpm build`     | Production builds (`apps/web/dist`, `apps/api/dist`)                                              |
| `pnpm e2e`       | Playwright E2E tests; needs `pnpm --filter web exec playwright install --with-deps chromium` once |

E2E tests build the web app and run it with `vite preview`. To test a running stack instead:
`E2E_BASE_URL=http://localhost pnpm e2e`. Map tiles are stubbed in tests (fair use of the tile servers); set
`E2E_REAL_TILES=1` to load real tiles. PR screenshots: `SCREENSHOTS=1 E2E_REAL_TILES=1 pnpm e2e --grep screenshot`
→ `apps/web/screenshots/`.

## Repository layout

```
apps/web/      frontend: Vite + TypeScript, Leaflet; texts in src/i18n/de.json and en.json
apps/api/      backend: Fastify (GET /api/health; routing follows in M2)
infra/         docker-compose.yml (local stack); production setup follows in M5
.github/       CI: lint, typecheck, unit tests, build, Docker Compose stack + Playwright E2E
```

Configuration is done with environment variables, see [.env.example](.env.example).

## Technical decisions

- **Leaflet** (not MapLibre) for the map: the base map and trail overlay are raster tiles, Leaflet is smaller and
  has mature marker dragging and clustering, which M1 needs.
- The web container is `nginx-unprivileged` (64 MB limit), serves the static build and proxies `/api/` to the api
  container. It writes no access log (privacy).

## Data and licences

Map data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors (ODbL), SRTM; map style ©
[OpenTopoMap](https://opentopomap.org) (CC-BY-SA); hiking trails © [Waymarked Trails](https://waymarkedtrails.org).
Code licence: [MIT](LICENSE).
