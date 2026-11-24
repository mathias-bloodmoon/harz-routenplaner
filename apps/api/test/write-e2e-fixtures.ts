/**
 * Writes API answers for the web E2E tests (apps/web/e2e/fixtures/route-*.json) from the recorded BRouter
 * fixtures, so the UI tests are deterministic. Run: pnpm --filter api exec tsx test/write-e2e-fixtures.ts
 */
import { writeFileSync } from "node:fs";
import { buildApp } from "../src/app.js";
import { BAD_HARZBURG, BROCKEN, ECKERTALSPERRE, recordedBrouter, TORFHAUS } from "./fixtures.js";

const app = await buildApp({ brouter: recordedBrouter(), config: { logLevel: "silent" } });
const tours = {
  "route-2wp": [TORFHAUS, BROCKEN],
  "route-3wp": [BAD_HARZBURG, ECKERTALSPERRE, TORFHAUS],
};
for (const [name, waypoints] of Object.entries(tours)) {
  const response = await app.inject({ method: "POST", url: "/api/route", payload: { waypoints } });
  const target = new URL(`../../web/e2e/fixtures/${name}.json`, import.meta.url);
  writeFileSync(target, JSON.stringify(response.json()) + "\n");
  console.log(`${name}: ${response.json().routes.length} routes`);
}
await app.close();
