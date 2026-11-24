/** Planning area: Harz + ~40 km buffer. Must match apps/web/src/plan/area.ts (checked by a unit test). */
export interface LatLng {
  lat: number;
  lng: number;
}

export const PLANNING_AREA = { south: 51.13, west: 9.64, north: 52.31, east: 12.2 } as const;

export const MIN_WAYPOINTS = 2;
export const MAX_WAYPOINTS = 25;

export function isInsideArea(point: LatLng): boolean {
  return (
    point.lat >= PLANNING_AREA.south &&
    point.lat <= PLANNING_AREA.north &&
    point.lng >= PLANNING_AREA.west &&
    point.lng <= PLANNING_AREA.east
  );
}
