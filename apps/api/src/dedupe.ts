/** A route geometry as [lng, lat, ele?] positions (GeoJSON order). */
export type Position = [number, number, number?];

const EARTH_RADIUS = 6371000;
const toRad = Math.PI / 180;

export function distanceMeters(a: Position, b: Position): number {
  const dLat = (b[1] - a[1]) * toRad;
  const dLng = (b[0] - a[0]) * toRad;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * toRad) * Math.cos(b[1] * toRad) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS * Math.asin(Math.sqrt(h));
}

/** Distance from point p to segment a–b in metres (local equirectangular projection, fine for < 1 km). */
function pointToSegmentMeters(p: Position, a: Position, b: Position): number {
  const k = Math.cos(p[1] * toRad);
  const ax = (a[0] - p[0]) * k * toRad * EARTH_RADIUS;
  const ay = (a[1] - p[1]) * toRad * EARTH_RADIUS;
  const bx = (b[0] - p[0]) * k * toRad * EARTH_RADIUS;
  const by = (b[1] - p[1]) * toRad * EARTH_RADIUS;
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2));
  return Math.hypot(ax + t * dx, ay + t * dy);
}

/** Grid of segments for quick "is this point near the route" queries. Cell ≈ 0.002° (~150–220 m). */
class SegmentIndex {
  private readonly cells = new Map<string, [Position, Position][]>();
  private static readonly CELL = 0.002;

  constructor(line: readonly Position[]) {
    for (let i = 1; i < line.length; i++) {
      const a = line[i - 1]!;
      const b = line[i]!;
      const keys = new Set<string>();
      const steps = Math.max(1, Math.ceil(distanceMeters(a, b) / 100));
      for (let s = 0; s <= steps; s++) {
        const lng = a[0] + ((b[0] - a[0]) * s) / steps;
        const lat = a[1] + ((b[1] - a[1]) * s) / steps;
        keys.add(SegmentIndex.key(lng, lat));
      }
      for (const key of keys) {
        const list = this.cells.get(key) ?? [];
        list.push([a, b]);
        this.cells.set(key, list);
      }
    }
  }

  private static key(lng: number, lat: number): string {
    return `${Math.floor(lng / SegmentIndex.CELL)}:${Math.floor(lat / SegmentIndex.CELL)}`;
  }

  /** True if p is within `tolerance` metres (≤ ~100 m) of the indexed line. */
  near(p: Position, tolerance: number): boolean {
    const cx = Math.floor(p[0] / SegmentIndex.CELL);
    const cy = Math.floor(p[1] / SegmentIndex.CELL);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (const [a, b] of this.cells.get(`${cx + dx}:${cy + dy}`) ?? []) {
          if (pointToSegmentMeters(p, a, b) <= tolerance) return true;
        }
      }
    }
    return false;
  }
}

/**
 * Share of `route`'s length (0…1) that runs within `tolerance` metres of `other`.
 * Each segment counts as shared if its midpoint and both ends are near the other route.
 */
export function overlapShare(route: readonly Position[], other: readonly Position[], tolerance = 25): number {
  if (route.length < 2 || other.length < 2) return 0;
  const index = new SegmentIndex(other);
  let total = 0;
  let shared = 0;
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1]!;
    const b = route[i]!;
    const length = distanceMeters(a, b);
    total += length;
    const mid: Position = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    if (index.near(a, tolerance) && index.near(mid, tolerance) && index.near(b, tolerance)) shared += length;
  }
  return total === 0 ? 1 : shared / total;
}

/** Keeps routes in order and drops each one that overlaps more than `threshold` with an earlier kept route. */
export function dedupeRoutes<T extends { coordinates: readonly Position[] }>(
  routes: readonly T[],
  threshold = 0.9,
): T[] {
  const kept: T[] = [];
  for (const route of routes) {
    const duplicate = kept.some(
      (k) =>
        overlapShare(route.coordinates, k.coordinates) > threshold &&
        overlapShare(k.coordinates, route.coordinates) > threshold,
    );
    if (!duplicate) kept.push(route);
  }
  return kept;
}
