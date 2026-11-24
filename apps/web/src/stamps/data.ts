import { BOOKLETS, type Booklet, type Stamp } from "./types";

function isBooklet(value: unknown): value is Booklet {
  return typeof value === "string" && (BOOKLETS as readonly string[]).includes(value);
}

/** Converts the GeoJSON from scripts/stamps into stamps; malformed features are skipped. */
export function parseStamps(data: unknown): Stamp[] {
  if (typeof data !== "object" || data === null) return [];
  const features = (data as { features?: unknown }).features;
  if (!Array.isArray(features)) return [];
  const stamps: Stamp[] = [];
  for (const f of features) {
    const coordinates = f?.geometry?.coordinates;
    const p = f?.properties;
    if (!Array.isArray(coordinates) || typeof p !== "object" || p === null) continue;
    const [lng, lat] = coordinates;
    if (typeof lat !== "number" || typeof lng !== "number") continue;
    if (typeof p.number !== "string" || typeof p.name !== "string" || !isBooklet(p.booklet)) continue;
    const booklets: Booklet[] = Array.isArray(p.booklets) ? p.booklets.filter(isBooklet) : [p.booklet];
    stamps.push({
      number: p.number,
      name: p.name,
      booklet: p.booklet,
      booklets: booklets.length ? booklets : [p.booklet],
      special: p.special === true,
      source: typeof p.source === "string" && p.source.startsWith("https://") ? p.source : "",
      lat,
      lng,
    });
  }
  return stamps;
}

/** Stamps that belong to at least one of the selected booklets. */
export function filterByBooklets(stamps: readonly Stamp[], selected: ReadonlySet<Booklet>): Stamp[] {
  return stamps.filter((s) => s.booklets.some((b) => selected.has(b)));
}

/** Number of stamps per booklet (a stamp in two booklets counts for both). */
export function countByBooklet(stamps: readonly Stamp[]): Map<Booklet, number> {
  const counts = new Map<Booklet, number>();
  for (const s of stamps) for (const b of s.booklets) counts.set(b, (counts.get(b) ?? 0) + 1);
  return counts;
}

export async function loadStamps(url = "/data/stamps.geojson"): Promise<Stamp[]> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`stamps: HTTP ${response.status}`);
  return parseStamps(await response.json());
}
