export const BOOKLETS = [
  "hwn",
  "talsperren",
  "lutherweg",
  "karstwanderweg",
  "huy-fallstein",
  "burgen-schloesser",
  "klosterwanderweg",
  "sonderstempel",
] as const;
export type Booklet = (typeof BOOKLETS)[number];

export const SOURCES: Record<Booklet, string> = {
  hwn: "https://www.harzer-wandernadel.de/stempelstellen/gps-download/",
  talsperren: "https://www.harzer-wandernadel.de/stempelstellen/talsperren-im-harz/",
  lutherweg: "https://www.harzer-wandernadel.de/stempelstellen/lutherweg/",
  karstwanderweg: "https://www.harzer-wandernadel.de/stempelstellen/karstwanderweg/",
  "huy-fallstein": "https://www.harzer-wandernadel.de/stempelstellen/huy-fallstein/",
  "burgen-schloesser":
    "https://www.harzer-wandernadel.de/stempelstellen/harzer-geschichtsorte-burgen-und-schloesser/",
  klosterwanderweg: "https://www.harzer-wandernadel.de/stempelstellen/klosterwanderwerg/",
  sonderstempel: "https://www.harzer-wandernadel.de/stempelstellen/sonderstempel/",
};

/** Number prefix for special stamps without an official number. */
export const PREFIX: Record<Exclude<Booklet, "hwn" | "sonderstempel">, string> = {
  talsperren: "TS",
  lutherweg: "LW",
  karstwanderweg: "KW",
  "huy-fallstein": "HF",
  "burgen-schloesser": "BS",
  klosterwanderweg: "KL",
};

/** A regular stamp from the official GPX. */
export interface RegularStamp {
  number: number;
  name: string;
  lat: number;
  lng: number;
}

/** One row of a companion booklet (special stamp), as stored in data/raw/special-stamps.csv. */
export interface SpecialRow {
  booklet: Exclude<Booklet, "hwn">;
  /** Official number if there is one (e.g. 9901 for Sonderstempel), else empty. */
  number: string;
  name: string;
  /** Number of the regular stamp if the booklet says the place is one (e.g. "HWN 116"). */
  hwn: number | null;
  lat: number;
  lng: number;
}

export interface StampProperties {
  number: string;
  name: string;
  booklet: Booklet;
  booklets: Booklet[];
  special: boolean;
  source: string;
}

export interface StampFeature {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: StampProperties;
}

export interface StampCollection {
  type: "FeatureCollection";
  metadata: { generated: string; regularSource: string; note: string };
  features: StampFeature[];
}
