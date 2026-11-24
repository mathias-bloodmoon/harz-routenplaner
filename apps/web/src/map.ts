import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { HARZ_CENTER, HARZ_ZOOM, MAX_BOUNDS, TILES } from "./config";
import type { Language } from "./i18n";
import { translate } from "./i18n";

export interface HarzMap {
  map: L.Map;
  setLanguage(language: Language): void;
  /** Adds/removes "Stamp points: © Harzer Wandernadel" (visible whenever the stamp layer is shown). */
  setStampAttribution(visible: boolean): void;
}

function attribution(language: Language, stamps: boolean): string {
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  return [
    `${t("attribution.osm")}: © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>`,
    `SRTM | ${t("attribution.style")}: © <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)`,
    `${t("attribution.trails")}: © <a href="https://waymarkedtrails.org">Waymarked Trails</a>`,
    ...(stamps
      ? [`${t("attribution.stamps")}: © <a href="https://www.harzer-wandernadel.de">Harzer Wandernadel</a>`]
      : []),
  ].join(", ");
}

export function createMap(element: HTMLElement, language: Language): HarzMap {
  const map = L.map(element, {
    center: HARZ_CENTER,
    zoom: HARZ_ZOOM,
    minZoom: 8,
    maxBounds: MAX_BOUNDS,
    maxBoundsViscosity: 0.8,
    zoomControl: false,
    attributionControl: false,
  });

  const attributionControl = L.control.attribution({ prefix: false }).addTo(map);
  let currentLanguage = language;
  let stampsShown = false;
  let currentAttribution = attribution(language, stampsShown);
  attributionControl.addAttribution(currentAttribution);

  L.tileLayer(TILES.topo.url, {
    subdomains: [...TILES.topo.subdomains],
    maxZoom: TILES.topo.maxZoom,
    className: "tiles-topo",
  }).addTo(map);
  L.tileLayer(TILES.trails.url, {
    maxZoom: TILES.trails.maxZoom,
    maxNativeZoom: TILES.topo.maxZoom,
    opacity: 0.8,
    className: "tiles-trails",
  }).addTo(map);

  let zoomControl = L.control.zoom({ position: "topright" });

  function refreshAttribution(): void {
    attributionControl.removeAttribution(currentAttribution);
    currentAttribution = attribution(currentLanguage, stampsShown);
    attributionControl.addAttribution(currentAttribution);
  }

  function setLanguage(next: Language): void {
    currentLanguage = next;
    refreshAttribution();

    zoomControl.remove();
    zoomControl = L.control.zoom({
      position: "topright",
      zoomInTitle: translate(next, "map.zoomIn"),
      zoomOutTitle: translate(next, "map.zoomOut"),
    });
    zoomControl.addTo(map);
  }

  setLanguage(language);
  return {
    map,
    setLanguage,
    setStampAttribution(visible) {
      stampsShown = visible;
      refreshAttribution();
    },
  };
}
