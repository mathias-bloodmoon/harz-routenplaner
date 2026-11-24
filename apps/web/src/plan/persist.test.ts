import { describe, expect, it } from "vitest";
import { DEFAULT_SPEED_KMH, parsePlan, serializePlan } from "./persist";

describe("plan persistence", () => {
  it("round-trips waypoints and speed", () => {
    const raw = serializePlan({
      waypoints: [
        { id: "x", lat: 51.8, lng: 10.6, name: "Brocken", stampNumber: "9" },
        { id: "y", lat: 51.75, lng: 10.5 },
      ],
      speedKmh: 3.5,
    });
    const plan = parsePlan(raw);
    expect(plan.speedKmh).toBe(3.5);
    expect(
      plan.waypoints.map(({ lat, lng, name, stampNumber }) => ({ lat, lng, name, stampNumber })),
    ).toEqual([
      { lat: 51.8, lng: 10.6, name: "Brocken", stampNumber: "9" },
      { lat: 51.75, lng: 10.5, name: undefined, stampNumber: undefined },
    ]);
    expect(new Set(plan.waypoints.map((w) => w.id)).size).toBe(2);
  });

  it.each([null, "", "not json", "[]", '{"version":2}', "42"])(
    "falls back to an empty plan for %j",
    (raw) => {
      expect(parsePlan(raw)).toEqual({ waypoints: [], speedKmh: DEFAULT_SPEED_KMH });
    },
  );

  it("drops invalid waypoints and an invalid speed", () => {
    const plan = parsePlan(
      JSON.stringify({
        version: 1,
        speedKmh: 99,
        waypoints: [
          { lat: 51.8, lng: 10.6 },
          { lat: "51", lng: 10 },
          { lat: 60, lng: 10 },
          null,
          { lng: 10 },
        ],
      }),
    );
    expect(plan.waypoints).toHaveLength(1);
    expect(plan.speedKmh).toBe(DEFAULT_SPEED_KMH);
  });

  it("keeps at most 25 waypoints", () => {
    const waypoints = Array.from({ length: 40 }, () => ({ lat: 51.8, lng: 10.6 }));
    expect(parsePlan(JSON.stringify({ version: 1, speedKmh: 4, waypoints })).waypoints).toHaveLength(25);
  });
});
