import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig, type Connect, type Plugin } from "vite";

const DEFAULT_STAMPS = fileURLToPath(new URL("../../data/stamps.geojson", import.meta.url));

/**
 * Serves /config.json and /data/stamps.geojson in `vite dev` and `vite preview`, like the web container does.
 * STAMPS_ENABLED (default true) and STAMPS_FILE (default data/stamps.geojson) control it.
 */
function runtimeData(): Plugin {
  const middleware: Connect.NextHandleFunction = (req, res, next) => {
    const enabled = process.env.STAMPS_ENABLED !== "false";
    if (req.url === "/config.json") {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ stampsEnabled: enabled }));
      return;
    }
    if (req.url === "/data/stamps.geojson") {
      const file = process.env.STAMPS_FILE ?? DEFAULT_STAMPS;
      if (!enabled || !existsSync(file)) {
        res.statusCode = 404;
        res.end();
        return;
      }
      res.setHeader("Content-Type", "application/geo+json");
      res.end(readFileSync(file));
      return;
    }
    next();
  };
  return {
    name: "runtime-data",
    configureServer: (server) => void server.middlewares.use(middleware),
    configurePreviewServer: (server) => void server.middlewares.use(middleware),
  };
}

export default defineConfig({
  plugins: [runtimeData()],
  server: {
    port: 5173,
    proxy: {
      "/api": process.env.API_URL ?? "http://localhost:3000",
    },
  },
  build: {
    target: "es2022",
  },
});
