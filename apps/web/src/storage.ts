/** localStorage access that never throws (private mode, blocked storage, quota). */
const PREFIX = "harz-routenplaner:";

export function loadItem(key: string): string | null {
  try {
    return window.localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

export function saveItem(key: string, value: string): void {
  try {
    window.localStorage.setItem(PREFIX + key, value);
  } catch {
    // Storage unavailable: the app keeps working, the choice is just not remembered.
  }
}
