import { describe, expect, it } from "vitest";
import { parseBrouterGeoJson } from "../src/brouter.js";
import { dedupeRoutes, distanceMeters, overlapShare, type Position } from "../src/dedupe.js";
import { fixture } from "./fixtures.js";

/** Straight line from (lng0, lat) eastwards, `n` points 0.001° apart (~69 m). */
const line = (lat: number, n = 20, lng0 = 10.5): Position[] =>
  Array.from({ length: n }, (_, i) => [lng0 + i * 0.001, lat] as Position);

describe("overlapShare", () => {
  it("is 1 for identical and 0 for distant routes", () => {
    expect(overlapShare(line(51.8), line(51.8))).toBe(1);
    expect(overlapShare(line(51.8), line(51.81))).toBe(0); // ~1.1 km apart
  });

  it("tolerates small GPS offsets (< 25 m)", () => {
    expect(overlapShare(line(51.8), line(51.8001))).toBe(1); // ~11 m
    expect(overlapShare(line(51.8), line(51.8004))).toBe(0); // ~44 m
  });

  it("measures partial overlap by length", () => {
    // 9 shared segments (~620 m), then a ~1.1 km jump north and 9 segments far away (~620 m)
    const half = [...line(51.8, 10), ...line(51.81, 10, 10.509)];
    const total =
      distanceMeters([10.5, 51.8], [10.509, 51.8]) * 2 + distanceMeters([10.509, 51.8], [10.509, 51.81]);
    const shared = distanceMeters([10.5, 51.8], [10.509, 51.8]);
    expect(overlapShare(half, line(51.8))).toBeCloseTo(shared / total, 2);
  });

  it("handles degenerate input", () => {
    expect(overlapShare([[10.5, 51.8]], line(51.8))).toBe(0);
  });
});

describe("dedupeRoutes", () => {
  it("drops a route that overlaps > 90 % in both directions with an earlier one", () => {
    const a = { id: "a", coordinates: line(51.8) };
    const b = { id: "b", coordinates: line(51.80005) };
    const c = { id: "c", coordinates: line(51.81) };
    expect(dedupeRoutes([a, b, c]).map((r) => r.id)).toEqual(["a", "c"]);
  });

  it("keeps a route that shares most of an earlier one but adds a long detour", () => {
    const a = { id: "a", coordinates: line(51.8) };
    const detour = { id: "d", coordinates: [...line(51.8), ...line(51.82, 20, 10.519)] };
    expect(dedupeRoutes([a, detour]).map((r) => r.id)).toEqual(["a", "d"]);
  });

  it("finds the recorded Torfhaus → Brocken alternatives distinct", () => {
    const routes = [0, 1, 2].map((i) => ({
      id: `alt${i}`,
      ...parseBrouterGeoJson(fixture(`torfhaus-brocken-harz-trails-${i}`)),
    }));
    const kept = dedupeRoutes(routes);
    expect(kept.length).toBeGreaterThanOrEqual(2);
  });
});

describe("distanceMeters", () => {
  it("is about 111 km per degree of latitude", () => {
    expect(distanceMeters([10, 51], [10, 52])).toBeCloseTo(111195, -2);
  });
});
