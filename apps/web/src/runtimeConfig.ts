export interface Operator {
  name: string;
  /** Address lines (OPERATOR_ADDRESS, lines separated by "|"); empty until Mathias has provided it. */
  addressLines: string[];
  email: string;
}

export interface RuntimeConfig {
  /** Stamp layer; false in production until the Harzer Wandernadel office has agreed (STAMPS_ENABLED). */
  stampsEnabled: boolean;
  operator: Operator;
}

const str = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/** Parses /config.json (pure). Unknown or invalid values fall back to "off"/empty. */
export function parseRuntimeConfig(data: unknown): RuntimeConfig {
  const d = (typeof data === "object" && data !== null ? data : {}) as Record<string, unknown>;
  const op = (typeof d.operator === "object" && d.operator !== null ? d.operator : {}) as Record<
    string,
    unknown
  >;
  return {
    stampsEnabled: d.stampsEnabled === true,
    operator: {
      name: str(op.name) || "Mathias Nagel",
      addressLines: str(op.address)
        .split("|")
        .map((line) => line.trim())
        .filter(Boolean),
      email: str(op.email),
    },
  };
}

/** Reads /config.json (written by the web container or the Vite dev server). Fails closed. */
export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  try {
    const response = await fetch("/config.json", { cache: "no-store" });
    return parseRuntimeConfig(response.ok ? await response.json() : null);
  } catch {
    return parseRuntimeConfig(null);
  }
}
