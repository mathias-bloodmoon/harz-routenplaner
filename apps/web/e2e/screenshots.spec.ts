import twoWaypoints from "./fixtures/route-2wp.json";
import { test } from "./fixtures";

// Produces the PR screenshots (1280 px and 390 px). Run with SCREENSHOTS=1 and E2E_REAL_TILES=1.
test.skip(!process.env.SCREENSHOTS, "screenshots only on demand");

for (const language of ["de", "en"] as const) {
  test(`screenshot ${language}`, async ({ page }, testInfo) => {
    await page.addInitScript((lang) => {
      localStorage.setItem("harz-routenplaner:language", lang);
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
    }, language);
    // recorded answer for Torfhaus → Brocken, so the screenshot does not depend on a running BRouter
    await page.route("**/api/route", (route) => route.fulfill({ json: twoWaypoints }));
    await page.goto("/");
    await page.locator("#route-calc").click();
    await page.locator(".route-card").first().waitFor();
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: `screenshots/${testInfo.project.name}-${language}.png` });
  });
}
