export interface ApiConfig {
  brouterUrl: string;
  rateLimitPerMinute: number;
  cacheEntries: number;
  cacheTtlMinutes: number;
  logLevel: string;
}

function int(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

export function readConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  return {
    brouterUrl: (env.BROUTER_URL ?? "http://brouter:17777").replace(/\/$/, ""),
    rateLimitPerMinute: int(env.RATE_LIMIT_PER_MINUTE, 20),
    cacheEntries: int(env.CACHE_ENTRIES, 200),
    cacheTtlMinutes: int(env.CACHE_TTL_MINUTES, 60),
    logLevel: env.LOG_LEVEL ?? "info",
  };
}
