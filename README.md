# Harz Routenplaner

Free hiking route planner for the Harz: set waypoints on the map, compare 2–3 route alternatives with elevation
profile and walking time, see the Harzer Wandernadel stamp points, and export the route as GPX for Komoot.
No login, no tracking.

- Live (planned): https://routing.pixelcenter.de
- Specification: [CONCEPT.md](CONCEPT.md) · Rules for agents: [CLAUDE.md](CLAUDE.md) · Changes: [CHANGELOG.md](CHANGELOG.md)
- Status: milestones M0–M3 (map, DE/EN, stamp points, waypoints, routing, elevation profile and walking time). See CONCEPT.md §7.

## Run locally with Docker (recommended)

Requirements: Docker with Compose v2, ~1 GB free RAM, ~300 MB disk for the routing data.

```sh
git clone https://github.com/mathias-bloodmoon/harz-routenplaner.git
cd harz-routenplaner
scripts/brouter/download-segments.sh          # once: OSM routing data for the Harz → data/segments/
docker compose -f infra/docker-compose.yml up --build
```

Details (services, BRouter profiles, smoke test): [infra/README.md](infra/README.md).

Open http://localhost. **Success looks like:** a topographic map of the Harz with the hiking trail overlay, the
attribution "© OpenStreetMap … OpenTopoMap … Waymarked Trails" at the bottom right, and a side panel on the left
with a DE/EN button. `curl http://localhost/api/health` prints `{"status":"ok"}`. Clicking the map adds waypoints
A, B, C …; they are kept in the browser (localStorage) across reloads. With two or more waypoints, **Routen
berechnen** draws 2–3 alternatives; click a card or a line to select one.

**Stamp points:** the stamp layer needs `data/stamps.geojson`, which you generate yourself (it is not in the repo
for licence reasons): see [data/README.md](data/README.md). Without it the app works, just without stamps.

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
apps/api/      backend: Fastify – GET /api/health, POST /api/route (BRouter proxy)
scripts/       stamp data converter (scripts/stamps), BRouter segments/fixtures/smoke test (scripts/brouter)
data/          generated stamps.geojson (not committed), README
infra/         docker-compose.yml (local stack), brouter/ (image + profiles), README; production setup in M5
.github/       CI: lint, typecheck, unit tests, build, Docker Compose stack + Playwright E2E
```

Configuration is done with environment variables, see [.env.example](.env.example).

| Variable          | Default                                                  | Effect                                                                                                                                                           |
| ----------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `STAMPS_ENABLED`  | `true` locally (compose, Vite), `false` in the web image | Stamp layer on/off. Served to the browser as `/config.json`; when `false`, `/data/stamps.geojson` returns 404. Production: only `true` after written permission. |
| `STAMPS_DATA_DIR` | `../data`                                                | Folder with `stamps.geojson`, mounted read-only into the web container                                                                                           |
| `WEB_PORT`        | `80`                                                     | Local port of the stack                                                                                                                                          |

## How the planner works (M1)

- Waypoints: click the map (adds at the end), or click a stamp point → "Als Wegpunkt hinzufügen" (uses the stamp's
  name). Drag markers to move them; reorder (↑ ↓), delete (×), "Umkehren", "Alle löschen" in the panel.
- Limits: 2–25 waypoints; only inside the planning area (Harz + ~40 km: lat 51.13–52.31, lon 9.64–12.20,
  `apps/web/src/plan/area.ts`). Outside → message, nothing is added.
- Stamp layer: clustered at low zoom, popup with number, name, booklets and link; filter by booklet; layer toggle.
- Routing (M2): `POST /api/route` with `{"waypoints":[{"lat":…,"lng":…},…]}`. 2 waypoints → BRouter
  alternatives 0–2 (profile `harz-trails`); 3+ waypoints → one route each with `harz-shortest` ("Kürzeste"),
  `harz-trails` ("Wanderwege"), `harz-gentle` ("Sanft"). Routes overlapping > 90 % with an earlier one (both ways,
  25 m tolerance) are dropped; the UI then says "Nur 2 unterschiedliche Routen gefunden". Errors:
  `too-few-waypoints`, `too-many-waypoints`, `outside-area` (400), `no-route` (422), `rate-limited` (429),
  `routing-unavailable` (503).
- Details (M3) of the selected route: walking time after **DIN 33466** (main value) and distance ÷ speed
  (secondary), length, ascent/descent, lowest/highest point, elevation chart (uPlot) with stamp points, stamp
  points within 100 m listed with their position. Hovering the chart shows the point on the map and vice versa
  (mouse). Speed input (km/h, default 4.0, 1–10) is stored with the plan.
  - Ascent/descent are computed in the browser from the route's elevations with a **5 m hysteresis**
    (`details/elevation.ts`): changes count only once the elevation moved 5 m from the last turning point; the
    remainder to the end is added, so ascent − descent = net change. Cards and details use the same values.
  - DIN 33466 (`details/walkingTime.ts`): horizontal = distance ÷ speed; vertical = ascent ÷ 300 m/h + descent ÷
    500 m/h; total = larger + half of the smaller. Example: 12 km, 600 m up and down, 4 km/h → 4 h 42 min.
- Pure, unit-tested logic: `apps/web/src/details/` (walking time, elevation, stamps along the route), `apps/web/src/plan/` (waypoints, area check, stored state), `apps/web/src/stamps/data.ts`
  (parsing, booklet filter), `scripts/stamps/` (converter).

## Technical decisions

- **Stamp popup with button** instead of "click = waypoint": a click on a stamp opens its details; "Als Wegpunkt
  hinzufügen" adds it. That way you can look at a stamp without changing the plan.
- **Leaflet** (not MapLibre) for the map: the base map and trail overlay are raster tiles, Leaflet is smaller and
  has mature marker dragging and clustering, which M1 needs.
- The web container is `nginx-unprivileged` (64 MB limit), serves the static build and proxies `/api/` to the api
  container. It writes no access log (privacy).

## Data and licences

Map data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors (ODbL), SRTM; map style ©
[OpenTopoMap](https://opentopomap.org) (CC-BY-SA); hiking trails © [Waymarked Trails](https://waymarkedtrails.org).
Code licence: [MIT](LICENSE).
