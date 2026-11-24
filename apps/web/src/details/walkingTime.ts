/**
 * Walking time after DIN 33466 (German hiking standard):
 * horizontal = distance ÷ speed; vertical = ascent ÷ 300 m/h + descent ÷ 500 m/h;
 * total = the larger of the two + half of the smaller.
 */
export const ASCENT_M_PER_HOUR = 300;
export const DESCENT_M_PER_HOUR = 500;

export interface WalkingTime {
  /** DIN 33466 total in hours (main value). */
  dinHours: number;
  /** distance ÷ speed in hours (secondary value). */
  simpleHours: number;
}

export function walkingTime(
  distanceM: number,
  ascentM: number,
  descentM: number,
  speedKmh: number,
): WalkingTime {
  const horizontal = distanceM / 1000 / speedKmh;
  const vertical = ascentM / ASCENT_M_PER_HOUR + descentM / DESCENT_M_PER_HOUR;
  const dinHours = Math.max(horizontal, vertical) + Math.min(horizontal, vertical) / 2;
  return { dinHours, simpleHours: horizontal };
}

/** "4 h 42 min", "45 min" – rounded to full minutes. */
export function formatDuration(hours: number): string {
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60);
  const min = total % 60;
  if (h === 0) return `${min} min`;
  return `${h} h ${String(min).padStart(2, "0")} min`;
}
