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

export interface Stamp {
  number: string;
  name: string;
  booklet: Booklet;
  booklets: Booklet[];
  special: boolean;
  source: string;
  lat: number;
  lng: number;
}
