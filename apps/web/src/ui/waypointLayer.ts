import L from "leaflet";
import { t, type Language } from "../i18n";
import type { LatLng } from "../plan/area";
import { displayName, labelFor, type Waypoint } from "../plan/waypoints";

export interface WaypointLayer {
  render(waypoints: readonly Waypoint[], language: Language): void;
}

/** Draggable letter markers (A, B, C …). Dragging calls `onMove`; the caller decides and re-renders. */
export function createWaypointLayer(map: L.Map, onMove: (id: string, to: LatLng) => void): WaypointLayer {
  const group = L.layerGroup().addTo(map);
  const line = L.polyline([], { color: "#1f4a27", weight: 2, dashArray: "6 6", interactive: false }).addTo(
    map,
  );

  return {
    render(waypoints, language) {
      group.clearLayers();
      line.setLatLngs(waypoints.map((w) => [w.lat, w.lng]));
      waypoints.forEach((w, index) => {
        const label = labelFor(index);
        const marker = L.marker([w.lat, w.lng], {
          draggable: true,
          autoPan: true,
          zIndexOffset: 1000,
          title: t(language, "waypoints.markerLabel", { label, name: displayName(w) }),
          alt: t(language, "waypoints.markerLabel", { label, name: displayName(w) }),
          icon: L.divIcon({
            html: `<span>${label}</span>`,
            className: "wp-marker",
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          }),
        });
        marker.on("dragend", () => {
          const { lat, lng } = marker.getLatLng();
          onMove(w.id, { lat, lng });
        });
        marker.addTo(group);
        marker
          .getElement()
          ?.setAttribute("aria-label", t(language, "waypoints.markerLabel", { label, name: displayName(w) }));
      });
    },
  };
}
