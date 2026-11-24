import L from "leaflet";
import { routeColor } from "../routing/colors";
import type { Route } from "../routing/types";

export interface RouteLayer {
  show(routes: readonly Route[], selectedId: string | null, fit: boolean): void;
  clear(): void;
}

/** Draws the alternatives; the selected one on top and opaque, the others faded. Click selects. */
export function createRouteLayer(
  map: L.Map,
  onSelect: (id: string) => void,
  /** Pixels at the bottom of the map hidden by the bottom sheet (phones), so routes are fitted above it. */
  bottomInset: () => number = () => 0,
): RouteLayer {
  const group = L.layerGroup().addTo(map);

  return {
    show(routes, selectedId, fit) {
      group.clearLayers();
      const ordered = [...routes.entries()].sort(
        ([, a], [, b]) => Number(a.id === selectedId) - Number(b.id === selectedId),
      );
      for (const [index, route] of ordered) {
        const selected = route.id === selectedId;
        const latLngs = route.coordinates.map(([lng, lat]) => L.latLng(lat, lng));
        // white casing keeps the line visible on the coloured topo map
        L.polyline(latLngs, {
          color: "#ffffff",
          weight: selected ? 9 : 6,
          opacity: selected ? 0.9 : 0.4,
          interactive: false,
        }).addTo(group);
        const line = L.polyline(latLngs, {
          color: routeColor(index),
          weight: selected ? 5 : 4,
          opacity: selected ? 1 : 0.4,
          className: `route-line${selected ? " selected" : ""}`,
          // a click on a line selects it and must not add a waypoint on the map
          bubblingMouseEvents: false,
        });
        line.on("click", () => onSelect(route.id));
        line.addTo(group);
        line.getElement()?.setAttribute("data-route-id", route.id);
      }
      if (fit && routes.length) {
        const bounds = L.latLngBounds(
          routes.flatMap((r) => r.coordinates.map(([lng, lat]) => L.latLng(lat, lng))),
        );
        map.fitBounds(bounds, {
          paddingTopLeft: [30, 30],
          paddingBottomRight: [30, 30 + bottomInset()],
          maxZoom: 15,
        });
      }
    },
    clear() {
      group.clearLayers();
    },
  };
}
