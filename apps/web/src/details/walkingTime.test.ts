import { describe, expect, it } from "vitest";
import { formatDuration, walkingTime } from "./walkingTime";

describe("walkingTime (DIN 33466)", () => {
  it("12 km, 600 m up, 600 m down at 4 km/h → 4 h 42 min", () => {
    // horizontal 3 h; vertical 600/300 + 600/500 = 3.2 h; total 3.2 + 3/2 = 4.7 h
    const time = walkingTime(12000, 600, 600, 4);
    expect(time.dinHours).toBeCloseTo(4.7, 10);
    expect(time.simpleHours).toBeCloseTo(3, 10);
    expect(formatDuration(time.dinHours)).toBe("4 h 42 min");
  });

  it("flat route: vertical part is 0, total equals distance ÷ speed", () => {
    expect(walkingTime(8000, 0, 0, 4).dinHours).toBeCloseTo(2, 10);
  });

  it("steep route: vertical time dominates", () => {
    // 3 km, 900 m up: horizontal 0.75 h, vertical 3 h → 3 + 0.375
    expect(walkingTime(3000, 900, 0, 4).dinHours).toBeCloseTo(3.375, 10);
  });

  it("depends on the speed", () => {
    expect(walkingTime(12000, 0, 0, 3).dinHours).toBeCloseTo(4, 10);
    expect(walkingTime(12000, 0, 0, 6).simpleHours).toBeCloseTo(2, 10);
  });
});

describe("formatDuration", () => {
  it.each([
    [0.75, "45 min"],
    [1, "1 h 00 min"],
    [2.508, "2 h 30 min"],
    [0.999, "1 h 00 min"],
  ])("%f h → %s", (hours, text) => {
    expect(formatDuration(hours)).toBe(text);
  });
});
