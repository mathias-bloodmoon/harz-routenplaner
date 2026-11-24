import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import {
  BAD_HARZBURG,
  BROCKEN,
  ECKERTALSPERRE,
  recordedBrouter,
  TORFHAUS,
  unavailableBrouter,
} from "./fixtures.js";

const post = (app: Awaited<ReturnType<typeof buildApp>>, body: unknown, ip = "203.0.113.1") =>
  app.inject({ method: "POST", url: "/api/route", payload: body as object, remoteAddress: ip });

describe("POST /api/route", () => {
  it("returns 2–3 distinct engine alternatives for 2 waypoints (Torfhaus → Brocken)", async () => {
    const app = await buildApp({ brouter: recordedBrouter(), config: { logLevel: "silent" } });
    const response = await post(app, { waypoints: [TORFHAUS, BROCKEN] });
    expect(response.statusCode).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    const body = response.json();
    expect(body.requested).toBe(3);
    expect(body.routes.length).toBeGreaterThanOrEqual(2);
    expect(body.routes.length).toBeLessThanOrEqual(3);
    for (const route of body.routes) {
      expect(route.kind).toBe("alternative");
      expect(route.distanceM).toBeGreaterThan(8000);
      expect(route.distanceM).toBeLessThan(14000);
      expect(route.coordinates[0]).toHaveLength(3);
    }
  });

  it("returns one route per profile for 3+ waypoints (Bad Harzburg → Eckertalsperre → Torfhaus)", async () => {
    const app = await buildApp({ brouter: recordedBrouter(), config: { logLevel: "silent" } });
    const body = (await post(app, { waypoints: [BAD_HARZBURG, ECKERTALSPERRE, TORFHAUS] })).json();
    expect(body.routes.map((r: { kind: string }) => r.kind)).toEqual(["shortest", "trails", "gentle"]);
    const [shortest, trails] = body.routes;
    expect(shortest.distanceM).toBeLessThan(trails.distanceM);
  });

  it("serves repeated requests from the cache", async () => {
    const brouter = recordedBrouter();
    const app = await buildApp({ brouter, config: { logLevel: "silent" } });
    expect((await post(app, { waypoints: [TORFHAUS, BROCKEN] })).json().cached).toBe(false);
    expect((await post(app, { waypoints: [TORFHAUS, BROCKEN] })).json().cached).toBe(true);
    expect(brouter.calls).toBe(3);
  });

  it.each([
    [{ waypoints: [TORFHAUS] }, "too-few-waypoints"],
    [{ waypoints: Array.from({ length: 26 }, () => TORFHAUS) }, "too-many-waypoints"],
    [{ waypoints: [TORFHAUS, { lat: 52.52, lng: 13.4 }] }, "outside-area"],
    [{ nope: true }, "invalid-request"],
  ])("rejects %j with 400 %s", async (body, error) => {
    const app = await buildApp({ brouter: recordedBrouter(), config: { logLevel: "silent" } });
    const response = await post(app, body);
    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe(error);
  });

  it("answers 503 routing-unavailable when BRouter is down", async () => {
    const app = await buildApp({ brouter: unavailableBrouter, config: { logLevel: "silent" } });
    const response = await post(app, { waypoints: [TORFHAUS, BROCKEN] });
    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ error: "routing-unavailable" });
  });

  it("answers 422 no-route when BRouter finds nothing", async () => {
    const app = await buildApp({ brouter: recordedBrouter(), config: { logLevel: "silent" } });
    const response = await post(app, { waypoints: [TORFHAUS, ECKERTALSPERRE] });
    expect(response.statusCode).toBe(422);
    expect(response.json()).toEqual({ error: "no-route" });
  });

  it("rate-limits per IP", async () => {
    const app = await buildApp({
      brouter: recordedBrouter(),
      config: { logLevel: "silent", rateLimitPerMinute: 2 },
    });
    const body = { waypoints: [TORFHAUS, BROCKEN] };
    expect((await post(app, body, "198.51.100.7")).statusCode).toBe(200);
    expect((await post(app, body, "198.51.100.7")).statusCode).toBe(200);
    const limited = await post(app, body, "198.51.100.7");
    expect(limited.statusCode).toBe(429);
    expect(limited.json().error).toBe("rate-limited");
    expect((await post(app, body, "198.51.100.8")).statusCode).toBe(200);
  });
});
