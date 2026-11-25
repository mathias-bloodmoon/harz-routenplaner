import { describe, expect, it } from "vitest";
import { parseRuntimeConfig } from "./runtimeConfig";

describe("parseRuntimeConfig", () => {
  it("reads stamps flag and operator", () => {
    expect(
      parseRuntimeConfig({
        stampsEnabled: true,
        operator: { name: "M. N.", address: "Weg 1 | 37120 Bovenden|", email: "a@b.de" },
      }),
    ).toEqual({
      stampsEnabled: true,
      operator: { name: "M. N.", addressLines: ["Weg 1", "37120 Bovenden"], email: "a@b.de" },
    });
  });

  it.each([null, "x", { stampsEnabled: "true" }, { stampsEnabled: 1 }])("fails closed for %j", (data) => {
    expect(parseRuntimeConfig(data)).toEqual({
      stampsEnabled: false,
      operator: { name: "Mathias Nagel", addressLines: [], email: "" },
    });
  });
});
