import type { Page } from "@playwright/test";
import { expect, routeFixture, test } from "./fixtures";

const twoWaypoints = routeFixture("route-2wp");

async function showRoutes(page: Page) {
  await page.route("**/api/route", (route) => route.fulfill({ json: twoWaypoints }));
  await page.goto("/");
  await page.locator("#map").click({ position: { x: 120, y: 120 } });
  await page.locator("#map").click({ position: { x: 220, y: 170 } });
  await page.locator("#route-calc").click();
  await expect(page.locator(".route-card")).not.toHaveCount(0);
}

const stat = (page: Page, label: string) =>
  page
    .locator(".stat")
    .filter({ has: page.locator("dt", { hasText: label }) })
    .locator("dd");

test("shows stats, DIN 33466 walking time and the elevation chart for the selected route", async ({
  page,
}) => {
  await showRoutes(page);
  await expect(page.getByRole("heading", { name: "Details" })).toBeVisible();
  await expect(stat(page, "Gehzeit (DIN 33466)")).toHaveText(/^\d+ h \d{2} min$|^\d+ min$/);
  await expect(stat(page, "Ohne Höhenmeter")).toHaveText(/min$/);
  await expect(stat(page, "Länge")).toHaveText(/^\d+,\d km$/);
  await expect(stat(page, "Aufstieg")).toHaveText(/^\d[\d.]* m$/);
  await expect(stat(page, "Höchster Punkt")).toHaveText(/^1\.1\d\d m$/); // Brocken summit ≈ 1,141 m
  await expect(page.locator("#elevation-chart canvas")).toBeVisible();
  await expect(page.locator("#elevation-chart")).toHaveAttribute(
    "aria-label",
    /Höhenprofil der ausgewählten Route/,
  );

  // the card shows the same length and ascent as the details
  const card = page.locator(".route-card[aria-pressed=true]");
  await expect(card).toContainText((await stat(page, "Länge").innerText()).trim());
  await expect(card).toContainText((await stat(page, "Aufstieg").innerText()).trim());
});

test("values update immediately when the speed or the selected route changes; speed is remembered", async ({
  page,
}) => {
  await showRoutes(page);
  const din = stat(page, "Gehzeit (DIN 33466)");
  const simple = stat(page, "Ohne Höhenmeter");
  const before = await din.innerText();
  const simpleBefore = await simple.innerText();

  await page.getByLabel("Tempo in km/h").fill("2");
  await expect(simple).not.toHaveText(simpleBefore);
  await expect(din).not.toHaveText(before);

  const length = await stat(page, "Länge").innerText();
  await page.locator(".route-card").nth(1).click();
  await expect(stat(page, "Länge")).not.toHaveText(length);

  await page.getByLabel("Tempo in km/h").fill("99");
  await expect(page.getByLabel("Tempo in km/h")).toHaveAttribute("aria-invalid", "true");

  await page.reload();
  await expect(page.getByLabel("Tempo in km/h")).toHaveValue("2");
});

test("chart hover shows the position on the map and map hover moves the chart cursor", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "hover needs a mouse");
  await showRoutes(page);
  const chart = page.locator("#elevation-chart .u-over");
  const box = (await chart.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.locator(".hover-marker")).toBeVisible();

  await page.mouse.move(5, 5);
  // middle of the selected route line in screen coordinates
  const point = await page.locator(".route-line.selected").evaluate((el) => {
    const path = el as SVGPathElement;
    const p = path.getPointAtLength(path.getTotalLength() * 0.3);
    const m = path.getScreenCTM()!;
    return { x: p.x * m.a + m.e, y: p.y * m.d + m.f };
  });
  await page.mouse.move(point.x, point.y);
  await expect(page.locator(".hover-marker")).toBeVisible();
  const cursor = await page.locator("#elevation-chart .u-cursor-x").boundingBox();
  expect(cursor!.x).toBeGreaterThan(box.x);
  expect(cursor!.x).toBeLessThan(box.x + box.width);
});

test("chart is readable on a phone", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "phone", "phone layout");
  await showRoutes(page);
  const canvas = page.locator("#elevation-chart canvas");
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(260);
  expect(box.width).toBeLessThanOrEqual(390);
  expect(box.height).toBeGreaterThanOrEqual(150);
});

test("lists stamp points near the route", async ({ page }) => {
  // a synthetic stamp right on the first route
  const route = twoWaypoints.routes[0]!;
  const [sLng, sLat] = route.coordinates[Math.floor(route.coordinates.length / 2)]!;
  await page.route("**/data/stamps.geojson", (r) =>
    r.fulfill({
      json: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: { type: "Point", coordinates: [sLng, sLat] },
            properties: {
              number: "77",
              name: "Stempel am Weg",
              booklet: "hwn",
              booklets: ["hwn"],
              special: false,
              source: "",
            },
          },
        ],
      },
    }),
  );
  await showRoutes(page);
  await expect(page.locator("#route-stamps")).toContainText("77 Stempel am Weg");
  await expect(page.locator("#route-stamps")).toContainText(/bei \d+,\d km/);
});
