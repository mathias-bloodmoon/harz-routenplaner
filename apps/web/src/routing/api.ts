import type { LatLng } from "../plan/area";
import type { Position, Route, RouteErrorCode, RouteKind, RouteResult } from "./types";

const KINDS: readonly RouteKind[] = ["alternative", "shortest", "trails", "gentle"];
const ERRORS: readonly RouteErrorCode[] = [
  "invalid-request",
  "too-few-waypoints",
  "too-many-waypoints",
  "outside-area",
  "routing-unavailable",
  "no-route",
  "rate-limited",
];

export type RouteResponse =
  { ok: true; result: RouteResult } | { ok: false; error: RouteErrorCode; retryAfterSeconds?: number };

function isPosition(value: unknown): value is Position {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number" &&
    (value[2] === undefined || typeof value[2] === "number")
  );
}

/** Validates the JSON of POST /api/route (pure; invalid routes are dropped). */
export function parseRouteResponse(status: number, data: unknown): RouteResponse {
  const body = (typeof data === "object" && data !== null ? data : {}) as Record<string, unknown>;
  if (status !== 200) {
    const error = ERRORS.includes(body.error as RouteErrorCode)
      ? (body.error as RouteErrorCode)
      : status === 429
        ? "rate-limited"
        : "routing-unavailable";
    const retry = Number(body.retryAfterSeconds);
    return { ok: false, error, ...(Number.isFinite(retry) && retry > 0 ? { retryAfterSeconds: retry } : {}) };
  }
  const routes: Route[] = [];
  for (const item of Array.isArray(body.routes) ? body.routes : []) {
    const r = item as Record<string, unknown>;
    if (
      typeof r.id !== "string" ||
      !KINDS.includes(r.kind as RouteKind) ||
      !Array.isArray(r.coordinates) ||
      r.coordinates.length < 2 ||
      !r.coordinates.every(isPosition)
    ) {
      continue;
    }
    routes.push({
      id: r.id,
      kind: r.kind as RouteKind,
      number: Number(r.number) || routes.length + 1,
      distanceM: Number(r.distanceM) || 0,
      ascentM: Number(r.ascentM) || 0,
      descentM: Number(r.descentM) || 0,
      coordinates: r.coordinates as Position[],
    });
  }
  if (!routes.length) return { ok: false, error: "no-route" };
  return { ok: true, result: { routes, requested: Number(body.requested) || routes.length } };
}

export async function requestRoutes(
  waypoints: readonly LatLng[],
  signal?: AbortSignal,
): Promise<RouteResponse> {
  try {
    const response = await fetch("/api/route", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ waypoints: waypoints.map(({ lat, lng }) => ({ lat, lng })) }),
      ...(signal ? { signal } : {}),
    });
    let data: unknown = null;
    try {
      data = await response.json();
    } catch {
      // e.g. a proxy error page
    }
    return parseRouteResponse(response.status, data);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return { ok: false, error: "routing-unavailable" };
  }
}
