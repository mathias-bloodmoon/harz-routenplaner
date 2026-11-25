import { expect, test } from "./fixtures";

test("legal pages are linked, bilingual and show the operator from the runtime config", async ({ page }) => {
  await page.route("**/config.json", (route) =>
    route.fulfill({
      json: {
        stampsEnabled: true,
        operator: { name: "Mathias Nagel", address: "Musterweg 1|37120 Bovenden", email: "test@example.org" },
      },
    }),
  );
  await page.goto("/");
  await page.getByRole("link", { name: "Impressum" }).click();
  await expect(page).toHaveURL(/\/impressum$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Impressum");
  await expect(page.locator("address").first()).toContainText("Musterweg 1");
  await expect(page.locator("address").first()).toContainText("37120 Bovenden");
  await expect(page.getByRole("link", { name: "test@example.org" })).toBeVisible();

  await page.getByRole("button", { name: "Switch to English" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Legal notice (Impressum)");

  await page.goto("/datenschutz");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Privacy policy");
  await expect(page.getByText("No cookies, no tracking")).toBeVisible();

  await page.goto("/datenquellen");
  await expect(page.getByText("Stamp points: © Aktionsgemeinschaft Harzer Wandernadel")).toBeVisible();
  await page.getByRole("link", { name: "Back to the map" }).click();
  await expect(page.locator("#map.leaflet-container")).toBeVisible();
});

test("without an address the imprint says it will follow", async ({ page }) => {
  await page.route("**/config.json", (route) =>
    route.fulfill({ json: { stampsEnabled: false, operator: {} } }),
  );
  await page.goto("/impressum");
  await expect(page.locator("address").first()).toContainText(
    "Mathias Nagel (privater Betreiber, nicht kommerziell)",
  );
  await expect(page.locator("address").first()).toContainText("Die Anschrift wird in Kürze nachgetragen");
});
