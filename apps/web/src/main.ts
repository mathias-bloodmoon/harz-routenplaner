import "./styles.css";
import { resolveInitialLanguage, translate, type Language, type MessageKey } from "./i18n";
import { createMap } from "./map";
import { loadItem, saveItem } from "./storage";

const LANGUAGE_KEY = "language";

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

function setupPanelToggle(getLanguage: () => Language): () => void {
  const panel = document.getElementById("panel")!;
  const toggle = document.getElementById("panel-toggle")!;
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
    window.dispatchEvent(new Event("panel-resize"));
  });
  return update;
}

function start(): void {
  let language = resolveInitialLanguage(loadItem(LANGUAGE_KEY), navigator.languages ?? [navigator.language]);
  applyTexts(language);

  const harzMap = createMap(document.getElementById("map")!, language);
  const updatePanelToggle = setupPanelToggle(() => language);
  updatePanelToggle();

  // The map container changes size when the panel collapses (desktop and bottom sheet).
  window.addEventListener("panel-resize", () => {
    window.setTimeout(() => harzMap.map.invalidateSize(), 250);
  });

  document.getElementById("lang-toggle")!.addEventListener("click", () => {
    const next: Language = language === "de" ? "en" : "de";
    language = next;
    saveItem(LANGUAGE_KEY, language);
    applyTexts(language);
    harzMap.setLanguage(language);
    updatePanelToggle();
  });
}

start();
