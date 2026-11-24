import type { LatLngBoundsExpression, LatLngExpression } from "leaflet";

/** Initial view: the whole Harz. */
export const HARZ_CENTER: LatLngExpression = [51.75, 10.62];
export const HARZ_ZOOM = 10;

/** Panning limit: Harz + generous buffer (routing area check comes with M1/M2). */
export const MAX_BOUNDS: LatLngBoundsExpression = [
  [50.9, 9.4],
  [52.5, 11.9],
];

export const TILES = {
  topo: {
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    subdomains: ["a", "b", "c"],
    maxZoom: 17,
  },
  trails: {
    url: "https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png",
    maxZoom: 18,
  },
} as const;
