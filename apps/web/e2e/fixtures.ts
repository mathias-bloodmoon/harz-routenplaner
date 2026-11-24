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
    await use(page);
  },
});

export { expect } from "@playwright/test";
