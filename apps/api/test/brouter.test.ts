import { describe, expect, it } from "vitest";
import { NoRouteError, parseBrouterGeoJson } from "../src/brouter.js";
import { fixture } from "./fixtures.js";

describe("parseBrouterGeoJson", () => {
  it("reads geometry with elevation, length, ascent and descent", () => {
    const track = parseBrouterGeoJson(fixture("torfhaus-brocken-harz-trails-0"));
    expect(track.distanceM).toBe(10216);
    expect(track.ascentM).toBe(425);
    expect(track.descentM).toBe(8); // 425 filtered ascend − 417 net climb
    expect(track.coordinates[0]).toHaveLength(3);
    expect(track.coordinates.length).toBeGreaterThan(100);
  });

  it("rejects empty answers", () => {
    expect(() => parseBrouterGeoJson({ features: [] })).toThrow(NoRouteError);
    expect(() => parseBrouterGeoJson({ features: [{ geometry: { coordinates: [[10, 51]] } }] })).toThrow(
      NoRouteError,
    );
  });
});
