import { readFileSync } from "node:fs";
import { expect, routeFixture, test } from "./fixtures";

const twoWaypoints = routeFixture("route-2wp");

test("exports the selected route as GPX with Komoot instructions", async ({ page }) => {
  await page.route("**/api/route", (route) => route.fulfill({ json: twoWaypoints }));
  await page.goto("/");
  await page.locator("#map").click({ position: { x: 120, y: 120 } });
  await page.locator("#map").click({ position: { x: 220, y: 170 } });
  await page.locator("#route-calc").click();
  await page.locator(".route-card").nth(1).click();

  await page.getByRole("button", { name: "GPX exportieren" }).click();
  const dialog = page.getByRole("dialog", { name: "GPX-Datei für Komoot" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Geplante Touren");
  await expect(dialog).toContainText("„An bekannte Wege anpassen“");
  await expect(dialog.getByRole("button", { name: "Datei herunterladen" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  await page.getByRole("button", { name: "GPX exportieren" }).click();
  const downloadPromise = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Datei herunterladen" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^harz-route-\d{4}-\d{2}-\d{2}\.gpx$/);
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("status")).toContainText(`${download.suggestedFilename()} heruntergeladen`);

  const gpx = readFileSync((await download.path())!, "utf8");
  const selected = twoWaypoints.routes[1]!;
  expect(gpx).toMatch(
    /^<\?xml version="1.0" encoding="UTF-8"\?>\n<gpx version="1.1" creator="Harz Routenplaner"/,
  );
  expect(gpx.match(/<trkpt /g)).toHaveLength(selected.coordinates.length);
  expect(gpx).toContain("<name>Harz Routenplaner – Route 2</name>");
  expect(gpx).toMatch(/<desc>\d+,\d km · ↑ \d+ m · ↓ \d+ m · Gehzeit .+ \(DIN 33466, 4 km\/h\)<\/desc>/);
  expect(gpx.match(/<wpt /g)).toHaveLength(2);
});
