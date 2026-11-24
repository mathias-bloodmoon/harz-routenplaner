import { describe, expect, it } from "vitest";
import twoWaypoints from "../../e2e/fixtures/route-2wp.json";
import { parseRouteResponse } from "./api";
import { formatDistance, formatMeters } from "./format";

describe("parseRouteResponse", () => {
  it("reads the api answer (recorded Torfhaus → Brocken)", () => {
    const parsed = parseRouteResponse(200, twoWaypoints);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.result.routes.length).toBeGreaterThanOrEqual(2);
    expect(parsed.result.routes[0]).toMatchObject({ kind: "alternative", number: 1 });
  });

  it("drops malformed routes and reports no-route when nothing is left", () => {
    const parsed = parseRouteResponse(200, {
      routes: [
        {
          id: "x",
          kind: "bogus",
          coordinates: [
            [10, 51],
            [10.1, 51],
          ],
        },
        { id: "y", kind: "trails", coordinates: [[10, 51]] },
        {
          id: "z",
          kind: "trails",
          coordinates: [
            ["a", 51],
            [10, 51],
          ],
        },
      ],
    });
    expect(parsed).toEqual({ ok: false, error: "no-route" });
  });

  it.each([
    [400, { error: "outside-area" }, { ok: false, error: "outside-area" }],
    [
      429,
      { error: "rate-limited", retryAfterSeconds: 42 },
      { ok: false, error: "rate-limited", retryAfterSeconds: 42 },
    ],
    [429, null, { ok: false, error: "rate-limited" }],
    [502, "<html>Bad Gateway</html>", { ok: false, error: "routing-unavailable" }],
    [400, { error: "something-new" }, { ok: false, error: "routing-unavailable" }],
  ])("maps HTTP %i %j", (status, body, expected) => {
    expect(parseRouteResponse(status, body)).toEqual(expected);
  });
});

describe("formatting", () => {
  it("formats distances per language", () => {
    expect(formatDistance(10216, "de")).toBe("10,2 km");
    expect(formatDistance(10216, "en")).toBe("10.2 km");
    expect(formatDistance(850, "de")).toBe("850 m");
  });

  it("formats metres with thousands separators", () => {
    expect(formatMeters(1234.4, "de")).toBe("1.234 m");
    expect(formatMeters(1234.4, "en")).toBe("1,234 m");
  });
});
