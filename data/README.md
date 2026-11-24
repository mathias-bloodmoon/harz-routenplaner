# Stamp data (Harzer Wandernadel)

`data/stamps.geojson` holds the stamp points of the Harzer Wandernadel: the 222 regular stamps and the special
stamps of the companion booklets. **It is generated locally and never committed or baked into a Docker image.**

Why: the official data is "free for private persons for personal use" (terms on
https://www.harzer-wandernadel.de/stempelstellen/gps-download/). Mathias has asked the Harzer Wandernadel office
for permission to show the points publicly. Until it is granted in writing, the data stays out of the public
repository and images, and production runs with `STAMPS_ENABLED=false` (CONCEPT.md §3).

## Build it (about 1 minute)

```sh
pnpm install
pnpm --filter scripts stamps:fetch-special   # once: companion booklet pages → data/raw/special-stamps.csv
pnpm --filter scripts stamps:build           # official GPX ZIP + CSV → data/stamps.geojson
```

**Success looks like:**

```
Regular stamps: 222 (expected 222)
Points on the map: 330, of which special: 108
Stamps per booklet: hwn 222, talsperren 30, burgen-schloesser 32, karstwanderweg 24, lutherweg 10, huy-fallstein 20, sonderstempel 18, klosterwanderweg 16
```

Then `docker compose -f infra/docker-compose.yml up --build` (mounts `data/` into the web container) or
`pnpm dev` shows the stamp layer.

## Sources

| Booklet                                                                                      | Source                                                                              | Format                                      |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------- |
| Harzer Wandernadel (222 regular stamps)                                                      | Official GPX ZIP, status 23.04.2025, pinned by SHA-256 in `scripts/stamps/paths.ts` | GPX                                         |
| Talsperren, Lutherweg, Karstwanderweg, Huy-Fallstein, Burgen und Schlösser, Klosterwanderweg | Table on the booklet's page on harzer-wandernadel.de                                | decimal degrees / degrees + decimal minutes |
| Sonderstempel (99xx)                                                                         | Text of the page "Sonderstempel"                                                    | DMS, degrees + minutes, decimal, UTM        |

`stamps:fetch-special` reads these pages **once** (no live scraping) and writes `data/raw/special-stamps.csv`
(`booklet;number;name;hwn;lat;lng`). Review it; wrong rows can be fixed by hand, the build validates every row.
It does not overwrite an existing CSV unless called with `--force`.

How the build merges the data (`scripts/stamps/merge.ts`):

- A booklet row that names a regular stamp ("Okertalsperre (HWN 116)") adds the booklet to that stamp instead of a
  second point – if the coordinates are within 1 km. Otherwise it is kept as its own point with a warning.
- Special stamps within 50 m of each other are one point listed in several booklets (e.g. Huy-Fallstein and
  Burgen und Schlösser share 5 places).
- Special stamps without an official number get one per booklet: `TS1…` Talsperren, `LW` Lutherweg,
  `KW` Karstwanderweg, `HF` Huy-Fallstein, `BS` Burgen und Schlösser, `KL` Klosterwanderweg.

GeoJSON properties: `number`, `name`, `booklet` (main booklet), `booklets` (all booklets), `special`, `source`.

> ⚠️ OFFEN: 24 Sonderstempel (99xx) have no coordinates on the website (e.g. 9910 Baumwipfelpfad, 9921 Rodelhaus
> Braunlage); `stamps:fetch-special` lists them. They are missing on the map until coordinates are known.
> The booklet "Barrierefreie Wanderwege" has no stamp list yet.

> ⚠️ OFFEN: Karstwanderweg names "Bergbaulehrpfad, Wettelrode (HWN 222)", but its coordinates are 1.9 km from
> HWN 222; it is shown as its own point.

## Tests and CI

Unit tests use synthetic samples (`scripts/test/`). E2E tests and CI use the synthetic
`apps/web/e2e/fixtures/stamps.geojson` (5 made-up points) – the real data is not needed in CI.
