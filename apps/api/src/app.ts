import rateLimit from "@fastify/rate-limit";
import Fastify, { LogController, type FastifyInstance } from "fastify";
import { BrouterUnavailableError, createBrouterClient, NoRouteError, type BrouterClient } from "./brouter.js";
import { TtlCache } from "./cache.js";
import { readConfig, type ApiConfig } from "./config.js";
import { planRoutes, type PlanResult } from "./planner.js";
import { validateRouteRequest } from "./validate.js";

export interface AppOptions {
  config?: Partial<ApiConfig>;
  /** Injected in tests (recorded BRouter answers). */
  brouter?: BrouterClient;
  /** Number of reverse proxies in front of the api (nginx locally, Caddy + nginx in production). */
  trustProxyHops?: number;
}

/** Builds the Fastify app without starting it, so tests can use `app.inject()`. */
export async function buildApp(options: AppOptions = {}): Promise<FastifyInstance> {
  const config = { ...readConfig(), ...options.config };
  const trustedHops = options.trustProxyHops ?? Number(process.env.TRUST_PROXY_HOPS ?? 1);
  const app = Fastify({
    logger: config.logLevel === "silent" ? false : { level: config.logLevel },
    // Privacy: no per-request logs (they would contain IPs); routes are never logged.
    logController: new LogController({ disableRequestLogging: true }),
    // Trust exactly the proxies in front of us, so a client cannot fake its IP via X-Forwarded-For.
    trustProxy: (_address: string, hop: number) => hop < trustedHops,
    bodyLimit: 16 * 1024,
  });
  const brouter = options.brouter ?? createBrouterClient(config.brouterUrl);
  const cache = new TtlCache<PlanResult>(config.cacheEntries, config.cacheTtlMinutes * 60_000);

  await app.register(rateLimit, { global: false });

  app.get("/api/health", async () => ({ status: "ok" }));

  app.post(
    "/api/route",
    {
      config: {
        rateLimit: {
          max: config.rateLimitPerMinute,
          timeWindow: "1 minute",
          errorResponseBuilder: (_req, context) => ({
            statusCode: 429,
            error: "rate-limited",
            retryAfterSeconds: Math.ceil(context.ttl / 1000),
          }),
        },
      },
    },
    async (request, reply) => {
      reply.header("Cache-Control", "no-store");
      const validation = validateRouteRequest(request.body);
      if (!validation.ok) {
        return reply.code(400).send({
          error: validation.error,
          ...(validation.index !== undefined ? { index: validation.index } : {}),
        });
      }

      const key = JSON.stringify(validation.waypoints);
      const cached = cache.get(key);
      if (cached) return { ...cached, cached: true };

      try {
        const result = await planRoutes(brouter, validation.waypoints);
        cache.set(key, result);
        return { ...result, cached: false };
      } catch (error) {
        if (error instanceof BrouterUnavailableError) {
          app.log.error({ reason: error.message }, "brouter unavailable");
          return reply.code(503).send({ error: "routing-unavailable" });
        }
        if (error instanceof NoRouteError) {
          return reply.code(422).send({ error: "no-route" });
        }
        throw error;
      }
    },
  );

  return app;
}
