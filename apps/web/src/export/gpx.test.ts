import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateXML } from "xmllint-wasm";
import { buildGpx, escapeXml, gpxFileName, type GpxInput } from "./gpx";

const schema = readFileSync(new URL("./test/gpx-1.1.xsd", import.meta.url), "utf8");

async function validate(xml: string) {
  const result = await validateXML({ xml: [{ fileName: "route.gpx", contents: xml }], schema: [schema] });
  return { valid: result.valid, errors: result.errors.map((e) => e.rawMessage) };
}

const input: GpxInput = {
  name: "Torfhaus → Brocken & zurück <Test>",
  description: "10,2 km · ↑ 430 m · ↓ 12 m · 3 h 16 min",
  time: "2026-11-24T20:00:00.000Z",
  link: "https://routing.pixelcenter.de",
  waypoints: [
    { lat: 51.8108, lng: 10.5393, name: "A", sym: "Flag, Green" },
    {
      lat: 51.7991,
      lng: 10.6156,
      ele: 1141,
      name: "9 Brocken",
      desc: "Stempelstelle",
      type: "Stempelstelle",
    },
  ],
  track: [
    { lat: 51.81081, lng: 10.53934, ele: 801.5 },
    { lat: 51.80512, lng: 10.57123, ele: 850 },
    { lat: 51.79912, lng: 10.61568 },
  ],
};

describe("buildGpx", () => {
  it("produces valid GPX 1.1 (schema check)", async () => {
    expect(await validate(buildGpx(input))).toEqual({ valid: true, errors: [] });
  });

  it("is still valid with special characters, no waypoints and no description", async () => {
    const xml = buildGpx({
      ...input,
      name: "Wanderung über Höhen & Täler <ä ö ü ß> \"Zitat\" 'x'",
      description: "",
      waypoints: [],
    });
    expect(await validate(xml)).toEqual({ valid: true, errors: [] });
    expect(xml).toContain(
      "<name>Wanderung über Höhen &amp; Täler &lt;ä ö ü ß&gt; &quot;Zitat&quot; &apos;x&apos;</name>",
    );
  });

  it("the schema check catches invalid documents (guards the test itself)", async () => {
    const xml = buildGpx(input);
    const wpt = xml.match(/ {2}<wpt[^\n]*\n/g)!.join("");
    const broken = xml.replace(wpt, "").replace("</trk>", `</trk>\n${wpt}`);
    expect((await validate(broken)).valid).toBe(false);
    expect((await validate(xml.replace('lat="51.810810"', 'lat="95"'))).valid).toBe(false);
  });

  it("contains metadata, all track points with elevation and the waypoints", () => {
    const xml = buildGpx(input);
    expect(xml).toMatch(/creator="Harz Routenplaner"/);
    expect(xml).toContain("<desc>10,2 km · ↑ 430 m · ↓ 12 m · 3 h 16 min</desc>");
    expect(xml.match(/<trkpt /g)).toHaveLength(3);
    expect(xml).toContain('<trkpt lat="51.810810" lon="10.539340"><ele>801.5</ele></trkpt>');
    expect(xml).toContain('<trkpt lat="51.799120" lon="10.615680"></trkpt>');
    expect(xml.match(/<wpt /g)).toHaveLength(2);
    expect(xml).toContain("<name>9 Brocken</name><desc>Stempelstelle</desc>");
  });

  it("wpt elements come before trk (schema order)", () => {
    const xml = buildGpx(input);
    expect(xml.indexOf("<wpt")).toBeLessThan(xml.indexOf("<trk>"));
    expect(xml.indexOf("</metadata>")).toBeLessThan(xml.indexOf("<wpt"));
  });
});

describe("escapeXml", () => {
  it("escapes markup characters and removes control characters", () => {
    expect(escapeXml(`a & b < c > "d" 'e'`)).toBe("a &amp; b &lt; c &gt; &quot;d&quot; &apos;e&apos;");
    expect(escapeXml("ok\u0000\u0007 ä")).toBe("ok ä");
  });
});

describe("gpxFileName", () => {
  it("uses the local date", () => {
    expect(gpxFileName(new Date(2026, 0, 5, 23, 59))).toBe("harz-route-2026-01-05.gpx");
  });
});
