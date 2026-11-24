import { t, type Language } from "../i18n";
import { countByBooklet } from "../stamps/data";
import { BOOKLETS, type Booklet, type Stamp } from "../stamps/types";
import { byId, h } from "./dom";

export interface StampPanel {
  setStamps(stamps: readonly Stamp[]): void;
  showError(): void;
  render(language: Language): void;
}

export function createStampPanel(onChange: (visible: boolean, booklets: Set<Booklet>) => void): StampPanel {
  const section = byId("stamps-section");
  const toggle = byId<HTMLInputElement>("stamps-toggle");
  const fieldset = byId<HTMLFieldSetElement>("booklet-filter");
  const list = byId("booklet-list");
  const error = byId("stamps-error");
  const selected = new Set<Booklet>(BOOKLETS);
  let counts = new Map<Booklet, number>();
  let language: Language = "de";

  const emit = () => onChange(toggle.checked, new Set(selected));
  toggle.addEventListener("change", () => {
    fieldset.disabled = !toggle.checked;
    emit();
  });

  function render(next: Language): void {
    language = next;
    list.replaceChildren(
      ...BOOKLETS.filter((b) => counts.has(b)).map((booklet) => {
        const input = h("input", { type: "checkbox", value: booklet, checked: selected.has(booklet) });
        input.addEventListener("change", () => {
          if (input.checked) selected.add(booklet);
          else selected.delete(booklet);
          emit();
        });
        return h(
          "label",
          { className: "check" },
          input,
          h("span", {}, t(language, `booklet.${booklet}` as const)),
          h(
            "span",
            { className: "count" },
            counts.get(booklet) === 1
              ? t(language, "stamps.countOne")
              : t(language, "stamps.count", { count: counts.get(booklet) ?? 0 }),
          ),
        );
      }),
    );
  }

  return {
    setStamps(stamps) {
      counts = countByBooklet(stamps);
      section.hidden = false;
      error.hidden = true;
      render(language);
    },
    showError() {
      section.hidden = false;
      error.hidden = false;
      toggle.disabled = true;
      fieldset.hidden = true;
    },
    render,
  };
}
