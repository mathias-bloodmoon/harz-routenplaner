import type { StampOnRoute } from "../details/along";
import type { ElevationProfile } from "../details/elevation";
import { formatDuration, walkingTime } from "../details/walkingTime";
import { t, type Language } from "../i18n";
import { displayName, labelFor, type Waypoint } from "../plan/waypoints";
import { formatDistance, formatMeters } from "../routing/format";
import type { Route } from "../routing/types";
import { CREATOR, type GpxInput } from "./gpx";

export const SITE_URL = "https://routing.pixelcenter.de";

export interface RouteExport {
  route: Route;
  routeName: string;
  profile: ElevationProfile;
  waypoints: readonly Waypoint[];
  stamps: readonly StampOnRoute[];
  speedKmh: number;
  language: Language;
  now: Date;
}

/** Maps the selected route to the GPX builder input (pure). */
export function routeToGpx(e: RouteExport): GpxInput {
  const { language: lang } = e;
  const time = walkingTime(e.profile.distanceM, e.profile.ascentM, e.profile.descentM, e.speedKmh);
  const first = e.waypoints[0];
  const last = e.waypoints[e.waypoints.length - 1];
  const ends =
    first && last && (first.name || last.name) ? `: ${displayName(first)} → ${displayName(last)}` : "";
  return {
    name: `${CREATOR} – ${e.routeName}${ends}`,
    description: t(lang, "export.metaDesc", {
      distance: formatDistance(e.profile.distanceM, lang),
      ascent: formatMeters(e.profile.ascentM, lang),
      descent: formatMeters(e.profile.descentM, lang),
      time: formatDuration(time.dinHours),
      speed: new Intl.NumberFormat(lang === "de" ? "de-DE" : "en-GB").format(e.speedKmh),
    }),
    time: e.now.toISOString(),
    link: SITE_URL,
    waypoints: [
      ...e.waypoints.map((w, i) => ({
        lat: w.lat,
        lng: w.lng,
        name: w.name
          ? `${labelFor(i)}: ${displayName(w)}`
          : t(lang, "export.waypoint", { label: labelFor(i) }),
        sym: "Flag, Blue",
      })),
      ...e.stamps.map((s) => ({
        lat: s.stamp.lat,
        lng: s.stamp.lng,
        name: `${s.stamp.number} ${s.stamp.name}`,
        desc: `${t(lang, "export.stamp")} · ${formatDistance(s.atM, lang)}`,
        sym: "Flag, Red",
        type: t(lang, "export.stamp"),
      })),
    ],
    track: e.route.coordinates.map(([lng, lat, ele]) => ({ lat, lng, ele })),
  };
}
