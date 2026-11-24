/**
 * One-time extraction of the special stamps from the companion booklet pages into data/raw/special-stamps.csv.
 * The CSV is meant to be reviewed (and corrected by hand) before `pnpm stamps:build`.
 * Usage: pnpm --filter scripts stamps:fetch-special [--force]
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { toCsv } from "./csv.js";
import { SOURCES, type SpecialRow } from "./model.js";
import { RAW_DIR, SPECIAL_CSV, USER_AGENT } from "./paths.js";
import { parseBookletTable, parseSonderstempelPage, type ParseReport } from "./special.js";

const TABLE_BOOKLETS = [
  "talsperren",
  "lutherweg",
  "karstwanderweg",
  "huy-fallstein",
  "burgen-schloesser",
  "klosterwanderweg",
] as const;

if (existsSync(SPECIAL_CSV) && !process.argv.includes("--force")) {
  console.error(`${SPECIAL_CSV} exists (may contain manual fixes). Use --force to overwrite.`);
  process.exit(1);
}

async function page(url: string): Promise<string> {
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.text();
}

const rows: SpecialRow[] = [];
const skipped: string[] = [];
const reports: [string, ParseReport][] = [];
for (const booklet of TABLE_BOOKLETS) {
  reports.push([booklet, parseBookletTable(await page(SOURCES[booklet]), booklet)]);
}
reports.push(["sonderstempel", parseSonderstempelPage(await page(SOURCES.sonderstempel))]);

for (const [booklet, report] of reports) {
  console.log(
    `${booklet.padEnd(20)} ${report.rows.length} stamps, ${report.skipped.length} without coordinates`,
  );
  rows.push(...report.rows);
  skipped.push(...report.skipped);
}

mkdirSync(RAW_DIR, { recursive: true });
writeFileSync(SPECIAL_CSV, toCsv(rows));
console.log(`\nWrote ${rows.length} rows to ${SPECIAL_CSV}`);
if (skipped.length) console.log(`\nNot included (no readable coordinates):\n  ${skipped.join("\n  ")}`);
