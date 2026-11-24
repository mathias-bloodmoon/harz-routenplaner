import { describe, expect, it } from "vitest";
import { fromCsv, toCsv } from "../stamps/csv.js";
import { parseBookletTable, parseSonderstempelPage, splitHwnReference } from "../stamps/special.js";

// Synthetic pages in the structure of harzer-wandernadel.de (not the real data).
const TABLE_PAGE = `<main><table>
<tr><th>Stempelstelle</th><th>Breite N</th><th>Länge E</th></tr>
<tr><td>Testsperre , Testdorf</td><td>51.736269</td><td>10.308452</td></tr>
<tr><td>Obersee (HWN 116) , Altenau</td><td>51.86725</td><td>10.47408</td></tr>
<tr><td>Ohne Koordinaten</td><td></td><td></td></tr>
</table></main>`;

const HWN_COLUMN_PAGE = `<table>
<tr><td>Stempelstellen von Ost nach West</td><td>KM</td><td>HWN-Nr.</td><td>Breite N</td><td>Länge E</td></tr>
<tr><td>„Kalte Stelle“ Probedorf</td><td>22,2</td><td>–</td><td>51.51741</td><td>11.61293</td></tr>
<tr><td>Buche Stolberg</td><td>6,0</td><td>216</td><td>51.57180</td><td>10.95271</td></tr>
</table>`;

const DDM_PAGE = `<table><tr><th>Stempelstelle</th><th>Koordinaten N</th><th>Koordinaten E</th></tr>
<tr><td>Turm, Bad Grund (HWN 130)</td><td>51°49.192′</td><td>10°14.712′</td></tr></table>`;

const SONDER_PAGE = `<main><h2>Sonderstempel</h2><p>9900 Sonderstempel „Grenzturm Test“ 32 U 0612338, UTM 5763496 Text.</p>
<p>9901 Sonderstempel „Quelle“ (N51 53 08.5 E10 38 46.6) Beschreibung mit 1896 Jahreszahl.</p>
<p>9905 Glasgarten „Hüttengarten“ (dauerhafte Sonderstempelstelle) ohne Koordinaten.</p>
<p>9909 Ahornpark (N51 5820.9 E10 7760.8)</p></main>`;

describe("splitHwnReference", () => {
  it("extracts HWN and Stempelstelle references", () => {
    expect(splitHwnReference("Okertalsperre (HWN 116) , Altenau")).toEqual({
      name: "Okertalsperre, Altenau",
      hwn: 116,
    });
    expect(splitHwnReference("Burg Falkenstein (Stempelstelle 200)")).toEqual({
      name: "Burg Falkenstein",
      hwn: 200,
    });
    expect(splitHwnReference("Huysburg")).toEqual({ name: "Huysburg", hwn: null });
  });
});

describe("parseBookletTable", () => {
  it("reads decimal tables and reports rows without coordinates", () => {
    const report = parseBookletTable(TABLE_PAGE, "talsperren");
    expect(report.rows).toEqual([
      {
        booklet: "talsperren",
        number: "",
        name: "Testsperre, Testdorf",
        hwn: null,
        lat: 51.736269,
        lng: 10.308452,
      },
      { booklet: "talsperren", number: "", name: "Obersee, Altenau", hwn: 116, lat: 51.86725, lng: 10.47408 },
    ]);
    expect(report.skipped).toEqual(['talsperren: "Ohne Koordinaten" – no readable coordinates']);
  });

  it("uses the HWN-Nr. column", () => {
    const rows = parseBookletTable(HWN_COLUMN_PAGE, "lutherweg").rows;
    expect(rows.map((r) => [r.name, r.hwn])).toEqual([
      ["„Kalte Stelle“ Probedorf", null],
      ["Buche Stolberg", 216],
    ]);
  });

  it("reads degrees with decimal minutes", () => {
    const [row] = parseBookletTable(DDM_PAGE, "karstwanderweg").rows;
    expect(row?.hwn).toBe(130);
    expect(row?.lat).toBeCloseTo(51.819867, 5);
  });

  it("reports pages without a table", () => {
    expect(parseBookletTable("<p>nix</p>", "klosterwanderweg").skipped).toHaveLength(1);
  });
});

describe("parseSonderstempelPage", () => {
  it("reads UTM and DMS entries and reports the rest", () => {
    const report = parseSonderstempelPage(SONDER_PAGE);
    expect(report.rows.map((r) => [r.number, r.name])).toEqual([
      ["9900", "Grenzturm Test"],
      ["9901", "Quelle"],
    ]);
    expect(report.rows[1]?.lat).toBeCloseTo(51.885694, 5);
    expect(report.skipped).toEqual([
      'sonderstempel: 9905 "Hüttengarten" – no readable coordinates',
      'sonderstempel: 9909 "Ahornpark" – no readable coordinates',
    ]);
  });
});

describe("special-stamps.csv", () => {
  it("round-trips rows including quotes and semicolons", () => {
    const rows = [
      {
        booklet: "lutherweg" as const,
        number: "",
        name: '„Kalte Stelle“; "Test"',
        hwn: null,
        lat: 51.51741,
        lng: 11.61293,
      },
      {
        booklet: "sonderstempel" as const,
        number: "9901",
        name: "Quelle",
        hwn: 12,
        lat: 51.885694,
        lng: 10.646278,
      },
    ];
    expect(fromCsv(toCsv(rows))).toEqual(rows);
  });

  it("rejects invalid rows with the line number", () => {
    const csv = "booklet;number;name;hwn;lat;lng\nfoo;;X;;51;10\n";
    expect(() => fromCsv(csv)).toThrow(/line 2/);
    expect(() => fromCsv("a;b\n")).toThrow(/header/);
  });
});
