import { describe, expect, it } from "vitest";
import { isInsideArea, PLANNING_AREA } from "./area";

describe("isInsideArea", () => {
  it.each([
    ["Brocken", 51.7991, 10.6156],
    ["Göttingen", 51.5413, 9.9158],
    ["Northeim", 51.7066, 9.9997],
    ["Halberstadt", 51.8958, 11.0467],
    ["Lutherweg Unterrißdorf", 51.51741, 11.61293],
  ])("accepts %s", (_name, lat, lng) => {
    expect(isInsideArea({ lat, lng })).toBe(true);
  });

  it.each([
    ["Hannover", 52.3759, 9.732],
    ["Kassel", 51.3127, 9.4797],
    ["Leipzig", 51.3397, 12.3731],
    ["Berlin", 52.52, 13.405],
  ])("rejects %s", (_name, lat, lng) => {
    expect(isInsideArea({ lat, lng })).toBe(false);
  });

  it("includes the edges of the box", () => {
    expect(isInsideArea({ lat: PLANNING_AREA.south, lng: PLANNING_AREA.west })).toBe(true);
    expect(isInsideArea({ lat: PLANNING_AREA.north, lng: PLANNING_AREA.east })).toBe(true);
  });

  it("rejects invalid numbers", () => {
    expect(isInsideArea({ lat: Number.NaN, lng: 10.6 })).toBe(false);
    expect(isInsideArea({ lat: 51.8, lng: Number.POSITIVE_INFINITY })).toBe(false);
  });
});
