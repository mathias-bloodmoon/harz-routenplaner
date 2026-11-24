import { readFileSync } from "node:fs";
import type { LatLng } from "../src/area.js";
import {
  BrouterUnavailableError,
  NoRouteError,
  parseBrouterGeoJson,
  type BrouterClient,
} from "../src/brouter.js";

export const TORFHAUS: LatLng = { lat: 51.8108, lng: 10.5393 };
export const BROCKEN: LatLng = { lat: 51.7991, lng: 10.6156 };
export const BAD_HARZBURG: LatLng = { lat: 51.8807, lng: 10.5617 };
export const ECKERTALSPERRE: LatLng = { lat: 51.8417, lng: 10.58 };

const TOURS: Record<string, string> = {
  [JSON.stringify([TORFHAUS, BROCKEN])]: "torfhaus-brocken",
  [JSON.stringify([BAD_HARZBURG, ECKERTALSPERRE, TORFHAUS])]: "harzburg-ecker-torfhaus",
};

export function fixture(name: string) {
  return JSON.parse(readFileSync(new URL(`./fixtures/brouter/${name}.json`, import.meta.url), "utf8"));
}

/** Fake BRouter that answers the recorded sample tours (scripts/brouter/record-fixtures.sh). */
export function recordedBrouter(): BrouterClient & { calls: number } {
  const client = {
    calls: 0,
    async route(waypoints: readonly LatLng[], profile: string, alternative: number) {
      client.calls++;
      const tour = TOURS[JSON.stringify(waypoints)];
      if (!tour) throw new NoRouteError("no fixture");
      return parseBrouterGeoJson(fixture(`${tour}-${profile}-${alternative}`));
    },
  };
  return client;
}

export const unavailableBrouter: BrouterClient = {
  async route() {
    throw new BrouterUnavailableError("connect ECONNREFUSED");
  },
};
