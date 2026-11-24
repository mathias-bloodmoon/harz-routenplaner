import type { Position } from "../routing/types";

export const HYSTERESIS_M = 5;

export interface ElevationProfile {
  /** Cumulative distance from the start in metres, one entry per position. */
  distances: number[];
  /** Elevation in metres (null where the route has none). */
  elevations: (number | null)[];
  distanceM: number;
  ascentM: number;
  descentM: number;
  minEleM: number | null;
  maxEleM: number | null;
}

const EARTH_RADIUS = 6371000;
const toRad = Math.PI / 180;

export function distanceMeters(a: Position, b: Position): number {
  const dLat = (b[1] - a[1]) * toRad;
  const dLng = (b[0] - a[0]) * toRad;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * toRad) * Math.cos(b[1] * toRad) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS * Math.asin(Math.sqrt(h));
}

/**
 * Sums ascent and descent with a hysteresis: a change only counts once the elevation has moved at least
 * `threshold` metres away from the last turning point. This removes the noise of the elevation model
 * (small ups and downs) that would otherwise inflate the totals. The remainder between the last turning point
 * and the end is added at the end, so ascent − descent always equals the net elevation change.
 */
export function ascentDescent(elevations: readonly (number | null)[], threshold = HYSTERESIS_M) {
  let ascent = 0;
  let descent = 0;
  let reference: number | null = null;
  let last: number | null = null;
  for (const ele of elevations) {
    if (ele === null || !Number.isFinite(ele)) continue;
    last = ele;
    if (reference === null) {
      reference = ele;
      continue;
    }
    const diff = ele - reference;
    if (diff >= threshold) {
      ascent += diff;
      reference = ele;
    } else if (diff <= -threshold) {
      descent -= diff;
      reference = ele;
    }
  }
  if (reference !== null && last !== null) {
    if (last > reference) ascent += last - reference;
    else descent += reference - last;
  }
  return { ascentM: ascent, descentM: descent };
}

export function elevationProfile(
  coordinates: readonly Position[],
  threshold = HYSTERESIS_M,
): ElevationProfile {
  const distances: number[] = [];
  const elevations: (number | null)[] = [];
  let total = 0;
  coordinates.forEach((p, i) => {
    if (i > 0) total += distanceMeters(coordinates[i - 1]!, p);
    distances.push(total);
    elevations.push(typeof p[2] === "number" && Number.isFinite(p[2]) ? p[2] : null);
  });
  const known = elevations.filter((e): e is number => e !== null);
  return {
    distances,
    elevations,
    distanceM: total,
    ...ascentDescent(elevations, threshold),
    minEleM: known.length ? Math.min(...known) : null,
    maxEleM: known.length ? Math.max(...known) : null,
  };
}

/** Index of the profile point closest to a distance along the route (binary search). */
export function indexAtDistance(distances: readonly number[], distance: number): number {
  let lo = 0;
  let hi = distances.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (distances[mid]! < distance) lo = mid + 1;
    else hi = mid;
  }
  if (lo > 0 && Math.abs(distances[lo - 1]! - distance) <= Math.abs(distances[lo]! - distance)) return lo - 1;
  return lo;
}
