import { isInsideArea } from "./area";
import { MAX_WAYPOINTS, newId, type Waypoint } from "./waypoints";

export const DEFAULT_SPEED_KMH = 4.0;

export interface PlanState {
  waypoints: Waypoint[];
  speedKmh: number;
}

interface StoredPlanV1 {
  version: 1;
  waypoints: { lat: number; lng: number; name?: string; stampNumber?: string }[];
  speedKmh: number;
}

export function emptyPlan(): PlanState {
  return { waypoints: [], speedKmh: DEFAULT_SPEED_KMH };
}

export function serializePlan(plan: PlanState): string {
  const stored: StoredPlanV1 = {
    version: 1,
    waypoints: plan.waypoints.map(({ lat, lng, name, stampNumber }) => ({
      lat,
      lng,
      ...(name ? { name } : {}),
      ...(stampNumber ? { stampNumber } : {}),
    })),
    speedKmh: plan.speedKmh,
  };
  return JSON.stringify(stored);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Restores a stored plan. Anything malformed is dropped rather than crashing the app:
 * invalid waypoints are skipped, an invalid speed falls back to the default.
 */
export function parsePlan(raw: string | null): PlanState {
  if (!raw) return emptyPlan();
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return emptyPlan();
  }
  if (!isRecord(data) || data.version !== 1) return emptyPlan();

  const waypoints: Waypoint[] = [];
  if (Array.isArray(data.waypoints)) {
    for (const item of data.waypoints) {
      if (!isRecord(item)) continue;
      const { lat, lng, name, stampNumber } = item;
      if (typeof lat !== "number" || typeof lng !== "number" || !isInsideArea({ lat, lng })) continue;
      waypoints.push({
        id: newId(),
        lat,
        lng,
        ...(typeof name === "string" && name ? { name: name.slice(0, 200) } : {}),
        ...(typeof stampNumber === "string" && stampNumber ? { stampNumber: stampNumber.slice(0, 20) } : {}),
      });
      if (waypoints.length === MAX_WAYPOINTS) break;
    }
  }

  const speed = data.speedKmh;
  const speedKmh = typeof speed === "number" && speed >= 1 && speed <= 10 ? speed : DEFAULT_SPEED_KMH;
  return { waypoints, speedKmh };
}
