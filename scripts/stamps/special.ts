import { coordinateStart, parseCoordinateText, parseDecimal, parseDegreesDecimalMinutes } from "./coords.js";
import type { SpecialRow } from "./model.js";

/** Strips tags, decodes the few entities used on the site, collapses whitespace. */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#8222;/g, "„")
    .replace(/&#8220;/g, "“")
    .replace(/&#8211;/g, "–")
    .replace(/&#8242;/g, "′")
    .replace(/&#(\d+);/g, (_m, code: string) => String.fromCodePoint(Number(code)))
    .replace(/­/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function tableRows(html: string): string[][] {
  const rows: string[][] = [];
  for (const table of html.match(/<table[\s\S]*?<\/table>/gi) ?? []) {
    for (const tr of table.match(/<tr[\s\S]*?<\/tr>/gi) ?? []) {
      const cells = [...tr.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => htmlToText(m[1]!));
      if (cells.length) rows.push(cells);
    }
  }
  return rows;
}

function parseCoordinate(text: string): number | null {
  return parseDecimal(text) ?? parseDegreesDecimalMinutes(text);
}

/** "Okertalsperre (HWN 116) , Altenau" → name "Okertalsperre, Altenau", hwn 116 */
export function splitHwnReference(raw: string): { name: string; hwn: number | null } {
  const match = /\((?:HWN|Stempelstelle)\s*(\d{1,3})\)/i.exec(raw);
  const name = raw
    .replace(/\((?:HWN|Stempelstelle)\s*\d{1,3}\)/gi, "")
    .replace(/\s+,/g, ",")
    .replace(/\s+/g, " ")
    .trim();
  return { name, hwn: match ? Number(match[1]) : null };
}

export interface ParseReport {
  rows: SpecialRow[];
  skipped: string[];
}

/** Parses a companion booklet page with a table "Stempelstelle | (HWN-Nr.) | Breite N | Länge E". */
export function parseBookletTable(html: string, booklet: SpecialRow["booklet"]): ParseReport {
  const rows = tableRows(html);
  const header = rows.findIndex((r) => r.some((c) => /Breite|Koordinaten N/i.test(c)));
  if (header < 0) return { rows: [], skipped: [`${booklet}: no coordinate table found`] };
  const head = rows[header]!;
  const latCol = head.findIndex((c) => /Breite|Koordinaten N/i.test(c));
  const lngCol = head.findIndex((c) => /Länge|Koordinaten E/i.test(c));
  const hwnCol = head.findIndex((c) => /HWN-Nr/i.test(c));

  const result: ParseReport = { rows: [], skipped: [] };
  for (const cells of rows.slice(header + 1)) {
    const lat = parseCoordinate(cells[latCol] ?? "");
    const lng = parseCoordinate(cells[lngCol] ?? "");
    const { name, hwn: hwnFromName } = splitHwnReference(cells[0] ?? "");
    if (!name) continue;
    if (lat === null || lng === null) {
      result.skipped.push(`${booklet}: "${name}" – no readable coordinates`);
      continue;
    }
    const hwnCell = hwnCol >= 0 ? /^\d{1,3}$/.exec(cells[hwnCol] ?? "") : null;
    result.rows.push({
      booklet,
      number: "",
      name,
      hwn: hwnCell ? Number(hwnCell[0]) : hwnFromName,
      lat,
      lng,
    });
  }
  return result;
}

const STOPWORDS = new Set(["", ",", "und", "sind", "die", "der", "das"]);

function nameOf(segment: string): string {
  const cut = coordinateStart(segment);
  const head = (cut >= 0 ? segment.slice(0, cut) : segment).trim();
  const quoted = /„([^“”"„]+)[“”"]/.exec(head);
  if (quoted) return quoted[1]!.trim();
  return (
    head
      .replace(/^Sonderstempel\s*/i, "")
      // leading lower-case fragments ("stelle Skywalk …" from "Sonderstempel-stelle")
      .replace(/^(?:[a-zäöüß-]+\s+)+/, "")
      .split(/\s*\(/)[0]!
      .split(" ")
      .slice(0, 6)
      .join(" ")
      .replace(/[\s,:;–-]+$/, "")
      .trim()
  );
}

interface Candidate {
  number: string;
  name: string;
  coordinate: ReturnType<typeof parseCoordinateText>;
}

/**
 * Parses the "Sonderstempel" page: entries "99xx Name …" followed by coordinates in one of several formats.
 * A number can appear several times (also in running text); the occurrence with coordinates wins,
 * otherwise the one with a plausible name.
 */
export function parseSonderstempelPage(html: string): ParseReport {
  const main = /<main[\s\S]*?<\/main>/i.exec(html)?.[0] ?? html;
  const text = htmlToText(main);
  const starts = [...text.matchAll(/(?:^|[\s(])(99\d\d)(?=[\s,)])/g)];
  const candidates = new Map<string, Candidate[]>();
  starts.forEach((match, i) => {
    const number = match[1]!;
    const begin = match.index! + match[0].length;
    const end = starts[i + 1]?.index ?? text.length;
    const head = text.slice(begin, Math.min(end, begin + 220));
    const list = candidates.get(number) ?? [];
    list.push({ number, name: nameOf(head), coordinate: parseCoordinateText(head) });
    candidates.set(number, list);
  });

  const result: ParseReport = { rows: [], skipped: [] };
  for (const [number, list] of candidates) {
    const withCoordinate = list.find((c) => c.coordinate && !STOPWORDS.has(c.name.toLowerCase()));
    const best =
      withCoordinate ??
      list.find((c) => c.name.length > 3 && !STOPWORDS.has(c.name.toLowerCase())) ??
      list[0]!;
    if (!best.coordinate) {
      result.skipped.push(`sonderstempel: ${number} "${best.name}" – no readable coordinates`);
      continue;
    }
    result.rows.push({ booklet: "sonderstempel", number, name: best.name, hwn: null, ...best.coordinate });
  }
  return result;
}
