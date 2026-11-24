import { describe, expect, it } from "vitest";
import { countByBooklet, filterByBooklets, parseStamps } from "./data";

const feature = (number: string, booklets: string[], extra: Record<string, unknown> = {}) => ({
  type: "Feature",
  geometry: { type: "Point", coordinates: [10.6, 51.8] },
  properties: {
    number,
    name: `Stamp ${number}`,
    booklet: booklets[0],
    booklets,
    special: booklets[0] !== "hwn",
    source: "https://www.harzer-wandernadel.de/",
    ...extra,
  },
});

describe("parseStamps", () => {
  it("reads valid features and skips broken ones", () => {
    const stamps = parseStamps({
      type: "FeatureCollection",
      features: [
        feature("1", ["hwn", "talsperren"]),
        feature("TS1", ["talsperren"]),
        feature("x", ["unknown"]),
        { geometry: { coordinates: ["a", "b"] }, properties: {} },
        null,
      ],
    });
    expect(stamps.map((s) => [s.number, s.booklets, s.special])).toEqual([
      ["1", ["hwn", "talsperren"], false],
      ["TS1", ["talsperren"], true],
    ]);
    expect(stamps[0]).toMatchObject({ lat: 51.8, lng: 10.6 });
  });

  it("drops non-https source links", () => {
    const [stamp] = parseStamps({ features: [feature("1", ["hwn"], { source: "javascript:alert(1)" })] });
    expect(stamp?.source).toBe("");
  });

  it("returns nothing for invalid input", () => {
    expect(parseStamps(null)).toEqual([]);
    expect(parseStamps({ features: "no" })).toEqual([]);
  });
});

describe("booklet filter", () => {
  const stamps = parseStamps({
    features: [feature("1", ["hwn", "talsperren"]), feature("2", ["hwn"]), feature("TS1", ["talsperren"])],
  });

  it("keeps stamps in any selected booklet", () => {
    expect(filterByBooklets(stamps, new Set(["talsperren"] as const)).map((s) => s.number)).toEqual([
      "1",
      "TS1",
    ]);
    expect(filterByBooklets(stamps, new Set())).toEqual([]);
  });

  it("counts stamps per booklet", () => {
    expect(Object.fromEntries(countByBooklet(stamps))).toEqual({ hwn: 2, talsperren: 2 });
  });
});
