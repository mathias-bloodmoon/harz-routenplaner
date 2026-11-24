import { t, type Language, type MessageKey } from "../i18n";
import { routeColor } from "../routing/colors";
import { formatDistance, formatMeters } from "../routing/format";
import type { Route } from "../routing/types";
import { byId, h } from "./dom";

export function routeName(route: Route, language: Language): string {
  if (route.kind === "alternative") return t(language, "routes.alternative", { number: route.number });
  const key: MessageKey = `routes.${route.kind}`;
  return t(language, key);
}

export interface RoutePanel {
  render(routes: readonly Route[] | null, selectedId: string | null, language: Language): void;
  setBusy(busy: boolean, language: Language): void;
  setCanCalculate(enabled: boolean): void;
  focusTitle(): void;
}

export function createRoutePanel(onCalculate: () => void, onSelect: (id: string) => void): RoutePanel {
  const button = byId<HTMLButtonElement>("route-calc");
  const section = byId("routes-section");
  const cards = byId<HTMLUListElement>("route-cards");
  const note = byId("routes-note");
  let busy = false;
  let canCalculate = false;
  button.addEventListener("click", () => onCalculate());

  const updateButton = () => {
    button.disabled = busy || !canCalculate;
  };

  return {
    render(routes, selectedId, language) {
      section.hidden = !routes;
      if (!routes) {
        cards.replaceChildren();
        return;
      }
      note.hidden = routes.length >= 3;
      note.textContent =
        routes.length === 1
          ? t(language, "routes.fewerOne")
          : t(language, "routes.fewer", { count: routes.length });
      cards.replaceChildren(
        ...routes.map((route, index) => {
          const selected = route.id === selectedId;
          const card = h(
            "button",
            {
              type: "button",
              className: `route-card${selected ? " selected" : ""}`,
              "aria-pressed": String(selected),
              "data-route-id": route.id,
            },
            h("span", {
              className: "swatch",
              style: `background:${routeColor(index)}`,
              "aria-hidden": "true",
            }),
            h(
              "span",
              { className: "route-text" },
              h("span", { className: "route-name" }, routeName(route, language)),
              h(
                "span",
                { className: "route-stats" },
                h("span", {}, formatDistance(route.distanceM, language)),
                h(
                  "span",
                  { title: t(language, "routes.ascent") },
                  h("span", { "aria-hidden": "true" }, "↑ "),
                  h("span", { className: "visually-hidden" }, `${t(language, "routes.ascent")} `),
                  formatMeters(route.ascentM, language),
                ),
                h(
                  "span",
                  { title: t(language, "routes.descent") },
                  h("span", { "aria-hidden": "true" }, "↓ "),
                  h("span", { className: "visually-hidden" }, `${t(language, "routes.descent")} `),
                  formatMeters(route.descentM, language),
                ),
              ),
            ),
          );
          card.addEventListener("click", () => onSelect(route.id));
          return h("li", {}, card);
        }),
      );
    },
    setBusy(next, language) {
      busy = next;
      button.textContent = t(language, next ? "routes.calculating" : "routes.calculate");
      button.setAttribute("aria-busy", String(next));
      section.setAttribute("aria-busy", String(next));
      updateButton();
    },
    setCanCalculate(enabled) {
      canCalculate = enabled;
      updateButton();
    },
    focusTitle() {
      byId("routes-title").focus();
    },
  };
}
