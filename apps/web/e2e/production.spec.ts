import { readFileSync } from "node:fs";
import { expect, test } from "./fixtures";

// Smoke test against the live site (deploy workflow): real api and BRouter, no stubs except map tiles.
// Run: E2E_BASE_URL=https://routing.pixelcenter.de PRODUCTION_SMOKE=1 pnpm e2e --grep @production
test.skip(!process.env.PRODUCTION_SMOKE, "production smoke test only on demand");

test("live site: map loads, route is calculated, GPX downloads @production", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "harz-routenplaner:plan",
      JSON.stringify({
        version: 1,
        speedKmh: 4,
        waypoints: [
          { lat: 51.8108, lng: 10.5393 },
          { lat: 51.7991, lng: 10.6156 },
        ],
      }),
    );
  });
  await page.goto("/");
  await expect(page.locator("#map.leaflet-container")).toBeVisible();
  await expect(page.locator(".leaflet-control-attribution")).toContainText("OpenStreetMap");
  await expect(page.locator("#wp-list > li")).toHaveCount(2);

  await page.locator("#route-calc").click();
  const cards = page.locator(".route-card");
  await expect(cards.first()).toBeVisible({ timeout: 30_000 });
  expect(await cards.count()).toBeGreaterThanOrEqual(2);
  await expect(page.locator(".stat.main dd")).toHaveText(/h \d{2} min/);

  await page.locator("#export-open").click();
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#export-download").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^harz-route-\d{4}-\d{2}-\d{2}\.gpx$/);
  const gpx = readFileSync((await download.path())!, "utf8");
  expect(gpx.match(/<trkpt /g)!.length).toBeGreaterThan(100);
});

test("live site: legal pages are reachable @production", async ({ page }) => {
  for (const [path, heading] of [
    ["/impressum", "Impressum"],
    ["/datenschutz", "Datenschutzerklärung"],
    ["/datenquellen", "Datenquellen und Lizenzen"],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
  }
});
