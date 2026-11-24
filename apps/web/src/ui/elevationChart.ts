import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";
import { t, type Language } from "../i18n";
import type { ElevationProfile } from "../details/elevation";
import { indexAtDistance } from "../details/elevation";
import type { StampOnRoute } from "../details/along";

export interface ElevationChart {
  show(profile: ElevationProfile, stamps: readonly StampOnRoute[], color: string, language: Language): void;
  /** Moves the chart cursor to a profile index (map hover), or hides it. */
  highlight(index: number | null): void;
  clear(): void;
}

const HEIGHT = 170;

/** Elevation profile (distance × altitude). Hovering calls `onHover` with the profile index. */
export function createElevationChart(
  container: HTMLElement,
  onHover: (index: number | null) => void,
): ElevationChart {
  let plot: uPlot | null = null;
  let fromMap = false;

  function width(): number {
    return Math.max(260, container.clientWidth);
  }

  new ResizeObserver(() => plot?.setSize({ width: width(), height: HEIGHT })).observe(container);

  return {
    show(profile, stamps, color, language) {
      plot?.destroy();
      const xs = profile.distances.map((d) => d / 1000);
      const ys = profile.elevations;
      // stamps as points on the line at the closest profile index
      const marks: (number | null)[] = xs.map(() => null);
      for (const s of stamps) {
        const i = indexAtDistance(profile.distances, s.atM);
        marks[i] = ys[i] ?? null;
      }
      const options: uPlot.Options = {
        width: width(),
        height: HEIGHT,
        legend: { show: false },
        cursor: { y: false, points: { size: 10 } },
        scales: { x: { time: false } },
        axes: [
          {
            label: t(language, "chart.distance"),
            size: 36,
            labelSize: 14,
            font: "11px system-ui",
            labelFont: "11px system-ui",
          },
          {
            label: t(language, "chart.elevation"),
            size: 50,
            labelSize: 14,
            font: "11px system-ui",
            labelFont: "11px system-ui",
          },
        ],
        series: [
          {},
          { stroke: color, width: 2, fill: `${color}22`, points: { show: false } },
          {
            label: t(language, "chart.stamps"),
            stroke: "#a5520c",
            width: 0,
            points: { show: true, size: 9, fill: "#a5520c", stroke: "#ffffff" },
          },
        ],
        hooks: {
          setCursor: [
            (u) => {
              if (fromMap) return;
              onHover(u.cursor.idx ?? null);
            },
          ],
        },
      };
      plot = new uPlot(options, [xs, ys, marks] as uPlot.AlignedData, container);
      container.setAttribute(
        "aria-label",
        t(language, "chart.label", {
          distance: `${(profile.distanceM / 1000).toFixed(1)} km`,
          min: `${Math.round(profile.minEleM ?? 0)} m`,
          max: `${Math.round(profile.maxEleM ?? 0)} m`,
        }),
      );
    },
    highlight(index) {
      if (!plot) return;
      fromMap = true;
      if (index === null) {
        plot.setCursor({ left: -10, top: -10 });
      } else {
        const x = (plot.data[0] as number[])[index]!;
        const y = (plot.data[1] as (number | null)[])[index] ?? 0;
        plot.setCursor({ left: plot.valToPos(x, "x"), top: plot.valToPos(y, "y") });
      }
      fromMap = false;
    },
    clear() {
      plot?.destroy();
      plot = null;
    },
  };
}
