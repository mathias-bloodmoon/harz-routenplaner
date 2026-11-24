export type RouteKind = "alternative" | "shortest" | "trails" | "gentle";

/** [lng, lat, ele?] as delivered by the api (GeoJSON order). */
export type Position = [number, number, number?];

export interface Route {
  id: string;
  kind: RouteKind;
  number: number;
  distanceM: number;
  ascentM: number;
  descentM: number;
  coordinates: Position[];
}

export interface RouteResult {
  routes: Route[];
  requested: number;
}

export type RouteErrorCode =
  | "invalid-request"
  | "too-few-waypoints"
  | "too-many-waypoints"
  | "outside-area"
  | "routing-unavailable"
  | "no-route"
  | "rate-limited";
