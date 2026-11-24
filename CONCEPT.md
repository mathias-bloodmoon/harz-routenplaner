# Harz Routenplaner – Concept (v1.0)

Status: agreed with Mathias on 2026-11-24. This file is the build specification. Live working copy (with history and
comments): Claude doc "Harz Hiking Route Planner – Concept" (https://claude.ai/artifact/NaJUv82WmFgDmNVC7Y1wLp).
If the two differ, **this file wins**; changes to scope go through Mathias.

## 1. Vision and scope

A free, public, no-login web app at **https://routing.pixelcenter.de** where anyone can click waypoints on a Harz map,
get 2–3 alternative hiking routes along real trails, compare them (distance, elevation profile, walking time) and
download the chosen one as GPX for Komoot. The Harzer Wandernadel stamp points are shown on the map so hikers can plan
stamp-collecting tours.

### MVP (v1)

- Topographic hiking map of the Harz (OpenStreetMap-based), with marked hiking trails overlay
- Harzer Wandernadel stamp points: the 222 regular stamps **and** the special stamps of the companion booklets,
  as a toggleable layer with number, name, popup and a **filter by booklet**
- Set, drag, reorder and delete waypoints by clicking the map or a stamp point
- Button "Routen berechnen" → up to 3 alternatives drawn on the map, selectable on the map and in the side panel
- Details of the selected route: length, ascent/descent, elevation profile (hover synced with the map), walking time
- GPX export of the selected route, ready for Komoot import
- UI in **German and English** (language toggle), **desktop-first**, usable on phones
- Site name: **Harz Routenplaner**

### Later (v2+, not in v1 – do not build, no dead buttons)

- Round trips ("back to start", "suggest a 10 km loop from here")
- Shareable route link (route encoded in the URL)
- Stamps on the route as a checklist; personal "collected stamps" list stored in the browser
- Parking lots, bus stops, huts/restaurants as extra layers
- Usage analytics (decision: none in v1)

## 2. User flow

One screen: map on the right, collapsible side panel on the left (bottom sheet on phones).

1. Open the site → map centred on the Harz, stamp points visible.
2. Click the map or a stamp point → waypoint added (A, B, C …). Drag to move, reorder in the panel, remove with ×.
3. Optionally set the average speed (default 4.0 km/h).
4. Press **Routen berechnen** → 2–3 alternatives appear as coloured lines; the first is pre-selected.
5. Click a line or a card → it becomes the selected route; the others fade.
6. Panel shows length, ascent/descent, walking time, elevation chart, stamp points within ~100 m of the route.
7. Press **GPX exportieren** → `harz-route-YYYY-MM-DD.gpx` downloads → import into Komoot.

No account, no server-side storage of user routes, no cookies. Planning state (waypoints, speed, language) is kept in
`localStorage`, wrapped in try/catch.

## 3. Data sources and licences

| Need | Source | Licence / limits |
| --- | --- | --- |
| Base map | OpenTopoMap raster tiles | © OpenStreetMap contributors, SRTM · OpenTopoMap (CC-BY-SA); fair-use tile policy |
| Hiking trails overlay | Waymarked Trails hiking tiles | © OpenStreetMap contributors (ODbL) |
| Routing + elevation | **BRouter, self-hosted** (hiking profiles, SRTM elevation in the output) | OSM data ODbL |
| Stamp points | Official GPX download from harzer-wandernadel.de (status 23.04.2025) | Free for private use only; **permission for public display requested** (see below) |
| Export | GPX 1.1 track | Komoot imports GPX, TCX, FIT (not KML) |

- OSM attribution must be visible on the map at all times, plus a "Datenquellen / Data sources" page.
- **Stamp data gate:** Mathias has asked the Harzer Wandernadel office for permission. Build and test with the data,
  but the stamp layer may only go live (M5) after written approval. Until then, production builds hide the layer
  behind a config flag `STAMPS_ENABLED=false`.
- Stamp data is converted once by a script into `data/stamps.geojson` (properties: `number`, `name`, `booklet`,
  `special: boolean`, `source`). No live scraping of the Wandernadel website.

## 4. Architecture

Everything runs in the browser except route calculation.

```
Browser (no login)                      Hetzner server nsc-demo (CAX11, Arm64, 4 GB)
┌──────────────────────────┐            ┌──────────────────────────────────────────┐
│ Map view (MapLibre/Leaflet)│──tiles──▶ OpenTopoMap, Waymarked Trails             │
│ Waypoint panel            │──/api/route──▶ Caddy (NSC stack, ports 80/443)        │
│ Route details + chart     │            │     └─▶ harz-api (Fastify) ─▶ BRouter    │
│ GPX builder               │──.gpx──▶ Komoot (user imports)  harz-web (static)    │
└──────────────────────────┘            └──────────────────────────────────────────┘
```

- **harz-web:** static build (Vite), served by a tiny web server container.
- **harz-api:** Node.js + Fastify. Validates input, enforces the area and waypoint limits, calls BRouter, merges and
  de-duplicates alternatives, rate-limits per IP, caches results in memory. Stateless, no database.
- **brouter:** BRouter server with segment files covering the Harz + ~40 km buffer.

### Routing rules

- Area: Harz + ~40 km buffer (reaches Northeim, Göttingen, Halberstadt). Bounding box in config; waypoints outside →
  clear error message.
- Waypoints: 2–25.
- **2 waypoints:** engine alternatives (BRouter `alternativeidx` 0–2).
- **3+ waypoints:** one route per profile: *Kürzeste / Shortest*, *Wanderwege / Trail-friendly* (prefers paths,
  avoids roads), *Sanft / Gentle* (penalises steep climbs).
- Drop alternatives whose geometry overlaps > 90 % with an earlier one; the UI then says "only 2 distinct routes found".
- Respect OSM access tags (Nationalpark Harz closures); show a short note "Bitte Beschilderung vor Ort beachten".

### Elevation and walking time

- Elevation from the BRouter output; smooth lightly (e.g. moving average or 5 m hysteresis) before summing ascent.
- **Main value: DIN 33466 walking time.** Horizontal time = distance ÷ user speed; vertical time = ascent ÷ 300 m/h +
  descent ÷ 500 m/h; total = larger + half of the smaller.
- **Secondary value:** distance ÷ speed. Both always shown.

### GPX export

- GPX 1.1, one `<trk>` with all points incl. `<ele>`, `<wpt>` for user waypoints and stamp points on the route,
  `<metadata>` with name, description (km, ↑↓, time), creator "Harz Routenplaner".
- Generated in the browser. Export dialog explains: Komoot → Profile → Saved routes → Import a file; recommend *not*
  ticking "Match route to known ways".

## 5. Hosting and deployment

- Server: Hetzner Cloud `nsc-demo`, **CAX11 (Arm64, 2 vCPU, 4 GB RAM), Ubuntu 24.04**, ufw open on 22/80/443.
  Shared with the NSC portal demo. **All images must be built for linux/arm64** (and amd64 for local dev).
- Memory budget for this app: **≤ 1 GB total** (BRouter ~512 MB, api ≤ 256 MB, web ≤ 64 MB); set compose limits.
- DNS (done, 2026-11-24): `routing.pixelcenter.de` A 2.31.158.43, AAAA 2a01:4f8:1c1c:c6f8::1.
- **Reverse proxy:** the NSC stack's Caddy owns ports 80/443. NSC package 1.7e ("Caddy: zusätzliche Seiten") adds:
  - `import /etc/caddy/sites/*.caddy` (host folder `/opt/caddy-sites`)
  - shared Docker network `edge`, created by the NSC stack
- This app therefore ships:
  - `infra/docker-compose.yml` with services `harz-web`, `harz-api`, `brouter`, joined to network `edge` (`external: true`)
  - `infra/routing.caddy` → copied to `/opt/caddy-sites/routing.caddy`, validated, then Caddy reloaded
  - Install path on the server: `/opt/harz-routenplaner`
- **Never** edit files under `/opt/nsc-portal`, never publish ports 80/443 from this stack.
- Deploy: GitHub Actions builds multi-arch images to ghcr.io; deployment runs over SSH (user `nsc`) with
  `docker compose pull && docker compose up -d`. Secrets (SSH key, host) only as GitHub Actions secrets.
- Legal: Impressum and Datenschutzerklärung pages, operator **Mathias Nagel, privately** (address to be filled in
  by Mathias; placeholder `> ⚠️ OFFEN` until then). Privacy page states: no cookies, no tracking, no stored routes,
  server logs IP addresses for rate limiting only (short retention), map tiles loaded from third-party servers.

## 6. Repository layout

```
harz-routenplaner/
  CONCEPT.md            this file
  CLAUDE.md             rules for the build agent
  README.md             human entry point
  apps/web/             frontend (Vite + TypeScript)
  apps/api/             routing proxy (Fastify)
  data/stamps.geojson   converted Wandernadel points
  scripts/              stamps converter, BRouter segment download
  infra/                docker-compose.yml, routing.caddy, deploy docs
  .github/workflows/    CI + deploy
```

## 7. Milestones

Each milestone = one branch + one PR, reviewed by Mathias.

| # | Milestone | Done when |
| --- | --- | --- |
| M0 | Setup | Repo skeleton, CI (lint, typecheck, test), app shows the Harz map with attribution, DE/EN toggle |
| M1 | Stamps and waypoints | `stamps.geojson` + layer with popups and booklet filter; waypoints add/drag/reorder/delete; state survives reload |
| M2 | Routing | BRouter + api in Docker; "Routen berechnen" returns 2–3 distinct alternatives, drawn and selectable |
| M3 | Details | Elevation chart synced with the map; length, ↑/↓, DIN 33466 time + simple time; speed input |
| M4 | Export | GPX export; 3 sample routes imported into Komoot (web and app) with matching length (± 3 %) |
| M5 | Go-live | Deployed at routing.pixelcenter.de with TLS, Impressum/Datenschutz, phone check, smoke test; stamp layer only if permission received |

## 8. Risks

| Risk | Mitigation |
| --- | --- |
| No permission for stamp data | `STAMPS_ENABLED` flag; fallback: OSM-based stamp data or launch without the layer |
| Fewer than 3 distinct routes | Profile alternatives + de-duplication; honest UI message |
| Closed paths in Nationalpark | OSM access tags in profiles; signage disclaimer |
| Tile server fair-use limits | Later: self-hosted Harz PMTiles extract |
| Elevation noise inflates ascent | Smoothing; compare against Komoot in M4 |
| Shared server with NSC demo | Memory limits, no ports, no edits in `/opt/nsc-portal`, validate Caddy file before reload |
