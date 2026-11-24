/** Coordinate parsing for the different formats used on harzer-wandernadel.de. Pure functions. */

export interface Coordinate {
  lat: number;
  lng: number;
}

function num(text: string): number {
  return Number(text.replace(",", ".").trim());
}

/** "51.736269" → 51.736269 */
export function parseDecimal(text: string): number | null {
  const match = /^\s*(-?\d{1,3}[.,]\d+)\s*°?\s*$/.exec(text);
  return match ? num(match[1]!) : null;
}

/** Degrees and decimal minutes: "51°49.192′" → 51.81987 */
export function parseDegreesDecimalMinutes(text: string): number | null {
  const match = /^\s*(\d{1,3})\s*°\s*(\d{1,2}[.,]\d+)\s*['′]?\s*$/.exec(text);
  if (!match) return null;
  const minutes = num(match[2]!);
  if (minutes >= 60) return null;
  return num(match[1]!) + minutes / 60;
}

/** "N51 53 08.5 E10 38 46.6" (degrees minutes seconds) → coordinate */
export function parseDmsPair(text: string): Coordinate | null {
  const match =
    /N\s*(\d{1,2})\s+(\d{1,2})\s+(\d{1,2}(?:[.,]\d+)?)\s+E\s*(\d{1,3})\s+(\d{1,2})\s+(\d{1,2}(?:[.,]\d+)?)/.exec(
      text,
    );
  if (!match) return null;
  const [, latD, latM, latS, lngD, lngM, lngS] = match.map((part) => num(part ?? ""));
  if (latM! >= 60 || latS! >= 60 || lngM! >= 60 || lngS! >= 60) return null;
  return { lat: latD! + latM! / 60 + latS! / 3600, lng: lngD! + lngM! / 60 + lngS! / 3600 };
}

/** UTM (WGS84, northern hemisphere) → latitude/longitude. Standard series expansion (Snyder). */
export function utmToLatLng(zone: number, easting: number, northing: number): Coordinate {
  const a = 6378137;
  const f = 1 / 298.257223563;
  const k0 = 0.9996;
  const e2 = f * (2 - f);
  const ep2 = e2 / (1 - e2);
  const x = easting - 500000;
  const m = northing / k0;
  const mu = m / (a * (1 - e2 / 4 - (3 * e2 ** 2) / 64 - (5 * e2 ** 3) / 256));
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const phi1 =
    mu +
    ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu) +
    ((21 * e1 ** 2) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu) +
    ((151 * e1 ** 3) / 96) * Math.sin(6 * mu) +
    ((1097 * e1 ** 4) / 512) * Math.sin(8 * mu);
  const sin1 = Math.sin(phi1);
  const cos1 = Math.cos(phi1);
  const tan1 = Math.tan(phi1);
  const n1 = a / Math.sqrt(1 - e2 * sin1 ** 2);
  const t1 = tan1 ** 2;
  const c1 = ep2 * cos1 ** 2;
  const r1 = (a * (1 - e2)) / (1 - e2 * sin1 ** 2) ** 1.5;
  const d = x / (n1 * k0);
  const lat =
    phi1 -
    ((n1 * tan1) / r1) *
      (d ** 2 / 2 -
        ((5 + 3 * t1 + 10 * c1 - 4 * c1 ** 2 - 9 * ep2) * d ** 4) / 24 +
        ((61 + 90 * t1 + 298 * c1 + 45 * t1 ** 2 - 252 * ep2 - 3 * c1 ** 2) * d ** 6) / 720);
  const lng0 = ((zone - 1) * 6 - 180 + 3) * (Math.PI / 180);
  const lng =
    lng0 +
    (d -
      ((1 + 2 * t1 + c1) * d ** 3) / 6 +
      ((5 - 2 * c1 + 28 * t1 - 3 * c1 ** 2 + 8 * ep2 + 24 * t1 ** 2) * d ** 5) / 120) /
      cos1;
  return { lat: (lat * 180) / Math.PI, lng: (lng * 180) / Math.PI };
}

/** "32 U 0612338, UTM 5763496" or "32 U 0605328 UTM 5729217" → coordinate */
export function parseUtmText(text: string): Coordinate | null {
  const match = /(\d{2})\s*U\s+0?(\d{6})\D{1,12}?(\d{7})/.exec(text);
  if (!match) return null;
  return utmToLatLng(Number(match[1]), Number(match[2]), Number(match[3]));
}

/** Distance in metres (haversine). */
export function distanceMeters(a: Coordinate, b: Coordinate): number {
  const r = 6371000;
  const toRad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * toRad;
  const dLng = (b.lng - a.lng) * toRad;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * toRad) * Math.cos(b.lat * toRad) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

const SEP = "[\\s,;]*";
/** Degree, minute and second marks as typed on the website (incl. curly quotes used instead of ′ ″). */
const MIN = "['′’‚`´]";
const SEC = "(?:\"|″|„|“|”|''|′′)";

/**
 * Finds the first coordinate pair in free text. Supported:
 * "N51 53 08.5 E10 38 46.6", "N 51°46.345′ E 10°33.149′", "51°39’56.8„N 10°42’22.9„E",
 * "51.4974 10.3848", "32 U 0605328 UTM 5729217".
 */
export function parseCoordinateText(text: string): Coordinate | null {
  const ddm = new RegExp(
    `N\\s*(\\d{1,2})\\s*°\\s*(\\d{1,2}[.,]\\d+)\\s*${MIN}?${SEP}E\\s*(\\d{1,3})\\s*°\\s*(\\d{1,2}[.,]\\d+)\\s*${MIN}?`,
  ).exec(text);
  if (ddm) {
    const [lat, latMin, lng, lngMin] = ddm.slice(1).map(num) as [number, number, number, number];
    if (latMin < 60 && lngMin < 60) return { lat: lat + latMin / 60, lng: lng + lngMin / 60 };
  }
  const dmsSymbols = new RegExp(
    `(\\d{1,2})\\s*°\\s*(\\d{1,2})\\s*${MIN}\\s*(\\d{1,2}(?:[.,]\\d+)?)\\s*${SEC}?\\s*N${SEP}(\\d{1,3})\\s*°\\s*(\\d{1,2})\\s*${MIN}\\s*(\\d{1,2}(?:[.,]\\d+)?)\\s*${SEC}?\\s*E`,
  ).exec(text);
  if (dmsSymbols) {
    const [d1, m1, s1, d2, m2, s2] = dmsSymbols.slice(1).map(num) as number[];
    if (m1! < 60 && s1! < 60 && m2! < 60 && s2! < 60) {
      return { lat: d1! + m1! / 60 + s1! / 3600, lng: d2! + m2! / 60 + s2! / 3600 };
    }
  }
  const dms = parseDmsPair(text);
  if (dms) return dms;
  const decimal = /(?:^|[^\d.])(5[12][.,]\d{3,})\s*[°N]?[\s,;/]+E?\s*(1[01][.,]\d{3,}|9[.,]\d{3,})/.exec(
    text,
  );
  if (decimal) return { lat: num(decimal[1]!), lng: num(decimal[2]!) };
  return parseUtmText(text);
}

/** Index where a coordinate starts in the text (used to cut names), or -1. */
export function coordinateStart(text: string): number {
  const match = /\(?\s*(?:N\s*\d{2}[\s°]|\d{2}\s*°\s*\d|5[12][.,]\d{3}|\d{2}\s*U\s+\d{6,7}|Koordinaten)/.exec(
    text,
  );
  return match ? match.index : -1;
}
