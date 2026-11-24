import { describe, expect, it } from "vitest";
import { mergeStamps } from "../stamps/merge.js";
import type { RegularStamp, SpecialRow } from "../stamps/model.js";

const regular: RegularStamp[] = [
  { number: 1, name: "Erste", lat: 51.8, lng: 10.6 },
  { number: 2, name: "Zweite", lat: 51.7, lng: 10.5 },
];

const row = (overrides: Partial<SpecialRow>): SpecialRow => ({
  booklet: "talsperren",
  number: "",
  name: "Sonder",
  hwn: null,
  lat: 51.6,
  lng: 10.4,
  ...overrides,
});

describe("mergeStamps", () => {
  it("adds regular stamps with booklet hwn", () => {
    const { collection } = mergeStamps(regular, [], "2026-01-01T00:00:00Z");
    expect(collection.features[0]).toEqual({
      type: "Feature",
      geometry: { type: "Point", coordinates: [10.6, 51.8] },
      properties: {
        number: "1",
        name: "Erste",
        booklet: "hwn",
        booklets: ["hwn"],
        special: false,
        source: "https://www.harzer-wandernadel.de/stempelstellen/gps-download/",
      },
    });
  });

  it("links a booklet entry to the regular stamp it names", () => {
    const { collection } = mergeStamps(regular, [row({ hwn: 2, lat: 51.7001, lng: 10.5001 })]);
    expect(collection.features).toHaveLength(2);
    expect(collection.features[1]?.properties.booklets).toEqual(["hwn", "talsperren"]);
  });

  it("keeps an HWN reference as own point if it is far away, with a warning", () => {
    const { collection, warnings } = mergeStamps(regular, [row({ hwn: 2, lat: 51.6, lng: 10.4 })]);
    expect(collection.features).toHaveLength(3);
    expect(warnings[0]).toMatch(/HWN 2.*m away/);
  });

  it("numbers special stamps per booklet and merges the same place in several booklets", () => {
    const { collection } = mergeStamps(regular, [
      row({ name: "A" }),
      row({ name: "B", lat: 51.65 }),
      row({ name: "A again", booklet: "huy-fallstein", lat: 51.60001 }),
      row({ name: "Grenz", booklet: "sonderstempel", number: "9901", lat: 51.9 }),
    ]);
    const specials = collection.features.filter((f) => f.properties.special);
    expect(specials.map((f) => [f.properties.number, f.properties.name, f.properties.booklets])).toEqual([
      ["TS1", "A", ["talsperren", "huy-fallstein"]],
      ["TS2", "B", ["talsperren"]],
      ["9901", "Grenz", ["sonderstempel"]],
    ]);
  });

  it("warns about unknown HWN references", () => {
    expect(mergeStamps(regular, [row({ hwn: 99 })]).warnings[0]).toMatch(/unknown HWN 99/);
  });
});
