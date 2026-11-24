import { describe, expect, it } from "vitest";
import { TtlCache } from "../src/cache.js";

describe("TtlCache", () => {
  it("expires entries after the TTL", () => {
    let now = 0;
    const cache = new TtlCache<number>(10, 1000, () => now);
    cache.set("a", 1);
    now = 999;
    expect(cache.get("a")).toBe(1);
    now = 1000;
    expect(cache.get("a")).toBeUndefined();
  });

  it("evicts the least recently used entry", () => {
    const cache = new TtlCache<number>(2, 60_000);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.get("a");
    cache.set("c", 3);
    expect([cache.get("a"), cache.get("b"), cache.get("c")]).toEqual([1, undefined, 3]);
    expect(cache.size).toBe(2);
  });
});
