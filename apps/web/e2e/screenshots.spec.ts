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
            { lat: 51.86, lng: 10.45, name: "Teststempel Nordwest", stampNumber: "1" },
            { lat: 51.8, lng: 10.62 },
            { lat: 51.92, lng: 10.62, name: "Test-Sonderstempel", stampNumber: "9901" },
          ],
        }),
      );
    }, language);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: `screenshots/${testInfo.project.name}-${language}.png` });
  });
}
