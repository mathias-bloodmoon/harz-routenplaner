import { byId } from "./dom";

/** Export dialog: native <dialog> (focus handling and Escape built in). `download` builds the file on demand. */
export function setupExportDialog(download: () => void): { open(): void } {
  const dialog = byId<HTMLDialogElement>("export-dialog");
  byId("export-download").addEventListener("click", () => {
    download();
    dialog.close();
  });
  byId("export-close").addEventListener("click", () => dialog.close());
  // click on the backdrop closes the dialog
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  return {
    open() {
      dialog.showModal();
      byId("export-download").focus();
    },
  };
}

/** Saves text as a file via a temporary object URL (no server involved). */
export function saveFile(fileName: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
