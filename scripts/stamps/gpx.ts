import { XMLParser } from "fast-xml-parser";
import type { RegularStamp } from "./model.js";

interface GpxWaypoint {
  "@_lat": string;
  "@_lon": string;
  name?: string | number;
  desc?: string | number;
}

/**
 * Parses the official Harzer Wandernadel GPX ("HWN001 Eckertalsperre", <desc> with the longer name).
 * Waypoints whose name does not start with HWN<number> are ignored.
 */
export function parseRegularGpx(xml: string): RegularStamp[] {
  const parser = new XMLParser({ ignoreAttributes: false, isArray: (name) => name === "wpt" });
  const doc = parser.parse(xml) as { gpx?: { wpt?: GpxWaypoint[] } };
  const stamps: RegularStamp[] = [];
  for (const wpt of doc.gpx?.wpt ?? []) {
    const match = /^HWN\s*0*(\d{1,3})\s+(.*)$/.exec(String(wpt.name ?? "").trim());
    if (!match) continue;
    const lat = Number(wpt["@_lat"]);
    const lng = Number(wpt["@_lon"]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const desc = String(wpt.desc ?? "").trim();
    stamps.push({ number: Number(match[1]), name: desc || match[2]!.trim(), lat, lng });
  }
  return stamps.sort((a, b) => a.number - b.number);
}
