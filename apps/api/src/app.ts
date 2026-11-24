import Fastify, { type FastifyInstance } from "fastify";

export interface AppOptions {
  logLevel?: string;
}

/** Builds the Fastify app without starting it, so tests can use `app.inject()`. */
export function buildApp(options: AppOptions = {}): FastifyInstance {
  const app = Fastify({
    logger: options.logLevel === "silent" ? false : { level: options.logLevel ?? "info" },
  });

  app.get("/api/health", async () => ({ status: "ok" }));

  return app;
}
