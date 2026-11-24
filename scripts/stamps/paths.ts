import { fileURLToPath } from "node:url";

export const DATA_DIR = fileURLToPath(new URL("../../data/", import.meta.url));
export const RAW_DIR = `${DATA_DIR}raw/`;
export const ZIP_FILE = `${RAW_DIR}hwn-gpx-2025-04-23.zip`;
export const SPECIAL_CSV = `${RAW_DIR}special-stamps.csv`;
export const OUTPUT = `${DATA_DIR}stamps.geojson`;

/** Official download, status 23.04.2025 (https://www.harzer-wandernadel.de/stempelstellen/gps-download/). */
export const ZIP_URL =
  "https://www.harzer-wandernadel.de/wp-content/uploads/2025/05/GPX-Daten-Stempelstellen-ZIP-Archiv-gepackt-Stand-23.04.2025.zip";
export const ZIP_SHA256 = "811b2fa202acbdc6572eafb1f6291a5b5495ac560d42a36cd4c333b63c867cb0";

export const USER_AGENT =
  "harz-routenplaner stamp converter (one-time download; github.com/mathias-bloodmoon/harz-routenplaner)";
