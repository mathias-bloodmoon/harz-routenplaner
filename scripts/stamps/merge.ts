import { distanceMeters } from "./coords.js";
import {
  PREFIX,
  SOURCES,
  type RegularStamp,
  type SpecialRow,
  type StampCollection,
  type StampFeature,
} from "./model.js";

/** Special stamps closer than this are treated as the same place (listed in several booklets). */
export const SAME_PLACE_METERS = 50;
/** A booklet's reference "(HWN 116)" is trusted only if the coordinates are roughly the same. */
export const HWN_REFERENCE_MAX_METERS = 1000;

function feature(lat: number, lng: number, properties: StampFeature["properties"]): StampFeature {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [Number(lng.toFixed(6)), Number(lat.toFixed(6))] },
    properties,
  };
}

function coordinateOf(f: StampFeature) {
  return { lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] };
}

export interface MergeResult {
  collection: StampCollection;
  warnings: string[];
}

export function mergeStamps(
  regular: RegularStamp[],
  special: SpecialRow[],
  generated: string = new Date().toISOString(),
): MergeResult {
  const warnings: string[] = [];
  const byNumber = new Map<number, StampFeature>();
  const features: StampFeature[] = regular.map((s) => {
    const f = feature(s.lat, s.lng, {
      number: String(s.number),
      name: s.name,
      booklet: "hwn",
      booklets: ["hwn"],
      special: false,
      source: SOURCES.hwn,
    });
    byNumber.set(s.number, f);
    return f;
  });

  const counters = new Map<string, number>();
  const specials: StampFeature[] = [];
  for (const row of special) {
    const point = { lat: row.lat, lng: row.lng };
    const regularMatch = row.hwn !== null ? byNumber.get(row.hwn) : undefined;
    if (row.hwn !== null && !regularMatch)
      warnings.push(`${row.booklet}: "${row.name}" refers to unknown HWN ${row.hwn}`);
    if (regularMatch) {
      const distance = distanceMeters(point, coordinateOf(regularMatch));
      if (distance <= HWN_REFERENCE_MAX_METERS) {
        if (!regularMatch.properties.booklets.includes(row.booklet))
          regularMatch.properties.booklets.push(row.booklet);
        continue;
      }
      warnings.push(
        `${row.booklet}: "${row.name}" refers to HWN ${row.hwn}, but is ${Math.round(distance)} m away – kept as own point`,
      );
    }

    const same = specials.find((f) => distanceMeters(point, coordinateOf(f)) <= SAME_PLACE_METERS);
    if (same) {
      if (!same.properties.booklets.includes(row.booklet)) same.properties.booklets.push(row.booklet);
      continue;
    }

    let number = row.number;
    if (!number) {
      const count = (counters.get(row.booklet) ?? 0) + 1;
      counters.set(row.booklet, count);
      number = `${PREFIX[row.booklet as keyof typeof PREFIX]}${count}`;
    }
    specials.push(
      feature(row.lat, row.lng, {
        number,
        name: row.name,
        booklet: row.booklet,
        booklets: [row.booklet],
        special: true,
        source: SOURCES[row.booklet],
      }),
    );
  }

  return {
    collection: {
      type: "FeatureCollection",
      metadata: {
        generated,
        regularSource: SOURCES.hwn,
        note: "Data © Aktionsgemeinschaft Harzer Wandernadel. Free for private use; public display only with permission.",
      },
      features: [...features, ...specials],
    },
    warnings,
  };
}
