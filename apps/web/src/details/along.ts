import type { Position } from "../routing/types";
import type { Stamp } from "../stamps/types";

export interface StampOnRoute {
  stamp: Stamp;
  /** Distance from the route start (metres) at the closest point. */
  atM: number;
  /** Distance of the stamp from the route (metres). */
  offsetM: number;
}

const EARTH_RADIUS = 6371000;
const toRad = Math.PI / 180;

/**
 * Stamps within `maxOffsetM` (default 100 m) of the route, ordered along the route.
 * Uses a local equirectangular projection per segment (accurate to < 1 m at these distances).
 */
export function stampsAlongRoute(
  stamps: readonly Stamp[],
  coordinates: readonly Position[],
  distances: readonly number[],
  maxOffsetM = 100,
): StampOnRoute[] {
  if (coordinates.length < 2) return [];
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const [lng, lat] of coordinates) {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  }
  const padLat = maxOffsetM / 111000;
  const padLng = padLat / Math.cos(((minLat + maxLat) / 2) * toRad);

  const result: StampOnRoute[] = [];
  for (const stamp of stamps) {
    if (stamp.lat < minLat - padLat || stamp.lat > maxLat + padLat) continue;
    if (stamp.lng < minLng - padLng || stamp.lng > maxLng + padLng) continue;
    const k = Math.cos(stamp.lat * toRad) * toRad * EARTH_RADIUS;
    const m = toRad * EARTH_RADIUS;
    let best = { offset: Infinity, at: 0 };
    for (let i = 1; i < coordinates.length; i++) {
      const a = coordinates[i - 1]!;
      const b = coordinates[i]!;
      const ax = (a[0] - stamp.lng) * k;
      const ay = (a[1] - stamp.lat) * m;
      const dx = (b[0] - a[0]) * k;
      const dy = (b[1] - a[1]) * m;
      const len2 = dx * dx + dy * dy;
      const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2));
      const offset = Math.hypot(ax + t * dx, ay + t * dy);
      if (offset < best.offset) {
        best = { offset, at: distances[i - 1]! + t * (distances[i]! - distances[i - 1]!) };
      }
    }
    if (best.offset <= maxOffsetM) result.push({ stamp, atM: best.at, offsetM: best.offset });
  }
  return result.sort((x, y) => x.atM - y.atM);
}
