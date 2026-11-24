/** Planning area: Harz + ~40 km buffer (reaches Northeim, Göttingen, Halberstadt). */
export interface BoundingBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export const PLANNING_AREA: BoundingBox = { south: 51.13, west: 9.64, north: 52.31, east: 12.2 };

export function isInsideArea(point: LatLng, box: BoundingBox = PLANNING_AREA): boolean {
  return (
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng) &&
    point.lat >= box.south &&
    point.lat <= box.north &&
    point.lng >= box.west &&
    point.lng <= box.east
  );
}
