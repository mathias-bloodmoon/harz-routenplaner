import { readFileSync } from "node:fs";
import { test as base } from "@playwright/test";

// 1×1 transparent PNG: tile requests are stubbed so tests do not load the public tile servers (fair use).
const EMPTY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

export const test = base.extend({
  page: async ({ page }, use) => {
    if (!process.env.E2E_REAL_TILES) {
      await page.route(/tile\.(opentopomap|waymarkedtrails)\.org/, (route) =>
        route.fulfill({ status: 200, contentType: "image/png", body: EMPTY_PNG }),
      );
    }
    // Start every test in German with an empty plan; reloads within a test keep their state.
    await page.addInitScript(() => {
      if (!sessionStorage.getItem("e2e-init")) {
        localStorage.clear();
        localStorage.setItem("harz-routenplaner:language", "de");
        sessionStorage.setItem("e2e-init", "1");
      }
    });
    await use(page);
  },
});

export { expect } from "@playwright/test";

export interface RouteFixture {
  routes: { id: string; kind: string }[];
  requested: number;
}

/** Recorded api answers (see infra/README.md "Test fixtures"). */
export function routeFixture(name: "route-2wp" | "route-3wp"): RouteFixture {
  return JSON.parse(
    readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), "utf8"),
  ) as RouteFixture;
}
