import { describe, expect, it } from "vitest";
import de from "./de.json";
import en from "./en.json";
import { resolveInitialLanguage, translate } from "./index";

describe("translation files", () => {
  it("have the same keys", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(de).sort());
  });

  it("have no empty values", () => {
    for (const dict of [de, en]) {
      for (const value of Object.values(dict)) expect(value.trim()).not.toBe("");
    }
  });
});

describe("resolveInitialLanguage", () => {
  it("prefers a valid stored language", () => {
    expect(resolveInitialLanguage("en", ["de-DE"])).toBe("en");
  });

  it("ignores an invalid stored value and uses the browser language", () => {
    expect(resolveInitialLanguage("fr", ["en-GB", "de"])).toBe("en");
  });

  it("skips unsupported browser languages", () => {
    expect(resolveInitialLanguage(null, ["fr-FR", "EN-us"])).toBe("en");
  });

  it("falls back to German", () => {
    expect(resolveInitialLanguage(null, ["fr", "nl"])).toBe("de");
    expect(resolveInitialLanguage(null, [])).toBe("de");
  });
});

describe("translate", () => {
  it("returns the text in the requested language", () => {
    expect(translate("de", "map.zoomIn")).toBe("Hineinzoomen");
    expect(translate("en", "map.zoomIn")).toBe("Zoom in");
  });
});

describe("format", () => {
  it("replaces placeholders and keeps unknown ones", async () => {
    const { format, t } = await import("./index");
    expect(format("{count} von {max}", { count: 3, max: 25 })).toBe("3 von 25");
    expect(format("{a} {b}", { a: "x" })).toBe("x {b}");
    expect(t("en", "waypoints.count", { count: 1, max: 25 })).toBe("1 of 25");
  });

  it("uses the same placeholders in both languages", () => {
    const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const key of Object.keys(de) as (keyof typeof de)[]) {
      expect(placeholders(en[key]), key).toEqual(placeholders(de[key]));
    }
  });
});
