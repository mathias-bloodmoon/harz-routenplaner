import "./styles.css";
import { resolveInitialLanguage, t, translate, type Language, type MessageKey } from "./i18n";
import { createMap } from "./map";
import { parsePlan, serializePlan, type PlanState } from "./plan/persist";
import {
  addWaypoint,
  displayName,
  labelFor,
  moveWaypoint,
  newId,
  removeWaypoint,
  reorderWaypoint,
  reverseWaypoints,
  MAX_WAYPOINTS,
  MIN_WAYPOINTS,
  type Result,
  type Waypoint,
} from "./plan/waypoints";
import L from "leaflet";
import { stampsAlongRoute } from "./details/along";
import { elevationProfile, type ElevationProfile } from "./details/elevation";
import { requestRoutes } from "./routing/api";
import { routeColor } from "./routing/colors";
import type { Route, RouteErrorCode } from "./routing/types";
import { loadRuntimeConfig } from "./runtimeConfig";
import { filterByBooklets, loadStamps } from "./stamps/data";
import type { Stamp } from "./stamps/types";
import { loadItem, saveItem } from "./storage";
import { byId } from "./ui/dom";
import { buildGpx, gpxFileName } from "./export/gpx";
import { routeToGpx } from "./export/routeGpx";
import { createDetailsPanel } from "./ui/detailsPanel";
import { saveFile, setupExportDialog } from "./ui/exportDialog";
import { createElevationChart } from "./ui/elevationChart";
import { createRouteLayer } from "./ui/routeLayer";
import { createRoutePanel, routeName } from "./ui/routePanel";
import { createStampLayer, type StampLayer } from "./ui/stampLayer";
import { createStampPanel } from "./ui/stampPanel";
import { createWaypointLayer } from "./ui/waypointLayer";
import { createWaypointPanel } from "./ui/waypointPanel";

const ERROR_KEYS: Record<RouteErrorCode, MessageKey> = {
  "invalid-request": "error.invalidRequest",
  "too-few-waypoints": "error.tooFew",
  "too-many-waypoints": "error.tooMany",
  "outside-area": "error.outsideArea",
  "routing-unavailable": "error.routingUnavailable",
  "no-route": "error.noRoute",
  "rate-limited": "error.rateLimited",
};

const LANGUAGE_KEY = "language";
const PLAN_KEY = "plan";

function applyTexts(language: Language): void {
  document.documentElement.lang = language;
  document.title = translate(language, "app.title");
  for (const el of document.querySelectorAll<HTMLElement>("[data-i18n]")) {
    el.textContent = translate(language, el.dataset.i18n as MessageKey);
  }
  for (const el of document.querySelectorAll<HTMLElement>("[data-i18n-attr]")) {
    for (const pair of (el.dataset.i18nAttr ?? "").split(";")) {
      const [attr, key] = pair.split(":");
      if (attr && key) el.setAttribute(attr, translate(language, key as MessageKey));
    }
  }
}

function setupPanelToggle(getLanguage: () => Language, onResize: () => void): () => void {
  const panel = byId("panel");
  const toggle = byId("panel-toggle");
  const update = () => {
    const expanded = !panel.classList.contains("collapsed");
    toggle.setAttribute("aria-expanded", String(expanded));
    const key: MessageKey = expanded ? "panel.collapse" : "panel.expand";
    toggle.setAttribute("aria-label", translate(getLanguage(), key));
    toggle.setAttribute("title", translate(getLanguage(), key));
  };
  toggle.addEventListener("click", () => {
    panel.classList.toggle("collapsed");
    update();
    window.setTimeout(onResize, 250);
  });
  return update;
}

