import type { LatLng } from "./area.js";
import { BrouterUnavailableError, NoRouteError, type BrouterClient, type Profile } from "./brouter.js";
import { dedupeRoutes, type Position } from "./dedupe.js";

/** alternative-1…3 for 2 waypoints, otherwise one of the three profiles. */
export type RouteKind = "alternative" | "shortest" | "trails" | "gentle";

export interface PlannedRoute {
  id: string;
  kind: RouteKind;
  /** 1-based number for "Route 1, 2, 3" with 2 waypoints. */
  number: number;
  distanceM: number;
  ascentM: number;
  descentM: number;
  coordinates: Position[];
}

export interface PlanResult {
  routes: PlannedRoute[];
  requested: number;
}

interface Request {
  kind: RouteKind;
  number: number;
  profile: Profile;
  alternative: number;
}

/** Which BRouter requests to make (CONCEPT.md §4 "Routing rules"). */
export function routeRequests(waypointCount: number): Request[] {
  if (waypointCount === 2) {
    return [0, 1, 2].map((alternative) => ({
      kind: "alternative" as const,
      number: alternative + 1,
      profile: "harz-trails" as const,
      alternative,
    }));
  }
  return [
    { kind: "shortest", number: 1, profile: "harz-shortest", alternative: 0 },
    { kind: "trails", number: 2, profile: "harz-trails", alternative: 0 },
    { kind: "gentle", number: 3, profile: "harz-gentle", alternative: 0 },
  ];
}

/**
 * Calls BRouter for every request in parallel, drops failed alternatives and near-duplicates.
 * Throws BrouterUnavailableError if BRouter cannot be reached, NoRouteError if no request found a route.
 */
export async function planRoutes(client: BrouterClient, waypoints: readonly LatLng[]): Promise<PlanResult> {
  const requests = routeRequests(waypoints.length);
  const settled = await Promise.allSettled(
    requests.map((r) => client.route(waypoints, r.profile, r.alternative)),
  );

  if (settled.every((s) => s.status === "rejected" && s.reason instanceof BrouterUnavailableError)) {
    throw (settled[0] as PromiseRejectedResult).reason;
  }
  const routes: PlannedRoute[] = [];
  settled.forEach((s, i) => {
    if (s.status !== "fulfilled") return;
    const r = requests[i]!;
    routes.push({
      id: `${r.kind}-${r.number}`,
      kind: r.kind,
      number: r.number,
      ...s.value,
    });
  });
  if (!routes.length) throw new NoRouteError("no route found");
  return { routes: dedupeRoutes(routes), requested: requests.length };
}
