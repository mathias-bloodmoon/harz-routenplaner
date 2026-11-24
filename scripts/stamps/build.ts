/**
 * Builds data/stamps.geojson from the official GPX download and data/raw/special-stamps.csv.
 * Usage: pnpm --filter scripts stamps:build
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { strFromU8, unzipSync } from "fflate";
import { fromCsv } from "./csv.js";
import { parseRegularGpx } from "./gpx.js";
import { mergeStamps } from "./merge.js";
import { OUTPUT, RAW_DIR, SPECIAL_CSV, USER_AGENT, ZIP_FILE, ZIP_SHA256, ZIP_URL } from "./paths.js";

const EXPECTED_REGULAR = 222;

async function loadZip(): Promise<Uint8Array> {
  if (!existsSync(ZIP_FILE)) {
    console.log(`Downloading ${ZIP_URL}`);
    const response = await fetch(ZIP_URL, { headers: { "User-Agent": USER_AGENT } });
    if (!response.ok) throw new Error(`Download failed: HTTP ${response.status}`);
    mkdirSync(RAW_DIR, { recursive: true });
    writeFileSync(ZIP_FILE, new Uint8Array(await response.arrayBuffer()));
  }
  const data = readFileSync(ZIP_FILE);
  const hash = createHash("sha256").update(data).digest("hex");
  if (hash !== ZIP_SHA256) {
    throw new Error(
      `Checksum mismatch for ${ZIP_FILE}: ${hash}. New version on the website? Review, then update ZIP_SHA256.`,
    );
  }
  return new Uint8Array(data);
}

const files = unzipSync(await loadZip());
const gpxName = Object.keys(files).find((name) => name.toLowerCase().endsWith(".gpx"));
if (!gpxName) throw new Error("No .gpx file in the ZIP archive");
const regular = parseRegularGpx(strFromU8(files[gpxName]!));

const special = existsSync(SPECIAL_CSV) ? fromCsv(readFileSync(SPECIAL_CSV, "utf8")) : [];
if (!special.length)
  console.warn(`No special stamps: ${SPECIAL_CSV} missing – run stamps:fetch-special first.`);

const { collection, warnings } = mergeStamps(regular, special);
writeFileSync(OUTPUT, JSON.stringify(collection) + "\n");

const perBooklet = new Map<string, number>();
for (const f of collection.features) {
  for (const b of f.properties.booklets) perBooklet.set(b, (perBooklet.get(b) ?? 0) + 1);
}
console.log(`Regular stamps: ${regular.length} (expected ${EXPECTED_REGULAR})`);
console.log(
  `Points on the map: ${collection.features.length}, of which special: ${collection.features.filter((f) => f.properties.special).length}`,
);
console.log(`Stamps per booklet: ${[...perBooklet].map(([b, n]) => `${b} ${n}`).join(", ")}`);
if (warnings.length) console.log(`Warnings:\n  ${warnings.join("\n  ")}`);
console.log(`Wrote ${OUTPUT}`);
if (regular.length !== EXPECTED_REGULAR) process.exit(2);
