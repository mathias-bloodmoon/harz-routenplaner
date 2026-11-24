import { isInsideArea, type LatLng } from "./area";

export const MIN_WAYPOINTS = 2;
export const MAX_WAYPOINTS = 25;

export interface Waypoint extends LatLng {
  id: string;
  /** Name of the stamp point the waypoint was snapped to. */
  name?: string;
  stampNumber?: string;
}

export type WaypointError = "outside-area" | "too-many";

export type Result = { ok: true; waypoints: Waypoint[] } | { ok: false; error: WaypointError };

let counter = 0;
export function newId(): string {
  counter += 1;
  return `wp-${Date.now().toString(36)}-${counter}`;
}

/** Letter label for the position in the list: A, B, C … Y (max. 25 waypoints). */
export function labelFor(index: number): string {
  return String.fromCharCode(65 + index);
}

export function addWaypoint(list: readonly Waypoint[], waypoint: Waypoint): Result {
  if (list.length >= MAX_WAYPOINTS) return { ok: false, error: "too-many" };
  if (!isInsideArea(waypoint)) return { ok: false, error: "outside-area" };
  return { ok: true, waypoints: [...list, waypoint] };
}

/** Moves a waypoint to a new position (drag on the map). Dragging drops a stamp snap. */
export function moveWaypoint(list: readonly Waypoint[], id: string, to: LatLng): Result {
  if (!isInsideArea(to)) return { ok: false, error: "outside-area" };
  return {
    ok: true,
    waypoints: list.map((w) => (w.id === id ? { id: w.id, lat: to.lat, lng: to.lng } : w)),
  };
}

export function removeWaypoint(list: readonly Waypoint[], id: string): Waypoint[] {
  return list.filter((w) => w.id !== id);
}

/** Moves the waypoint at `from` to index `to` (clamped); returns a new list. */
export function reorderWaypoint(list: readonly Waypoint[], from: number, to: number): Waypoint[] {
  if (from < 0 || from >= list.length) return [...list];
  const target = Math.max(0, Math.min(list.length - 1, to));
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(target, 0, item!);
  return next;
}

export function reverseWaypoints(list: readonly Waypoint[]): Waypoint[] {
  return [...list].reverse();
}

/** Display name: stamp name, otherwise rounded coordinates. */
export function displayName(waypoint: Waypoint): string {
  if (waypoint.name) {
    return waypoint.stampNumber ? `${waypoint.stampNumber} ${waypoint.name}` : waypoint.name;
  }
  return `${waypoint.lat.toFixed(5)}, ${waypoint.lng.toFixed(5)}`;
}
