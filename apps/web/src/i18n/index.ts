import de from "./de.json";
import en from "./en.json";

export const LANGUAGES = ["de", "en"] as const;
export type Language = (typeof LANGUAGES)[number];
export type MessageKey = keyof typeof de;
export type Messages = Record<MessageKey, string>;

export const messages: Record<Language, Messages> = { de, en };

export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && (LANGUAGES as readonly string[]).includes(value);
}

/**
 * Picks the start language: a valid stored choice wins, then the first browser language we support,
 * then German.
 */
export function resolveInitialLanguage(stored: string | null, browserLanguages: readonly string[]): Language {
  if (isLanguage(stored)) return stored;
  for (const tag of browserLanguages) {
    const base = tag.toLowerCase().split("-")[0];
    if (isLanguage(base)) return base;
  }
  return "de";
}

export function translate(language: Language, key: MessageKey): string {
  return messages[language][key];
}

/** Replaces {name} placeholders. Unknown placeholders are left as they are. */
export function format(template: string, params: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match,
  );
}

export function t(language: Language, key: MessageKey, params?: Record<string, string | number>): string {
  return format(translate(language, key), params);
}
