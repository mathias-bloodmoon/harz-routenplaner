import { describe, expect, it } from "vitest";
import {
  addWaypoint,
  displayName,
  labelFor,
  MAX_WAYPOINTS,
  moveWaypoint,
  removeWaypoint,
  reorderWaypoint,
  reverseWaypoints,
  type Waypoint,
} from "./waypoints";

const wp = (id: string, lat = 51.8, lng = 10.6): Waypoint => ({ id, lat, lng });
const ids = (list: Waypoint[]) => list.map((w) => w.id);

describe("addWaypoint", () => {
  it("appends inside the area", () => {
    const result = addWaypoint([wp("a")], wp("b"));
    expect(result.ok && ids(result.waypoints)).toEqual(["a", "b"]);
  });

  it("rejects points outside the area", () => {
    expect(addWaypoint([], wp("x", 52.52, 13.4))).toEqual({ ok: false, error: "outside-area" });
  });

  it(`rejects more than ${MAX_WAYPOINTS} waypoints`, () => {
    const full = Array.from({ length: MAX_WAYPOINTS }, (_, i) => wp(`w${i}`));
    expect(addWaypoint(full, wp("extra"))).toEqual({ ok: false, error: "too-many" });
  });
});

describe("moveWaypoint", () => {
  it("moves and drops the stamp snap", () => {
    const list: Waypoint[] = [{ id: "a", lat: 51.8, lng: 10.6, name: "Brocken", stampNumber: "HWN009" }];
    const result = moveWaypoint(list, "a", { lat: 51.7, lng: 10.5 });
    expect(result).toEqual({ ok: true, waypoints: [{ id: "a", lat: 51.7, lng: 10.5 }] });
  });

  it("refuses to move outside the area", () => {
    expect(moveWaypoint([wp("a")], "a", { lat: 53, lng: 10 })).toEqual({ ok: false, error: "outside-area" });
  });
});

describe("reorder, remove, reverse", () => {
  const list = [wp("a"), wp("b"), wp("c"), wp("d")];

  it("moves an item down and up", () => {
    expect(ids(reorderWaypoint(list, 0, 2))).toEqual(["b", "c", "a", "d"]);
    expect(ids(reorderWaypoint(list, 3, 0))).toEqual(["d", "a", "b", "c"]);
  });

  it("clamps the target and ignores invalid sources", () => {
    expect(ids(reorderWaypoint(list, 1, 99))).toEqual(["a", "c", "d", "b"]);
    expect(ids(reorderWaypoint(list, 1, -5))).toEqual(["b", "a", "c", "d"]);
    expect(ids(reorderWaypoint(list, 7, 0))).toEqual(["a", "b", "c", "d"]);
  });

  it("removes by id", () => {
    expect(ids(removeWaypoint(list, "b"))).toEqual(["a", "c", "d"]);
  });

  it("reverses without mutating the input", () => {
    expect(ids(reverseWaypoints(list))).toEqual(["d", "c", "b", "a"]);
    expect(ids(list)).toEqual(["a", "b", "c", "d"]);
  });
});

describe("labels and names", () => {
  it("labels A to Y", () => {
    expect(labelFor(0)).toBe("A");
    expect(labelFor(24)).toBe("Y");
  });

  it("shows the stamp name or coordinates", () => {
    expect(displayName({ id: "a", lat: 51.8, lng: 10.6, name: "Brocken", stampNumber: "9" })).toBe(
      "9 Brocken",
    );
    expect(displayName({ id: "a", lat: 51.799123, lng: 10.615678 })).toBe("51.79912, 10.61568");
  });
});
