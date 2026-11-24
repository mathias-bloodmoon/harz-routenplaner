import L from "leaflet";
import "../leafletGlobal";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import { t, type Language } from "../i18n";
import type { Stamp } from "../stamps/types";
import { h } from "./dom";

export interface StampLayer {
  setStamps(stamps: Stamp[]): void;
  setVisible(visible: boolean): void;
  setLanguage(language: Language): void;
}

export function createStampLayer(
  map: L.Map,
  language: Language,
  onAddWaypoint: (stamp: Stamp) => void,
): StampLayer {
  let lang = language;
  let current: Stamp[] = [];
  let visible = true;

  const cluster = L.markerClusterGroup({
    showCoverageOnHover: false,
    maxClusterRadius: 45,
    disableClusteringAtZoom: 13,
    iconCreateFunction: (c) =>
      L.divIcon({
        html: `<span>${c.getChildCount()}</span>`,
        className: "stamp-cluster",
        iconSize: [36, 36],
      }),
  });

  function popupContent(stamp: Stamp): HTMLElement {
    const button = h(
      "button",
      { type: "button", className: "button primary" },
      t(lang, "stamps.addAsWaypoint"),
    );
    button.addEventListener("click", () => {
      onAddWaypoint(stamp);
      map.closePopup();
    });
    return h(
      "div",
      { className: "stamp-popup" },
      h(
        "p",
        { className: "stamp-kind" },
        t(lang, stamp.special ? "stamps.special" : "stamps.regular"),
        ` ${stamp.number}`,
      ),
      h("p", { className: "stamp-name" }, stamp.name),
      h(
        "p",
        { className: "stamp-booklets" },
        `${t(lang, "stamps.inBooklets")}: `,
        stamp.booklets.map((b) => t(lang, `booklet.${b}` as const)).join(", "),
      ),
      stamp.source
        ? h(
            "p",
            {},
            h("a", { href: stamp.source, target: "_blank", rel: "noopener" }, t(lang, "stamps.moreInfo")),
          )
        : null,
      button,
    );
  }

  function render(): void {
    cluster.clearLayers();
    const markers = current.map((stamp) => {
      const marker = L.marker([stamp.lat, stamp.lng], {
        icon: L.divIcon({
          html: `<span>${stamp.number.replace(/[^\w-]/g, "")}</span>`,
          className: `stamp-marker${stamp.special ? " special" : ""}`,
          iconSize: [30, 30],
        }),
        title: t(lang, "stamps.markerLabel", { number: stamp.number, name: stamp.name }),
        alt: t(lang, "stamps.markerLabel", { number: stamp.number, name: stamp.name }),
        keyboard: true,
      });
      marker.bindPopup(() => popupContent(stamp));
      return marker;
    });
    cluster.addLayers(markers);
  }

  function setVisible(next: boolean): void {
    visible = next;
    if (visible && !map.hasLayer(cluster)) cluster.addTo(map);
    if (!visible && map.hasLayer(cluster)) cluster.remove();
  }

  setVisible(true);
  return {
    setStamps(stamps) {
      current = stamps;
      render();
    },
    setVisible,
    setLanguage(next) {
      lang = next;
      map.closePopup();
      render();
    },
  };
}
