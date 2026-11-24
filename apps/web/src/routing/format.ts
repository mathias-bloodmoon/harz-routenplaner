import type { Language } from "../i18n";

/** "10,2 km" / "10.2 km"; below 1 km in metres. */
export function formatDistance(meters: number, language: Language): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = new Intl.NumberFormat(language === "de" ? "de-DE" : "en-GB", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(meters / 1000);
  return `${km} km`;
}

export function formatMeters(meters: number, language: Language): string {
  return `${new Intl.NumberFormat(language === "de" ? "de-DE" : "en-GB").format(Math.round(meters))} m`;
}
