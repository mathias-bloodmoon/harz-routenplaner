import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

const stampMarkers = (page: Page) => page.locator(".stamp-marker");
const waypointItems = (page: Page) => page.locator("#wp-list > li");

/** Clicks the map at a position relative to the top-left corner of the visible map area. */
async function clickMap(page: Page, x: number, y: number) {
  await page.locator("#map").click({ position: { x, y } });
}

test("shows stamp points with popup, booklet filter and layer toggle", async ({ page }) => {
  await page.goto("/");
  await expect(stampMarkers(page)).toHaveCount(5);
  await expect(page.locator(".leaflet-control-attribution")).toContainText("Harzer Wandernadel");

  await page.getByRole("button", { name: "Stempelstelle 2: Teststempel Nordost & Hütte" }).click();
  const popup = page.locator(".leaflet-popup");
  await expect(popup).toContainText("Teststempel Nordost & Hütte");
  await expect(popup).toContainText("Harzer Wandernadel (222 Stempel)");
  await expect(popup.getByRole("link", { name: "Mehr auf harzer-wandernadel.de" })).toHaveAttribute(
    "href",
    "https://www.harzer-wandernadel.de/",
  );
  await page.keyboard.press("Escape");

  const filter = page.getByRole("group", { name: "Stempelhefte" });
  await expect(filter.getByRole("checkbox")).toHaveCount(3);
  await filter.getByRole("checkbox", { name: /Harzer Wandernadel/ }).uncheck();
  // stamp 1 is also in the Talsperren booklet, TS1 and 9901 are special stamps
  await expect(stampMarkers(page)).toHaveCount(3);
  await filter.getByRole("checkbox", { name: /Sonderstempel/ }).uncheck();
  await expect(stampMarkers(page)).toHaveCount(2);

  await page.getByRole("checkbox", { name: "Stempelstellen der Harzer Wandernadel anzeigen" }).uncheck();
  await expect(stampMarkers(page)).toHaveCount(0);
  await expect(page.locator(".leaflet-control-attribution")).not.toContainText("Harzer Wandernadel");
  await expect(filter).toBeDisabled();
});

test("adds, reorders, drags and deletes waypoints; the plan survives a reload", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Klicke auf die Karte oder auf eine Stempelstelle")).toBeVisible();

  await clickMap(page, 120, 120);
  await clickMap(page, 200, 160);
  await expect(waypointItems(page)).toHaveCount(2);
  await expect(page.locator("#wp-count")).toHaveText("2 von 25");
  await expect(page.locator(".wp-marker")).toHaveCount(2);

  // stamp as waypoint: snaps to the stamp and uses its name
  await page.getByRole("button", { name: "Stempelstelle 1: Teststempel Nordwest" }).click();
  await page.getByRole("button", { name: "Als Wegpunkt hinzufügen" }).click();
  await expect(waypointItems(page)).toHaveCount(3);
  await expect(waypointItems(page).nth(2)).toContainText("1 Teststempel Nordwest");
  await expect(page.getByRole("status")).toContainText("Wegpunkt C hinzugefügt: 1 Teststempel Nordwest");

  // keyboard reorder: move C up twice → first
  const firstName = await waypointItems(page).nth(0).locator(".wp-name").innerText();
  await waypointItems(page).nth(2).locator('[data-action="up"]').focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await expect(waypointItems(page).nth(0)).toContainText("Teststempel Nordwest");
  await expect(waypointItems(page).nth(1)).toContainText(firstName.replace(/^A: /, ""));

  // drag the second marker; it gets new coordinates
  const before = await waypointItems(page).nth(1).locator(".wp-name").innerText();
  const marker = page.locator(".wp-marker").nth(1);
  const box = (await marker.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 60, box.y + 40, { steps: 8 });
  await page.mouse.up();
  await expect(waypointItems(page).nth(1).locator(".wp-name")).not.toHaveText(before);
  await expect(page.getByRole("status")).toContainText("Wegpunkt B verschoben");

  await page.reload();
  await expect(waypointItems(page)).toHaveCount(3);
  await expect(waypointItems(page).nth(0)).toContainText("Teststempel Nordwest");

  await page.getByRole("button", { name: "Umkehren" }).click();
  await expect(waypointItems(page).nth(2)).toContainText("Teststempel Nordwest");

  await waypointItems(page)
    .nth(2)
    .getByRole("button", { name: /entfernen$/ })
    .click();
  await expect(waypointItems(page)).toHaveCount(2);
  await page.getByRole("button", { name: "Alle löschen" }).click();
  await expect(waypointItems(page)).toHaveCount(0);
  await page.reload();
  await expect(waypointItems(page)).toHaveCount(0);
});

test("clicking the map to close a popup does not add a waypoint", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Stempelstelle 2: Teststempel Nordost & Hütte" }).click();
  await expect(page.locator(".leaflet-popup")).toBeVisible();
  await clickMap(page, 60, 300);
  await expect(page.locator(".leaflet-popup")).toHaveCount(0);
  await expect(waypointItems(page)).toHaveCount(0);
});

test("waypoint texts follow the language toggle", async ({ page }) => {
  await page.goto("/");
  await clickMap(page, 120, 120);
  await page.getByRole("button", { name: "Switch to English" }).click();
  await expect(page.locator("#wp-count")).toHaveText("1 of 25");
  await expect(page.getByText("A route needs at least 2 waypoints.")).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Waypoint A added");
  await expect(page.getByRole("group", { name: "Stamp booklets" })).toBeVisible();
});

test("stamp layer is hidden when disabled by configuration", async ({ page }) => {
  await page.route("**/config.json", (route) => route.fulfill({ json: { stampsEnabled: false } }));
  await page.goto("/");
  await expect(page.locator("#map.leaflet-container")).toBeVisible();
  await expect(page.locator("#stamps-section")).toBeHidden();
  await expect(stampMarkers(page)).toHaveCount(0);
  await expect(page.locator(".leaflet-control-attribution")).not.toContainText("Harzer Wandernadel");
});
