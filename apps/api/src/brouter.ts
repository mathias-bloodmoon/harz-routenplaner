import type { LatLng } from "./area.js";
import type { Position } from "./dedupe.js";

export type Profile = "harz-shortest" | "harz-trails" | "harz-gentle";

export interface BrouterTrack {
  coordinates: Position[];
  distanceM: number;
  /** BRouter's "filtered ascend" (hysteresis-filtered); M3 recomputes from the elevation profile. */
  ascentM: number;
  descentM: number;
}

export class BrouterUnavailableError extends Error {}
export class NoRouteError extends Error {}

export interface BrouterClient {
  route(waypoints: readonly LatLng[], profile: Profile, alternative: number): Promise<BrouterTrack>;
}

interface BrouterGeoJson {
  features?: {
    geometry?: { coordinates?: unknown };
    properties?: Record<string, unknown>;
  }[];
}

/** Parses BRouter's GeoJSON answer (format=geojson). Exported for tests with recorded fixtures. */
export function parseBrouterGeoJson(data: BrouterGeoJson): BrouterTrack {
  const feature = data.features?.[0];
  const raw = feature?.geometry?.coordinates;
  if (!Array.isArray(raw) || raw.length < 2) throw new NoRouteError("empty geometry");
  const coordinates: Position[] = raw.map((c: unknown) => {
    const [lng, lat, ele] = c as number[];
    return ele === undefined ? [Number(lng), Number(lat)] : [Number(lng), Number(lat), Number(ele)];
  });
  const p = feature?.properties ?? {};
  const distanceM = Number(p["track-length"]);
  const ascentM = Number(p["filtered ascend"]);
  const plain = Number(p["plain-ascend"]);
  return {
    coordinates,
    distanceM: Number.isFinite(distanceM) ? distanceM : 0,
    ascentM: Number.isFinite(ascentM) ? ascentM : 0,
    // plain-ascend = end elevation − start elevation, so descent = ascent − net climb
    descentM: Number.isFinite(ascentM) && Number.isFinite(plain) ? Math.max(0, ascentM - plain) : 0,
  };
}

export function createBrouterClient(baseUrl: string, timeoutMs = 25000): BrouterClient {
  return {
    async route(waypoints, profile, alternative) {
      const lonlats = waypoints.map((w) => `${w.lng},${w.lat}`).join("|");
      const url = `${baseUrl}/brouter?lonlats=${encodeURIComponent(lonlats)}&profile=${profile}&alternativeidx=${alternative}&format=geojson`;
      let response: Response;
      try {
        response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
      } catch (error) {
        throw new BrouterUnavailableError(error instanceof Error ? error.message : String(error));
      }
      const text = await response.text();
      // BRouter answers errors with HTTP 4xx/5xx and a plain-text message (e.g. "position not mapped")
      if (!response.ok) {
        if (response.status >= 500 && !/not mapped|no route|target island|unable to/i.test(text)) {
          throw new BrouterUnavailableError(`HTTP ${response.status}: ${text.slice(0, 200)}`);
        }
        throw new NoRouteError(text.slice(0, 200));
      }
      try {
        return parseBrouterGeoJson(JSON.parse(text) as BrouterGeoJson);
      } catch (error) {
        if (error instanceof NoRouteError) throw error;
        throw new NoRouteError(`invalid answer: ${text.slice(0, 200)}`);
      }
    },
  };
}
