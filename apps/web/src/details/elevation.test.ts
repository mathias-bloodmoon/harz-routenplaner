import { describe, expect, it } from "vitest";
import { ascentDescent, elevationProfile, indexAtDistance } from "./elevation";

describe("ascentDescent (5 m hysteresis)", () => {
  it("sums clear climbs and descents", () => {
    expect(ascentDescent([100, 150, 200, 120])).toEqual({ ascentM: 100, descentM: 80 });
  });

  it("keeps ascent − descent equal to the net elevation change", () => {
    const { ascentM, descentM } = ascentDescent([500, 503, 507, 504, 520, 518, 516, 517]);
    expect(ascentM - descentM).toBe(17);
  });

  it("ignores noise below the threshold", () => {
    // ±2 m jitter on a flat route: only the net change start → end (2 m) remains
    expect(ascentDescent([300, 302, 299, 301, 298, 300, 302])).toEqual({ ascentM: 2, descentM: 0 });
    // a 10 m climb with jitter: 10 m instead of 22 m up and 12 m down without smoothing
    const noisyClimb = [100, 103, 101, 104, 102, 106, 104, 108, 106, 110];
    expect(ascentDescent(noisyClimb)).toEqual({ ascentM: 10, descentM: 0 });
    expect(ascentDescent(noisyClimb, 0)).toEqual({ ascentM: 18, descentM: 8 });
  });

  it("skips missing elevations", () => {
    expect(ascentDescent([null, 100, null, 110, 100])).toEqual({ ascentM: 10, descentM: 10 });
    expect(ascentDescent([])).toEqual({ ascentM: 0, descentM: 0 });
  });
});

describe("elevationProfile", () => {
  it("computes cumulative distance, min/max and totals", () => {
    const profile = elevationProfile([
      [10.6, 51.8, 500],
      [10.6, 51.809, 560],
      [10.6, 51.818, 520],
    ]);
    expect(profile.distances[0]).toBe(0);
    expect(profile.distances[2]).toBeCloseTo(2001, -1);
    expect(profile.distanceM).toBeCloseTo(2001, -1);
    expect(profile).toMatchObject({ ascentM: 60, descentM: 40, minEleM: 500, maxEleM: 560 });
  });

  it("handles routes without elevation", () => {
    const profile = elevationProfile([
      [10.6, 51.8],
      [10.61, 51.8],
    ]);
    expect(profile).toMatchObject({ ascentM: 0, descentM: 0, minEleM: null, maxEleM: null });
  });
});

describe("indexAtDistance", () => {
  const distances = [0, 100, 250, 400];
  it.each([
    [0, 0],
    [49, 0],
    [51, 1],
    [180, 2],
    [1000, 3],
    [-5, 0],
  ])("distance %i → index %i", (d, index) => {
    expect(indexAtDistance(distances, d)).toBe(index);
  });
});
