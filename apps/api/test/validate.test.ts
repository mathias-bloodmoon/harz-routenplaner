import { describe, expect, it } from "vitest";
import * as web from "../../web/src/plan/area.js";
import { MAX_WAYPOINTS, PLANNING_AREA } from "../src/area.js";
import { validateRouteRequest } from "../src/validate.js";

const wp = (lat = 51.8, lng = 10.6) => ({ lat, lng });

describe("validateRouteRequest", () => {
  it("accepts 2–25 waypoints inside the area and rounds to 6 decimals", () => {
    expect(validateRouteRequest({ waypoints: [wp(51.81081234567, 10.5393), wp()] })).toEqual({
      ok: true,
      waypoints: [
        { lat: 51.810812, lng: 10.5393 },
        { lat: 51.8, lng: 10.6 },
      ],
    });
    expect(validateRouteRequest({ waypoints: Array.from({ length: MAX_WAYPOINTS }, () => wp()) }).ok).toBe(
      true,
    );
  });

  it.each([
    [null, "invalid-request"],
    [{}, "invalid-request"],
    [{ waypoints: "x" }, "invalid-request"],
    [{ waypoints: [wp()] }, "too-few-waypoints"],
    [{ waypoints: Array.from({ length: 26 }, () => wp()) }, "too-many-waypoints"],
    [{ waypoints: [wp(), { lat: "51", lng: 10 }] }, "invalid-request"],
    [{ waypoints: [wp(), { lat: 51.8 }] }, "invalid-request"],
    [{ waypoints: [wp(), null] }, "invalid-request"],
    [{ waypoints: [wp(), wp(52.52, 13.4)] }, "outside-area"],
  ])("rejects %j with %s", (body, error) => {
    expect(validateRouteRequest(body)).toMatchObject({ ok: false, error });
  });

  it("reports the index of the offending waypoint", () => {
    expect(validateRouteRequest({ waypoints: [wp(), wp(), wp(53, 10)] })).toEqual({
      ok: false,
      error: "outside-area",
      index: 2,
    });
  });

  it("uses the same planning area and limits as the web app", () => {
    expect(PLANNING_AREA).toEqual(web.PLANNING_AREA);
  });
});
