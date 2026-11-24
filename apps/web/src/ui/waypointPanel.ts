import { t, type Language } from "../i18n";
import { displayName, labelFor, MAX_WAYPOINTS, MIN_WAYPOINTS, type Waypoint } from "../plan/waypoints";
import { byId, h } from "./dom";

export interface WaypointPanelActions {
  reorder(from: number, to: number): void;
  remove(id: string): void;
  reverse(): void;
  clear(): void;
}

export interface WaypointPanel {
  render(waypoints: readonly Waypoint[], language: Language): void;
}

export function createWaypointPanel(actions: WaypointPanelActions): WaypointPanel {
  const list = byId<HTMLOListElement>("wp-list");
  const count = byId("wp-count");
  const empty = byId("wp-empty");
  const hint = byId("wp-hint");
  const reverse = byId<HTMLButtonElement>("wp-reverse");
  const clear = byId<HTMLButtonElement>("wp-clear");
  reverse.addEventListener("click", () => actions.reverse());
  clear.addEventListener("click", () => actions.clear());

  /** After a re-render, focus the same control of the moved/next item, so keyboard users keep their place. */
  let pendingFocus: { index: number; action: string } | null = null;

  return {
    render(waypoints, language) {
      count.textContent = t(language, "waypoints.count", { count: waypoints.length, max: MAX_WAYPOINTS });
      empty.hidden = waypoints.length > 0;
      hint.hidden = waypoints.length === 0 || waypoints.length >= MIN_WAYPOINTS;
      hint.textContent = t(language, "waypoints.minHint", { min: MIN_WAYPOINTS });
      reverse.disabled = waypoints.length < 2;
      clear.disabled = waypoints.length === 0;

      list.replaceChildren(
        ...waypoints.map((w, index) => {
          const name = displayName(w);
          const label = labelFor(index);
          const iconButton = (
            action: string,
            text: string,
            aria: string,
            disabled: boolean,
            run: () => void,
          ) => {
            const button = h(
              "button",
              {
                type: "button",
                className: "icon-btn",
                "aria-label": aria,
                title: aria,
                "data-action": action,
                disabled,
              },
              h("span", { "aria-hidden": "true" }, text),
            );
            button.addEventListener("click", () => {
              pendingFocus = {
                index: action === "up" ? index - 1 : action === "down" ? index + 1 : index,
                action,
              };
              run();
            });
            return button;
          };
          return h(
            "li",
            { className: "wp-item", "data-id": w.id },
            h("span", { className: "wp-badge", "aria-hidden": "true" }, label),
            h(
              "span",
              { className: "wp-name" },
              h("span", { className: "visually-hidden" }, `${label}: `),
              name,
            ),
            iconButton("up", "↑", t(language, "waypoints.moveUp", { name }), index === 0, () =>
              actions.reorder(index, index - 1),
            ),
            iconButton(
              "down",
              "↓",
              t(language, "waypoints.moveDown", { name }),
              index === waypoints.length - 1,
              () => actions.reorder(index, index + 1),
            ),
            iconButton("remove", "×", t(language, "waypoints.remove", { name }), false, () =>
              actions.remove(w.id),
            ),
          );
        }),
      );

      if (pendingFocus) {
        const { index, action } = pendingFocus;
        pendingFocus = null;
        const items = list.querySelectorAll("li");
        const item = items[Math.min(index, items.length - 1)];
        const target =
          item?.querySelector<HTMLButtonElement>(`[data-action="${action}"]:not([disabled])`) ??
          item?.querySelector<HTMLButtonElement>("button:not([disabled])");
        (target ?? (waypoints.length ? null : byId("wp-title")))?.focus();
      }
    },
  };
}
