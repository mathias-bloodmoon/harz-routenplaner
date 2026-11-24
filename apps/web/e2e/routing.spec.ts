import type { Page, Route as PlaywrightRoute } from "@playwright/test";
import { expect, routeFixture, test } from "./fixtures";

const twoWaypoints = routeFixture("route-2wp");
const threeWaypoints = routeFixture("route-3wp");

// The UI tests use recorded api answers (deterministic). The real api + BRouter are tested in CI by
// the "Routing integration" step and in apps/api/test.
const cards = (page: Page) => page.locator(".route-card");
const calc = (page: Page) => page.locator("#route-calc");

function stubRoute(page: Page, body: unknown, status = 200, delayMs = 0) {
  return page.route("**/api/route", async (route: PlaywrightRoute) => {
    if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
    await route.fulfill({ status, json: body });
  });
}

async function addWaypoints(page: Page, count: number) {
  const points: [number, number][] = [
    [120, 120],
    [220, 170],
    [160, 230],
  ];
  for (const [x, y] of points.slice(0, count)) await page.locator("#map").click({ position: { x, y } });
  await expect(page.locator("#wp-list > li")).toHaveCount(count);
}

test("calculates 2–3 alternatives for two waypoints; card and line select a route", async ({ page }) => {
  await stubRoute(page, twoWaypoints, 200, 300);
  await page.goto("/");
  await expect(calc(page)).toBeDisabled();
  await addWaypoints(page, 2);
  await expect(calc(page)).toBeEnabled();

  await calc(page).click();
  await expect(calc(page)).toHaveText("Berechne Routen …");
  await expect(calc(page)).toBeDisabled();

  await expect(cards(page)).toHaveCount(twoWaypoints.routes.length);
  await expect(calc(page)).toHaveText("Routen berechnen");
  await expect(cards(page).first()).toHaveAttribute("aria-pressed", "true");
  await expect(cards(page).first()).toContainText("Route 1");
  await expect(cards(page).first()).toContainText(/\d+,\d km/);
  await expect(page.locator(".route-line")).toHaveCount(twoWaypoints.routes.length);
  await expect(page.locator(".route-line.selected")).toHaveCount(1);
  await expect(page.getByText("Bitte Beschilderung vor Ort beachten")).toBeVisible();

  await cards(page).nth(1).click();
  await expect(cards(page).nth(1)).toHaveAttribute("aria-pressed", "true");
  await expect(cards(page).first()).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator(".route-line.selected")).toHaveAttribute(
    "data-route-id",
    twoWaypoints.routes[1]!.id,
  );

  const third = twoWaypoints.routes[2]!.id;
  await page.locator(`.route-line[data-route-id="${third}"]`).dispatchEvent("click");
  await expect(page.locator(`.route-card[data-route-id="${third}"]`)).toHaveAttribute("aria-pressed", "true");
  // a click on a line does not add a waypoint
  await expect(page.locator("#wp-list > li")).toHaveCount(2);
});

test("names the profile routes for three or more waypoints", async ({ page }) => {
  await stubRoute(page, threeWaypoints);
  await page.goto("/");
  await addWaypoints(page, 3);
  await calc(page).click();
  await expect(cards(page).locator(".route-name")).toHaveText(["Kürzeste", "Wanderwege", "Sanft"]);
  await page.getByRole("button", { name: "Switch to English" }).click();
  await expect(cards(page).locator(".route-name")).toHaveText(["Shortest", "Trail-friendly", "Gentle"]);
  await expect(calc(page)).toHaveText("Calculate routes");
});

test("says honestly when fewer than 3 distinct routes were found", async ({ page }) => {
  await stubRoute(page, { ...twoWaypoints, routes: twoWaypoints.routes.slice(0, 2) });
  await page.goto("/");
  await addWaypoints(page, 2);
  await calc(page).click();
  await expect(cards(page)).toHaveCount(2);
  await expect(page.getByText("Nur 2 unterschiedliche Routen gefunden.")).toBeVisible();
});

test("changing the waypoints removes the old routes", async ({ page }) => {
  await stubRoute(page, twoWaypoints);
  await page.goto("/");
  await addWaypoints(page, 2);
  await calc(page).click();
  await expect(cards(page)).not.toHaveCount(0);
  await page.getByRole("button", { name: "Umkehren" }).click();
  await expect(cards(page)).toHaveCount(0);
  await expect(page.locator("#routes-section")).toBeHidden();
  await expect(page.locator(".route-line")).toHaveCount(0);
});

for (const [status, body, message] of [
  [503, { error: "routing-unavailable" }, "Die Routenberechnung ist gerade nicht erreichbar"],
  [422, { error: "no-route" }, "Für diese Wegpunkte wurde keine Route gefunden"],
  [400, { error: "outside-area" }, "außerhalb des Planungsgebiets"],
  [429, { error: "rate-limited", retryAfterSeconds: 37 }, "Bitte warte 37 Sekunden"],
] as const) {
  test(`shows a clear message for ${body.error}`, async ({ page }) => {
    await stubRoute(page, body, status);
    await page.goto("/");
    await addWaypoints(page, 2);
    await calc(page).click();
    await expect(page.getByRole("status")).toContainText(message);
    await expect(page.getByRole("status")).toHaveClass(/is-error/);
    await expect(calc(page)).toBeEnabled();
    await expect(cards(page)).toHaveCount(0);
  });
}
