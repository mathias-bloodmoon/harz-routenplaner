import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:4173";
// E2E_BASIC_AUTH="user:password" for a site behind the password protection (production smoke test)
const basicAuth = process.env.E2E_BASIC_AUTH;
const separator = basicAuth?.indexOf(":") ?? -1;
const httpCredentials =
  basicAuth && separator > 0
    ? { username: basicAuth.slice(0, separator), password: basicAuth.slice(separator + 1) }
    : undefined;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL, trace: "retain-on-failure", ...(httpCredentials ? { httpCredentials } : {}) },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    { name: "phone", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } } },
  ],
  // Without E2E_BASE_URL the tests run against `vite preview` of a fresh build.
  ...(process.env.E2E_BASE_URL
    ? {}
    : {
        webServer: {
          command: "pnpm build && pnpm preview",
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          env: { STAMPS_ENABLED: "true", STAMPS_FILE: "e2e/fixtures/stamps.geojson" },
        },
      }),
});
