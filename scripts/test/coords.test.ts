import { describe, expect, it } from "vitest";
import {
  distanceMeters,
  parseDecimal,
  parseDegreesDecimalMinutes,
  parseDmsPair,
  parseUtmText,
  utmToLatLng,
} from "../stamps/coords.js";

describe("coordinate parsing", () => {
  it("parses decimal degrees", () => {
    expect(parseDecimal("51.736269")).toBe(51.736269);
    expect(parseDecimal(" 10,4740 ")).toBe(10.474);
    expect(parseDecimal("abc")).toBeNull();
  });

  it("parses degrees and decimal minutes", () => {
    expect(parseDegreesDecimalMinutes("51°49.192′")).toBeCloseTo(51.819867, 6);
    expect(parseDegreesDecimalMinutes("10°14.712'")).toBeCloseTo(10.2452, 6);
    expect(parseDegreesDecimalMinutes("51°60.5′")).toBeNull();
  });

  it("parses a DMS pair", () => {
    const c = parseDmsPair("(N51 53 08.5 E10 38 46.6)");
    expect(c?.lat).toBeCloseTo(51.885694, 5);
    expect(c?.lng).toBeCloseTo(10.646278, 5);
    expect(parseDmsPair("N51 5820.9 E10 7760.8")).toBeNull();
  });

  it("converts UTM to lat/lng", () => {
    // Reference values from the independent forward transformation (Snyder), WGS84 zone 32.
    expect(distanceMeters(utmToLatLng(32, 500000, 5649824.889), { lat: 51, lng: 9 })).toBeLessThan(0.5);
    // Brocken summit 51.79912 N, 10.61568 E
    expect(
      distanceMeters(utmToLatLng(32, 611409.637, 5739930.718), { lat: 51.79912, lng: 10.61568 }),
    ).toBeLessThan(0.5);
  });

  it("reads UTM from the page text formats", () => {
    expect(parseUtmText("32 U 0612338, UTM 5763496")).not.toBeNull();
    expect(parseUtmText("Koordinaten: 32 U 0605328 UTM 5729217")?.lat).toBeCloseTo(51.71, 1);
  });

  it("measures distances", () => {
    expect(distanceMeters({ lat: 51.8, lng: 10.6 }, { lat: 51.8, lng: 10.6 })).toBe(0);
    expect(distanceMeters({ lat: 51.8, lng: 10.6 }, { lat: 51.809, lng: 10.6 })).toBeCloseTo(1000, -1);
  });
});
