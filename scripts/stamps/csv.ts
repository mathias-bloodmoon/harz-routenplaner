import { BOOKLETS, type SpecialRow } from "./model.js";

const HEADER = ["booklet", "number", "name", "hwn", "lat", "lng"] as const;

function escape(value: string): string {
  return /[;"\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCsv(rows: SpecialRow[]): string {
  const lines = rows.map((r) =>
    [r.booklet, r.number, r.name, r.hwn ?? "", r.lat.toFixed(6), r.lng.toFixed(6)]
      .map((v) => escape(String(v)))
      .join(";"),
  );
  return [HEADER.join(";"), ...lines].join("\n") + "\n";
}

function splitLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else current += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ";") {
      cells.push(current);
      current = "";
    } else current += ch;
  }
  cells.push(current);
  return cells;
}

/** Reads special-stamps.csv; throws with the line number on invalid rows (the file is edited by hand). */
export function fromCsv(text: string): SpecialRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith("#"));
  const [header, ...body] = lines;
  if (header?.trim() !== HEADER.join(";"))
    throw new Error(`special-stamps.csv: header must be ${HEADER.join(";")}`);
  return body.map((line, i) => {
    const [booklet, number, name, hwn, lat, lng] = splitLine(line);
    const row = {
      booklet: booklet as SpecialRow["booklet"],
      number: number ?? "",
      name: (name ?? "").trim(),
      hwn: hwn ? Number(hwn) : null,
      lat: Number(lat),
      lng: Number(lng),
    };
    const ok =
      (BOOKLETS as readonly string[]).includes(row.booklet) &&
      row.booklet !== ("hwn" as string) &&
      row.name &&
      Number.isFinite(row.lat) &&
      Number.isFinite(row.lng) &&
      (row.hwn === null || Number.isInteger(row.hwn));
    if (!ok) throw new Error(`special-stamps.csv line ${i + 2}: invalid row: ${line}`);
    return row;
  });
}