async function start(): Promise<void> {
  let language = resolveInitialLanguage(loadItem(LANGUAGE_KEY), navigator.languages ?? [navigator.language]);
  let plan: PlanState = parsePlan(loadItem(PLAN_KEY));
  applyTexts(language);

  const status = byId("status");
  /** Last status message as key + params, so it can be re-translated on a language switch. */
  let lastStatus: { key: MessageKey; params?: Record<string, string | number>; error: boolean } | null = null;
  const showStatus = (key: MessageKey, params?: Record<string, string | number>, error = false) => {
    lastStatus = { key, ...(params ? { params } : {}), error };
    status.textContent = t(language, key, params);
    status.classList.toggle("is-error", error);
  };

  const harzMap = createMap(byId("map"), language);
  const waypointLayer = createWaypointLayer(harzMap.map, (id, to) => {
    const index = plan.waypoints.findIndex((w) => w.id === id);
    applyResult(moveWaypoint(plan.waypoints, id, to), "waypoints.moved", { label: labelFor(index) });
  });
  const waypointPanel = createWaypointPanel({
    reorder: (from, to) => update(reorderWaypoint(plan.waypoints, from, to)),
    remove: (id) => {
      update(removeWaypoint(plan.waypoints, id));
      showStatus("waypoints.removedOne");
    },
    reverse: () => {
      update(reverseWaypoints(plan.waypoints));
      showStatus("waypoints.reversed");
    },
    clear: () => {
      update([]);
      showStatus("waypoints.cleared");
    },
  });

  // ---- routes (not stored: they are recalculated on demand) ----
  let routes: Route[] | null = null;
  let selectedRouteId: string | null = null;
  let pending: AbortController | null = null;
  let allStamps: Stamp[] = [];
  const profiles = new Map<string, ElevationProfile>();
  const panelElement = byId("panel");
  const routeLayer = createRouteLayer(
    harzMap.map,
    (id) => selectRoute(id),
    // bottom-sheet layout (phones): the panel overlaps the map
    () => (window.matchMedia("(max-width: 700px)").matches ? panelElement.offsetHeight : 0),
  );
  const routePanel = createRoutePanel(
    () => void calculate(),
    (id) => selectRoute(id),
  );

  // ---- details: stats, walking time, elevation chart, stamps along the route ----
  const hoverMarker = L.circleMarker([0, 0], {
    className: "hover-marker",
    radius: 7,
    color: "#ffffff",
    weight: 3,
    fillColor: "#1c2320",
    fillOpacity: 1,
    interactive: false,
  });
  const chart = createElevationChart(byId("elevation-chart"), (index) => showHover(index));
  const detailsPanel = createDetailsPanel((s) => {
    harzMap.map.setView([s.stamp.lat, s.stamp.lng], Math.max(harzMap.map.getZoom(), 14));
    const profile = selectedRouteId ? profiles.get(selectedRouteId) : undefined;
    if (profile) {
      const index = profile.distances.findIndex((d) => d >= s.atM);
      showHover(index < 0 ? null : index);
      chart.highlight(index < 0 ? null : index);
    }
  });

  function selectedRoute(): Route | undefined {
    return routes?.find((r) => r.id === selectedRouteId);
  }

  function showHover(index: number | null): void {
    const position = index === null ? undefined : selectedRoute()?.coordinates[index];
    if (!position) {
      hoverMarker.remove();
      return;
    }
    hoverMarker.setLatLng([position[1], position[0]]);
    if (!harzMap.map.hasLayer(hoverMarker)) hoverMarker.addTo(harzMap.map);
  }

  function renderDetails(chartToo = true): void {
    const route = selectedRoute();
    const profile = route ? profiles.get(route.id) : undefined;
    if (!route || !profile || !routes) {
      chart.clear();
      hoverMarker.remove();
      return;
    }
    const stamps = stampsAlongRoute(allStamps, route.coordinates, profile.distances);
    detailsPanel.render(profile, stamps, plan.speedKmh, language);
    if (chartToo) chart.show(profile, stamps, routeColor(routes.indexOf(route)), language);
  }

  function renderRoutes(fit = false): void {
    routePanel.render(routes, selectedRouteId, language);
    if (routes) routeLayer.show(routes, selectedRouteId, fit);
    else routeLayer.clear();
    renderDetails();
  }

  // Map → chart: hovering near the selected route moves the chart cursor (mouse only; the map is exempt on touch).
  let hoverFrame = 0;
  harzMap.map.on("mousemove", (event) => {
    cancelAnimationFrame(hoverFrame);
    hoverFrame = requestAnimationFrame(() => {
      const route = selectedRoute();
      if (!route) return;
      const mouse = event.containerPoint;
      let best = -1;
      let bestDistance = 30; // px
      route.coordinates.forEach(([lng, lat], i) => {
        const d = harzMap.map.latLngToContainerPoint([lat, lng]).distanceTo(mouse);
        if (d < bestDistance) {
          bestDistance = d;
          best = i;
        }
      });
      const index = best < 0 ? null : best;
      showHover(index);
      chart.highlight(index);
    });
  });
  harzMap.map.on("mouseout", () => {
    showHover(null);
    chart.highlight(null);
  });

  // ---- GPX export ----
  const exportDialog = setupExportDialog(() => {
    const route = selectedRoute();
    const profile = route ? profiles.get(route.id) : undefined;
    if (!route || !profile) return;
    const now = new Date();
    const gpx = buildGpx(
      routeToGpx({
        route,
        routeName: routeName(route, language),
        profile,
        waypoints: plan.waypoints,
        stamps: stampsAlongRoute(allStamps, route.coordinates, profile.distances),
        speedKmh: plan.speedKmh,
        language,
        now,
      }),
    );
    const file = gpxFileName(now);
    saveFile(file, gpx, "application/gpx+xml");
    showStatus("export.downloaded", { file });
  });
  byId("export-open").addEventListener("click", () => exportDialog.open());

  // ---- speed ----
  const speedInput = byId<HTMLInputElement>("speed");
  speedInput.value = String(plan.speedKmh);
  speedInput.addEventListener("input", () => {
    const value = Number(speedInput.value.replace(",", "."));
    if (!Number.isFinite(value) || value < 1 || value > 10) {
      speedInput.setAttribute("aria-invalid", "true");
      return;
    }
    speedInput.removeAttribute("aria-invalid");
    plan = { ...plan, speedKmh: value };
    saveItem(PLAN_KEY, serializePlan(plan));
    renderDetails(false);
  });

  function selectRoute(id: string): void {
    const route = routes?.find((r) => r.id === id);
    if (!route) return;
    selectedRouteId = id;
    renderRoutes();
    showStatus("routes.selected", { name: routeName(route, language) });
  }

  /** Waypoints changed: previous routes no longer match. */
  function invalidateRoutes(): void {
    pending?.abort();
    pending = null;
    routePanel.setBusy(false, language);
    if (!routes) return;
    routes = null;
    selectedRouteId = null;
    renderRoutes();
  }

  async function calculate(): Promise<void> {
    if (plan.waypoints.length < MIN_WAYPOINTS) {
      showStatus("error.tooFew", { min: MIN_WAYPOINTS }, true);
      return;
    }
    pending?.abort();
    const controller = new AbortController();
    pending = controller;
    routePanel.setBusy(true, language);
    try {
      const response = await requestRoutes(plan.waypoints, controller.signal);
      if (pending !== controller) return;
      if (!response.ok) {
        showStatus(
          ERROR_KEYS[response.error],
          { max: MAX_WAYPOINTS, min: MIN_WAYPOINTS, seconds: response.retryAfterSeconds ?? 60 },
          true,
        );
        return;
      }
      // own elevation smoothing (details/elevation.ts) for cards and details alike
      profiles.clear();
      routes = response.result.routes.map((route) => {
        const profile = elevationProfile(route.coordinates);
        profiles.set(route.id, profile);
        return {
          ...route,
          distanceM: profile.distanceM,
          ascentM: profile.ascentM,
          descentM: profile.descentM,
        };
      });
      selectedRouteId = routes[0]!.id;
      renderRoutes(true);
      showStatus("routes.found", { count: routes.length });
    } catch {
      // aborted because the waypoints changed
    } finally {
      if (pending === controller) {
        pending = null;
        routePanel.setBusy(false, language);
      }
    }
  }

  function render(): void {
    waypointLayer.render(plan.waypoints, language);
    waypointPanel.render(plan.waypoints, language);
    routePanel.setCanCalculate(plan.waypoints.length >= MIN_WAYPOINTS);
  }

  function update(waypoints: Waypoint[]): void {
    plan = { ...plan, waypoints };
    saveItem(PLAN_KEY, serializePlan(plan));
    invalidateRoutes();
    render();
  }

  function applyResult(
    result: Result,
    successKey: MessageKey,
    params: Record<string, string | number>,
  ): void {
    if (result.ok) {
      update(result.waypoints);
      showStatus(successKey, params);
    } else {
      render(); // e.g. move a dragged marker back
      showStatus(
        result.error === "too-many" ? "error.tooMany" : "error.outsideArea",
        { max: MAX_WAYPOINTS },
        true,
      );
    }
  }

  function add(waypoint: Waypoint): void {
    applyResult(addWaypoint(plan.waypoints, waypoint), "waypoints.added", {
      label: labelFor(plan.waypoints.length),
      name: displayName(waypoint),
    });
  }

  // Clicking the map adds a waypoint – unless the click just closed a popup.
  let popupOpen = false;
  let clickClosesPopup = false;
  harzMap.map.on("popupopen", () => (popupOpen = true));
  harzMap.map.on("popupclose", () => (popupOpen = false));
  harzMap.map.on("preclick", () => (clickClosesPopup = popupOpen));
  harzMap.map.on("click", (event) => {
    if (clickClosesPopup) return;
    add({ id: newId(), lat: event.latlng.lat, lng: event.latlng.lng });
  });

  const updatePanelToggle = setupPanelToggle(
    () => language,
    () => harzMap.map.invalidateSize(),
  );
  updatePanelToggle();
  render();

  let stampLayer: StampLayer | null = null;
  const stampPanel = createStampPanel((visible, booklets) => {
    stampLayer?.setVisible(visible);
    harzMap.setStampAttribution(visible);
    stampLayer?.setStamps(filterByBooklets(allStamps, booklets));
  });
  byId("lang-toggle").addEventListener("click", () => {
    language = language === "de" ? "en" : "de";
    saveItem(LANGUAGE_KEY, language);
    applyTexts(language);
    harzMap.setLanguage(language);
    updatePanelToggle();
    stampLayer?.setLanguage(language);
    stampPanel.render(language);
    render();
    routePanel.setBusy(pending !== null, language);
    renderRoutes();
    if (lastStatus) showStatus(lastStatus.key, lastStatus.params, lastStatus.error);
  });

  const config = await loadRuntimeConfig();
  if (!config.stampsEnabled) return;
  try {
    allStamps = await loadStamps();
    renderDetails(); // routes may already be on screen
  } catch {
    stampPanel.showError();
    return;
  }
  stampLayer = createStampLayer(harzMap.map, language, (stamp) =>
    add({ id: newId(), lat: stamp.lat, lng: stamp.lng, name: stamp.name, stampNumber: stamp.number }),
  );
  stampLayer.setStamps(allStamps);
  stampPanel.render(language);
  stampPanel.setStamps(allStamps);
  harzMap.setStampAttribution(true);
}

void start();
