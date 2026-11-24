import { isInsideArea, MAX_WAYPOINTS, MIN_WAYPOINTS, type LatLng } from "./area.js";

export type RequestError = "invalid-request" | "too-few-waypoints" | "too-many-waypoints" | "outside-area";

export type Validation =
  { ok: true; waypoints: LatLng[] } | { ok: false; error: RequestError; index?: number };

/** Validates the body of POST /api/route: `{ "waypoints": [{ "lat": 51.8, "lng": 10.6 }, …] }`. */
export function validateRouteRequest(body: unknown): Validation {
  if (typeof body !== "object" || body === null) return { ok: false, error: "invalid-request" };
  const list = (body as { waypoints?: unknown }).waypoints;
  if (!Array.isArray(list)) return { ok: false, error: "invalid-request" };
  if (list.length < MIN_WAYPOINTS) return { ok: false, error: "too-few-waypoints" };
  if (list.length > MAX_WAYPOINTS) return { ok: false, error: "too-many-waypoints" };

  const waypoints: LatLng[] = [];
  for (const [index, item] of list.entries()) {
    const lat = (item as { lat?: unknown } | null)?.lat;
    const lng = (item as { lng?: unknown } | null)?.lng;
    if (
      typeof lat !== "number" ||
      typeof lng !== "number" ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      return { ok: false, error: "invalid-request", index };
    }
    if (!isInsideArea({ lat, lng })) return { ok: false, error: "outside-area", index };
    // 6 decimals ≈ 0.1 m – enough, and makes the cache key stable
    waypoints.push({ lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) });
  }
  return { ok: true, waypoints };
}
