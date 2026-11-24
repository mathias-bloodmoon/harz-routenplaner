/**
 * Builds GPX files for the M4 Komoot check from a running api (the same code path as the browser export).
 * Usage: API_URL=http://localhost pnpm --filter web exec tsx scripts/sample-gpx.ts <output dir>  (needs data/stamps.geojson for stamp waypoints, optional)
 * Prints the length of each route, to compare with Komoot after the import (± 3 %).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { stampsAlongRoute } from "../src/details/along";
import { elevationProfile } from "../src/details/elevation";
import { buildGpx } from "../src/export/gpx";
import { routeToGpx } from "../src/export/routeGpx";
import { parseRouteResponse } from "../src/routing/api";
import { parseStamps } from "../src/stamps/data";

const api = process.env.API_URL ?? "http://localhost";
const out = process.argv[2] ?? "gpx-samples";
const stampsFile = new URL("../../../data/stamps.geojson", import.meta.url);
const stamps = existsSync(stampsFile) ? parseStamps(JSON.parse(readFileSync(stampsFile, "utf8"))) : [];

const tours = [
  {
    file: "1-torfhaus-brocken",
    name: "Torfhaus → Brocken",
    points: [
      [51.8108, 10.5393, "Torfhaus"],
      [51.7991, 10.6156, "Brocken"],
    ],
  },
  {
    file: "2-bad-harzburg-eckertalsperre-torfhaus",
    name: "Bad Harzburg → Eckertalsperre → Torfhaus",
    points: [
      [51.8807, 10.5617, "Bad Harzburg"],
      [51.8417, 10.58, "Eckertalsperre"],
      [51.8108, 10.5393, "Torfhaus"],
    ],
  },
  {
    file: "3-ilsenburg-plessenburg-brocken",
    name: "Ilsenburg → Plessenburg → Brocken",
    points: [
      [51.867, 10.6776, "Ilsenburg"],
      [51.8396, 10.6537, "Plessenburg"],
      [51.7991, 10.6156, "Brocken"],
    ],
  },
] as const;

mkdirSync(out, { recursive: true });
for (const tour of tours) {
  const waypoints = tour.points.map(([lat, lng, name], i) => ({ id: String(i), lat, lng, name }));
  const response = await fetch(`${api}/api/route`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ waypoints: waypoints.map(({ lat, lng }) => ({ lat, lng })) }),
  });
  const parsed = parseRouteResponse(response.status, await response.json());
  if (!parsed.ok) throw new Error(`${tour.name}: ${parsed.error}`);
  // 2 waypoints: first alternative; 3+: the trail-friendly route
  const route = parsed.result.routes.find((r) => r.kind === "trails") ?? parsed.result.routes[0]!;
  const profile = elevationProfile(route.coordinates);
  const gpx = buildGpx(
    routeToGpx({
      route,
      routeName: tour.name,
      profile,
      waypoints,
      stamps: stampsAlongRoute(stamps, route.coordinates, profile.distances),
      speedKmh: 4,
      language: "de",
      now: new Date(),
    }),
  );
  writeFileSync(`${out}/${tour.file}.gpx`, gpx);
  console.log(
    `${tour.file}.gpx  ${(profile.distanceM / 1000).toFixed(2)} km  ↑ ${Math.round(profile.ascentM)} m  ↓ ${Math.round(profile.descentM)} m  (${route.kind})`,
  );
}
