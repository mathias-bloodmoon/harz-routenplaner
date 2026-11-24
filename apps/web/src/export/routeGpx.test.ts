import { describe, expect, it } from "vitest";
import { elevationProfile } from "../details/elevation";
import type { Route } from "../routing/types";
import { buildGpx } from "./gpx";
import { routeToGpx } from "./routeGpx";

const route: Route = {
  id: "alternative-1",
  kind: "alternative",
  number: 1,
  distanceM: 0,
  ascentM: 0,
  descentM: 0,
  coordinates: [
    [10.6, 51.8, 500],
    [10.6, 51.81, 560],
    [10.6, 51.82, 540],
  ],
};
const profile = elevationProfile(route.coordinates);

const base = {
  route,
  routeName: "Route 1",
  profile,
  waypoints: [
    { id: "a", lat: 51.8, lng: 10.6 },
    { id: "b", lat: 51.82, lng: 10.6, name: "Brocken", stampNumber: "9" },
  ],
  stamps: [
    {
      stamp: {
        number: "9",
        name: "Brocken",
        booklet: "hwn" as const,
        booklets: ["hwn" as const],
        special: false,
        source: "",
        lat: 51.82,
        lng: 10.6,
      },
      atM: 2224,
      offsetM: 0,
    },
  ],
  speedKmh: 4,
  now: new Date("2026-11-24T20:00:00Z"),
};

describe("routeToGpx", () => {
  it("builds name, description with walking time, waypoints, stamps and track (German)", () => {
    const gpx = routeToGpx({ ...base, language: "de" });
    expect(gpx.name).toBe("Harz Routenplaner – Route 1: 51.80000, 10.60000 → 9 Brocken");
    expect(gpx.description).toBe("2,2 km · ↑ 60 m · ↓ 20 m · Gehzeit 41 min (DIN 33466, 4 km/h)");
    expect(gpx.waypoints.map((w) => w.name)).toEqual(["Wegpunkt A", "B: 9 Brocken", "9 Brocken"]);
    expect(gpx.waypoints[2]).toMatchObject({ desc: "Stempelstelle · 2,2 km", type: "Stempelstelle" });
    expect(gpx.track).toHaveLength(3);
    expect(gpx.track[1]).toEqual({ lat: 51.81, lng: 10.6, ele: 560 });
    expect(gpx.time).toBe("2026-11-24T20:00:00.000Z");
  });

  it("uses the English texts", () => {
    const gpx = routeToGpx({ ...base, language: "en", speedKmh: 3.5 });
    expect(gpx.description).toBe("2.2 km · ↑ 60 m · ↓ 20 m · walking time 45 min (DIN 33466, 3.5 km/h)");
    expect(gpx.waypoints[0]!.name).toBe("Waypoint A");
  });

  it("produces a GPX document with the track", () => {
    const xml = buildGpx(routeToGpx({ ...base, language: "de" }));
    expect(xml.match(/<trkpt /g)).toHaveLength(3);
  });
});
