import "../styles.css";
import { resolveInitialLanguage, translate, type Language, type MessageKey } from "../i18n";
import { loadRuntimeConfig, type RuntimeConfig } from "../runtimeConfig";
import { loadItem, saveItem } from "../storage";
import { h } from "../ui/dom";

type Block = { heading: MessageKey } | { text: MessageKey } | { operator: true } | { email: true };

/** Page contents as translation keys; the operator data comes from /config.json at runtime. */
const PAGES: Record<string, { title: MessageKey; blocks: Block[] }> = {
  impressum: {
    title: "imprint.title",
    blocks: [
      { heading: "imprint.lawHeading" },
      { operator: true },
      { heading: "imprint.contact" },
      { email: true },
      { heading: "imprint.responsible" },
      { operator: true },
      { heading: "imprint.liabilityHeading" },
      { text: "imprint.liability" },
    ],
  },
  datenschutz: {
    title: "privacy.title",
    blocks: [
      { heading: "privacy.shortHeading" },
      { text: "privacy.short" },
      { heading: "privacy.controllerHeading" },
      { operator: true },
      { email: true },
      { heading: "privacy.browserHeading" },
      { text: "privacy.browser" },
      { heading: "privacy.routingHeading" },
      { text: "privacy.routing" },
      { heading: "privacy.serverHeading" },
      { text: "privacy.server" },
      { heading: "privacy.tilesHeading" },
      { text: "privacy.tiles" },
      { heading: "privacy.rightsHeading" },
      { text: "privacy.rights" },
    ],
  },
  datenquellen: {
    title: "sources.title",
    blocks: [
      { text: "sources.intro" },
      { text: "sources.osm" },
      { text: "sources.topo" },
      { text: "sources.trails" },
      { text: "sources.brouter" },
      { text: "sources.software" },
      { text: "sources.code" },
    ],
  },
};

function render(page: string, language: Language, config: RuntimeConfig): void {
  const t = (key: MessageKey) => translate(language, key);
  const content = PAGES[page] ?? PAGES.impressum!;
  document.documentElement.lang = language;
  document.title = `${t(content.title)} – ${t("app.title")}`;
  for (const el of document.querySelectorAll<HTMLElement>("[data-i18n]"))
    el.textContent = t(el.dataset.i18n as MessageKey);
  for (const el of document.querySelectorAll<HTMLElement>("[data-i18n-attr]")) {
    for (const pair of (el.dataset.i18nAttr ?? "").split(";")) {
      const [attr, key] = pair.split(":");
      if (attr && key) el.setAttribute(attr, t(key as MessageKey));
    }
  }

  const { operator } = config;
  const blocks = [...content.blocks];
  // stamp attribution only when the layer is on
  if (page === "datenquellen" && config.stampsEnabled) blocks.splice(4, 0, { text: "sources.stamps" });

  document.getElementById("content")!.replaceChildren(
    h("h1", {}, t(content.title)),
    ...blocks.map((block) => {
      if ("heading" in block) return h("h2", {}, t(block.heading));
      if ("text" in block) {
        const p = h("p", {}, t(block.text));
        if (block.text === "sources.code") {
          p.append(
            " ",
            h(
              "a",
              { href: "https://github.com/mathias-bloodmoon/harz-routenplaner" },
              "github.com/mathias-bloodmoon/harz-routenplaner",
            ),
          );
        }
        return p;
      }
      if ("email" in block) {
        return operator.email
          ? h("p", {}, h("a", { href: `mailto:${operator.email}` }, operator.email))
          : h("p", { className: "missing" }, t("imprint.addressMissing"));
      }
      return h(
        "address",
        {},
        h("span", {}, `${operator.name} (${t("imprint.private")})`),
        ...(operator.addressLines.length
          ? operator.addressLines.map((line) => h("span", {}, line))
          : [h("span", { className: "missing" }, t("imprint.addressMissing"))]),
      );
    }),
  );
}

async function start(): Promise<void> {
  const page = document.body.dataset.page ?? "impressum";
  let language = resolveInitialLanguage(loadItem("language"), navigator.languages ?? [navigator.language]);
  const config = await loadRuntimeConfig();
  render(page, language, config);
  document.getElementById("lang-toggle")!.addEventListener("click", () => {
    language = language === "de" ? "en" : "de";
    saveItem("language", language);
    render(page, language, config);
  });
}

void start();
