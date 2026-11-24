# Infrastructure

Everything needed to run the Harz Routenplaner with Docker. Production deployment (Hetzner `nsc-demo`, Caddy,
GitHub Actions) follows with milestone M5.

## Services (`infra/docker-compose.yml`)

| Service    | Image                                                       | Memory limit        | Purpose                                                                         |
| ---------- | ----------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------- |
| `harz-web` | `apps/web/Dockerfile` (nginx-unprivileged)                  | 64 MB               | static frontend, `/config.json`, `/data/stamps.geojson`, proxies `/api/`        |
| `harz-api` | `apps/api/Dockerfile` (Node 22)                             | 256 MB              | `POST /api/route`: validation, BRouter calls, de-duplication, rate limit, cache |
| `brouter`  | `infra/brouter/Dockerfile` (BRouter 1.7.10, Temurin 21 JRE) | 512 MB (`-Xmx300m`) | routing engine with the three Harz hiking profiles                              |

Total ≤ 832 MB (budget: 1 GB, CONCEPT.md §5).

## First start (about 5 minutes)

```sh
scripts/brouter/download-segments.sh                 # ~300 MB of OSM routing data → data/segments/
docker compose -f infra/docker-compose.yml up --build
```

**Success looks like:** `docker compose -f infra/docker-compose.yml ps` shows all three services `healthy`, and

```sh
scripts/brouter/smoke-test.sh http://localhost
```

prints

```
OK   Torfhaus → Brocken: HTTP 200, 3 routes ['alternative', 'alternative', 'alternative'] [10.2, 10.9, 10.0] km
OK   Bad Harzburg → Eckertalsperre → Torfhaus: HTTP 200, 3 routes ['shortest', 'trails', 'gentle'] [13.0, 16.3, 14.6] km
OK   Outside the area (Berlin): HTTP 400 outside-area
```

(The kilometres change slightly when the OSM data changes.)

## BRouter

- **Segments** (`*.rd5`): `E5_N50` and `E10_N50` cover the planning area (Harz + ~40 km). brouter.de rebuilds them
  weekly from OpenStreetMap; to update, run `scripts/brouter/download-segments.sh` again and
  `docker compose -f infra/docker-compose.yml restart brouter`. They are mounted read-only (`SEGMENTS_DIR`), not
  part of the image.
- **Profiles** (`infra/brouter/profiles/make-profiles.sh`): generated at image build time from BRouter's stock
  `hiking-mountain.brf`, by changing a few parameters. Foot access tags (`foot=no`, `access=no` …, e.g. closures in
  the Nationalpark Harz) are respected by all of them.

  | Profile         | Used for                                        | Changes to `hiking-mountain.brf`                                                                                                           |
  | --------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
  | `harz-trails`   | 2 waypoints (alternatives 0–2) and "Wanderwege" | `hiking_routes_preference 1.0`, `path_preference 10.0`                                                                                     |
  | `harz-shortest` | "Kürzeste"                                      | `shortest_way 1`, `hiking_routes_preference 0.0`                                                                                           |
  | `harz-gentle`   | "Sanft"                                         | `consider_elevation true`, uphill cost 15 / cutoff 1.5, downhill cost 10 / cutoff 1.5, `SAC_scale_limit 2`, `hiking_routes_preference 0.5` |

- Port 17777 is published on `127.0.0.1` only (debugging, `scripts/brouter/record-fixtures.sh`).

## api configuration

| Variable                              | Default                | Effect                                                                                 |
| ------------------------------------- | ---------------------- | -------------------------------------------------------------------------------------- |
| `BROUTER_URL`                         | `http://brouter:17777` | BRouter server                                                                         |
| `RATE_LIMIT_PER_MINUTE`               | `20`                   | route requests per IP and minute (HTTP 429 `rate-limited` above)                       |
| `CACHE_ENTRIES` / `CACHE_TTL_MINUTES` | `200` / `60`           | in-memory cache of answers                                                             |
| `TRUST_PROXY_HOPS`                    | `1`                    | reverse proxies in front of the api: 1 = nginx (local), 2 = Caddy + nginx (production) |
| `LOG_LEVEL`                           | `info`                 | no request logs at any level: IPs and routes are never logged                          |

## Test fixtures

`apps/api/test/fixtures/brouter/` holds recorded BRouter answers for the sample tours (used by the api tests);
`apps/web/e2e/fixtures/route-*.json` the matching api answers (used by the UI tests). To re-record after profile
changes, with the stack running:

```sh
BROUTER_URL=http://localhost:17777 scripts/brouter/record-fixtures.sh
pnpm --filter api exec tsx test/write-e2e-fixtures.ts
```
