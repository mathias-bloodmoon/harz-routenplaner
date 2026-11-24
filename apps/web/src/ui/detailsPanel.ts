import { t, type Language, type MessageKey } from "../i18n";
import type { StampOnRoute } from "../details/along";
import type { ElevationProfile } from "../details/elevation";
import { formatDuration, walkingTime } from "../details/walkingTime";
import { formatDistance, formatMeters } from "../routing/format";
import { byId, h } from "./dom";

export interface DetailsPanel {
  render(
    profile: ElevationProfile,
    stamps: readonly StampOnRoute[],
    speedKmh: number,
    language: Language,
  ): void;
}

export function createDetailsPanel(onStampFocus: (stamp: StampOnRoute) => void): DetailsPanel {
  const stats = byId("route-stats");
  const list = byId("route-stamps");

  return {
    render(profile, stamps, speedKmh, language) {
      const time = walkingTime(profile.distanceM, profile.ascentM, profile.descentM, speedKmh);
      const row = (key: MessageKey, value: string, className = "") =>
        h(
          "div",
          { className: `stat ${className}`.trim() },
          h("dt", {}, t(language, key)),
          h("dd", {}, value),
        );
      const ele = (v: number | null) => (v === null ? "–" : formatMeters(v, language));
      stats.replaceChildren(
        row("details.timeDin", formatDuration(time.dinHours), "main"),
        row("details.timeSimple", formatDuration(time.simpleHours), "secondary"),
        row("details.length", formatDistance(profile.distanceM, language)),
        row("details.ascent", formatMeters(profile.ascentM, language)),
        row("details.descent", formatMeters(profile.descentM, language)),
        row("details.minEle", ele(profile.minEleM)),
        row("details.maxEle", ele(profile.maxEleM)),
      );
      list.replaceChildren(
        ...(stamps.length
          ? stamps.map((s) => {
              const button = h(
                "button",
                { type: "button", className: "link-button" },
                `${s.stamp.number} ${s.stamp.name}`,
              );
              button.addEventListener("click", () => onStampFocus(s));
              return h(
                "li",
                {},
                button,
                h(
                  "span",
                  { className: "count" },
                  t(language, "details.stampAt", { distance: formatDistance(s.atM, language) }),
                ),
              );
            })
          : [h("li", { className: "hint" }, t(language, "details.stampsNone"))]),
      );
    },
  };
}
