import { expect, test } from "./fixtures";

test("shows the Harz map with attribution", async ({ page }) => {
  const tileRequest = page.waitForRequest(/tile\.opentopomap\.org\/\d+\/\d+\/\d+\.png/);
  await page.goto("/");
  await expect(page.locator("#map.leaflet-container")).toBeVisible();
  await tileRequest;
  const attribution = page.locator(".leaflet-control-attribution");
  await expect(attribution).toContainText("OpenStreetMap");
  await expect(attribution).toContainText("OpenTopoMap");
  await expect(attribution).toContainText("Waymarked Trails");
  // zoom 10 tiles around the Harz centre
  await expect(page.locator(".tiles-topo img").first()).toHaveAttribute("src", /\/10\/5\d\d\/3\d\d\.png/);
});

test("language toggle switches texts and is remembered", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  await expect(page.getByText("Plane deine Wanderung im Harz")).toBeVisible();
  await expect(page.locator(".leaflet-control-attribution")).toContainText("Kartendaten");

  await page.getByRole("button", { name: "Switch to English" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByText("Plan your hike in the Harz")).toBeVisible();
  await expect(page.locator(".leaflet-control-attribution")).toContainText("Map data");
  await expect(page.getByRole("button", { name: "Zoom in" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Auf Deutsch umschalten" })).toHaveText("DE");

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByText("Plan your hike in the Harz")).toBeVisible();

  await page.getByRole("button", { name: "Auf Deutsch umschalten" }).click();
  await expect(page.getByRole("button", { name: "Hineinzoomen" })).toBeVisible();
});

test("side panel collapses and expands with the keyboard", async ({ page }) => {
  await page.goto("/");
  const toggle = page.locator("#panel-toggle");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#panel-body")).toBeHidden();
  await page.keyboard.press("Space");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#panel-body")).toBeVisible();
});

test("buttons have touch targets of at least 44 px", async ({ page }) => {
  await page.goto("/");
  for (const id of ["#panel-toggle", "#lang-toggle"]) {
    const box = await page.locator(id).boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
});
