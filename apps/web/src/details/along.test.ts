import { describe, expect, it } from "vitest";
import type { Stamp } from "../stamps/types";
import { stampsAlongRoute } from "./along";
import { elevationProfile } from "./elevation";

const stamp = (number: string, lat: number, lng: number): Stamp => ({
  number,
  name: `Stamp ${number}`,
  booklet: "hwn",
  booklets: ["hwn"],
  special: false,
  source: "",
  lat,
  lng,
});

describe("stampsAlongRoute", () => {
  // straight route ~2.2 km north from 51.80
  const coordinates: [number, number, number][] = [
    [10.6, 51.8, 500],
    [10.6, 51.81, 520],
    [10.6, 51.82, 540],
  ];
  const { distances } = elevationProfile(coordinates);

  it("finds stamps within 100 m, ordered along the route", () => {
    const result = stampsAlongRoute(
      [
        stamp("far", 51.81, 10.61), // ~690 m east
        stamp("end", 51.8195, 10.6005), // near the end, ~35 m off
        stamp("start", 51.8001, 10.6012), // near the start, ~85 m off
        stamp("edge", 51.805, 10.6016), // ~110 m off
      ],
      coordinates,
      distances,
    );
    expect(result.map((r) => r.stamp.number)).toEqual(["start", "end"]);
    expect(result[0]!.atM).toBeCloseTo(11, -1);
    expect(result[1]!.atM).toBeCloseTo(2168, -1);
    expect(result[0]!.offsetM).toBeLessThan(100);
  });

  it("returns nothing for degenerate routes", () => {
    expect(stampsAlongRoute([stamp("x", 51.8, 10.6)], [[10.6, 51.8]], [0])).toEqual([]);
  });
});
