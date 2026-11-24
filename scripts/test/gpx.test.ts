import { describe, expect, it } from "vitest";
import { parseRegularGpx } from "../stamps/gpx.js";

// Synthetic sample in the structure of the official file (not the real data).
const GPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="test">
  <wpt lat="51.8000000" lon="10.6000000"><ele>500</ele><name>HWN002 Teststein</name>
    <desc>Teststein (Aussicht &amp; Hütte)</desc><sym>Post Office</sym></wpt>
  <wpt lat="51.7000000" lon="10.5000000"><name>HWN001 Probeklippe</name></wpt>
  <wpt lat="51.6" lon="10.4"><name>Parkplatz</name></wpt>
  <wpt lat="x" lon="10.4"><name>HWN003 Kaputt</name></wpt>
</gpx>`;

describe("parseRegularGpx", () => {
  it("reads number, name and position, sorted by number", () => {
    expect(parseRegularGpx(GPX)).toEqual([
      { number: 1, name: "Probeklippe", lat: 51.7, lng: 10.5 },
      { number: 2, name: "Teststein (Aussicht & Hütte)", lat: 51.8, lng: 10.6 },
    ]);
  });

  it("handles a single waypoint and an empty file", () => {
    expect(parseRegularGpx('<gpx><wpt lat="51" lon="10"><name>HWN222 Ende</name></wpt></gpx>')).toHaveLength(
      1,
    );
    expect(parseRegularGpx("<gpx></gpx>")).toEqual([]);
  });
});
