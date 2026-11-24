/**
 * GPX 1.1 builder (pure, no DOM). One <trk> with all points incl. <ele>, <wpt> for the user's waypoints and the
 * stamp points on the route, <metadata> with name, description and creator "Harz Routenplaner".
 * Element order follows the GPX 1.1 schema (metadata, wpt*, trk*; inside wpt: ele, name, desc, sym, type).
 */

export interface GpxPoint {
  lat: number;
  lng: number;
  ele?: number | undefined;
}

export interface GpxWaypoint extends GpxPoint {
  name: string;
  desc?: string;
  sym?: string;
  type?: string;
}

export interface GpxInput {
  name: string;
  description: string;
  /** Point in time for <metadata><time>, ISO 8601. */
  time: string;
  link?: string;
  waypoints: GpxWaypoint[];
  track: GpxPoint[];
}

export const CREATOR = "Harz Routenplaner";

/** Escapes text for XML element content and attribute values. Removes characters XML 1.0 forbids. */
export function escapeXml(text: string): string {
  return (
    text
      // eslint-disable-next-line no-control-regex -- the point is to remove control characters
      .replace(/[^\u0009\u000A\u000D -퟿-�\u{10000}-\u{10FFFF}]/gu, "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;")
  );
}

const coord = (value: number) => value.toFixed(6);
const ele = (value: number | undefined) =>
  value === undefined || !Number.isFinite(value) ? "" : `<ele>${value.toFixed(1)}</ele>`;

function element(name: string, text: string | undefined): string {
  return text ? `<${name}>${escapeXml(text)}</${name}>` : "";
}

export function buildGpx(input: GpxInput): string {
  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<gpx version="1.1" creator="${escapeXml(CREATOR)}" xmlns="http://www.topografix.com/GPX/1/1" ` +
      'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ' +
      'xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">',
    "  <metadata>",
    `    ${element("name", input.name)}`,
    `    ${element("desc", input.description)}`,
    `    <author>${element("name", CREATOR)}</author>`,
    ...(input.link ? [`    <link href="${escapeXml(input.link)}">${element("text", CREATOR)}</link>`] : []),
    `    <time>${escapeXml(input.time)}</time>`,
    "  </metadata>",
  ];
  for (const w of input.waypoints) {
    lines.push(
      `  <wpt lat="${coord(w.lat)}" lon="${coord(w.lng)}">${ele(w.ele)}${element("name", w.name)}` +
        `${element("desc", w.desc)}${element("sym", w.sym)}${element("type", w.type)}</wpt>`,
    );
  }
  lines.push("  <trk>", `    ${element("name", input.name)}`, `    ${element("desc", input.description)}`);
  lines.push("    <trkseg>");
  for (const p of input.track)
    lines.push(`      <trkpt lat="${coord(p.lat)}" lon="${coord(p.lng)}">${ele(p.ele)}</trkpt>`);
  lines.push("    </trkseg>", "  </trk>", "</gpx>", "");
  return lines.filter((line) => line.trim() !== "").join("\n");
}

/** harz-route-YYYY-MM-DD.gpx (local date). */
export function gpxFileName(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `harz-route-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.gpx`;
}
