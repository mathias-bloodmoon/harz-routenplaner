import { test } from "./fixtures";

// Produces the PR screenshots (1280 px and 390 px). Run with SCREENSHOTS=1 and E2E_REAL_TILES=1.
test.skip(!process.env.SCREENSHOTS, "screenshots only on demand");

for (const language of ["de", "en"] as const) {
  test(`screenshot ${language}`, async ({ page }, testInfo) => {
    await page.addInitScript((lang) => localStorage.setItem("harz-routenplaner:language", lang), language);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: `screenshots/${testInfo.project.name}-${language}.png` });
  });
}
