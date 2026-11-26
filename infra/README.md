# Infrastructure

Everything needed to run the Harz Routenplaner with Docker: the local stack (`docker-compose.yml`) and production
on Hetzner `nsc-demo` (`docker-compose.prod.yml`, `routing.caddy`, GitHub Actions) – see "Production" below.

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

## Production (https://routing.pixelcenter.de)

The app runs on Hetzner `nsc-demo` (CAX11, Arm64, 4 GB) **next to the NSC portal demo**. Hard rules: never touch
`/opt/nsc-portal` or the NSC containers, publish no ports, stack ≤ 1 GB, validate the Caddy file before every reload.

```
Internet ─443─▶ Caddy (NSC stack, container nsc-portal-caddy-1)
                  └─ /etc/caddy/sites/routing.caddy  (= /opt/caddy-sites/routing.caddy)
                       └─ reverse_proxy harz-routenplaner-web:8080   (Docker network "edge")
                            harz-web ─▶ harz-api ─▶ brouter        (internal network of this stack)
```

### Files on the server (`/opt/harz-routenplaner`, owner `nsc`)

| File                  | Source                                                       | Note                                                                                                                                            |
| --------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `docker-compose.yml`  | `infra/docker-compose.prod.yml`                              | copied by every deploy                                                                                                                          |
| `routing.caddy`       | `infra/routing.caddy`                                        | copied to `/opt/caddy-sites/routing.caddy` after validation                                                                                     |
| `.env`                | created once from `infra/env.production.example`             | **edited on the server**, never overwritten (except `HARZ_TAG`, `HARZ_TAG_PREVIOUS` and – if the repository variable is set – `STAMPS_ENABLED`) |
| `data/segments/*.rd5` | `download-segments.sh`                                       | downloaded on the first deploy (~300 MB)                                                                                                        |
| `data/stamps.geojson` | built once by the deploy workflow when the stamp layer is on | never in git or an image                                                                                                                        |
| `auth/htpasswd`       | written by every deploy from the secret `SITE_BASIC_AUTH`    | apr1 hash only, never the password; mounted read-only into `harz-web`                                                                           |

### Deploy (automatic)

Every push to `main` runs `.github/workflows/deploy.yml`:

1. **preflight** (`preflight.yml`, read-only): `/opt/caddy-sites`, network `edge`, Caddy imports the sites folder,
   folders writable, `docker compose --wait`, curl; prints memory/disk and whether Caddy writes access logs.
2. **images**: `harz-web`, `harz-api`, `harz-brouter` for `linux/amd64` + `linux/arm64` →
   `ghcr.io/mathias-bloodmoon/<name>:<commit sha>` and `:latest`.
3. **deploy** over SSH as `nsc`: copies the files above, runs `remote-deploy.sh <sha> <caddy container>`: sets
   `HARZ_TAG`, downloads segments if missing, `docker compose pull` (with a ghcr token valid for this run only),
   `up -d --wait`, then **`caddy validate`** with the new `routing.caddy` – on error the old file is restored and Caddy
   is **not** reloaded – then `caddy reload`, then `docker stats`.
4. **smoke**: HTTPS, `/api/health`, legal pages, `scripts/brouter/smoke-test.sh https://routing.pixelcenter.de`,
   Playwright `@production` (map, real route, GPX download).

Secrets (Settings → Secrets and variables → Actions): `DEPLOY_SSH_KEY`, `DEPLOY_HOST`, `DEPLOY_USER`,
`DEPLOY_KNOWN_HOSTS`, `CADDY_CONTAINER`, `SITE_BASIC_AUTH`. Repository **variable** `STAMPS_ENABLED` (`true`/`false`) switches the stamp
layer on the next deploy. Server preparation (once): `docs/harz-m5-server.md` in the FlashBot repo, summarised:
user `nsc` in group `docker`, `/opt/harz-routenplaner` and an empty `/opt/caddy-sites/routing.caddy` owned by `nsc`.

Manual run: GitHub → Actions → "Build and deploy" → Run workflow.

### Password protection

The site is not public: `harz-web` (nginx) asks for a user and password on every path except `/healthz` (Docker
health check) and sends `X-Robots-Tag: noindex`. Caddy and the NSC stack are not involved.

- User and password: GitHub secret **`SITE_BASIC_AUTH`** in the form `user:password`. The deploy hashes it (apr1) on
  the runner and writes only the hash to `auth/htpasswd` on the server.
- **Change the password:** set a new value for the secret, then GitHub → Actions → "Build and deploy" → Run workflow.
- Fail closed: with `BASIC_AUTH=true` (default in production) and no `auth/htpasswd` the container does not start
  and the deploy fails – the site never becomes public by accident. `BASIC_AUTH=false` in `.env` makes it public.
- Locally and in CI the protection is off (`BASIC_AUTH` unset); CI checks the protected variant separately.

**Success looks like:** `curl -s -o /dev/null -w '%{http_code}' https://routing.pixelcenter.de/` prints `401`.

### Change settings (Impressum address, stamp layer)

```sh
ssh nsc@nsc-demo
cd /opt/harz-routenplaner
nano .env                      # e.g. OPERATOR_ADDRESS=Musterweg 1|37120 Bovenden
docker compose up -d           # recreates only the changed containers
```

**Success looks like:** `curl -s https://routing.pixelcenter.de/config.json` shows the new values.

### Update the routing data (weekly OSM extract)

```sh
cd /opt/harz-routenplaner && sh download-segments.sh data/segments && docker compose restart brouter
```

### Rollback

Every deploy records the previous image tag in `.env` as `HARZ_TAG_PREVIOUS`.

```sh
cd /opt/harz-routenplaner
grep HARZ_TAG .env                                   # current and previous tag
sed -i "s/^HARZ_TAG=.*/HARZ_TAG=<previous sha>/" .env
docker compose up -d --wait
```

Old images stay on the server until `docker image prune`. If an image is no longer there, pull it after
`docker login ghcr.io` (GitHub token with `read:packages`), or re-run the deploy workflow for that commit.

### Caddy: validate and reload by hand

```sh
docker exec nsc-portal-caddy-1 caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
docker exec nsc-portal-caddy-1 caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
```

Only reload after a successful validate – a broken file takes the NSC demo offline. To take the planner offline
without touching anything else: `: > /opt/caddy-sites/routing.caddy`, validate, reload, `docker compose down`.

### Check

```sh
docker compose ps                                    # all healthy
docker stats --no-stream $(docker compose ps -q)     # together < 1 GB
```
