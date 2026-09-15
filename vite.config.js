import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function expressToViteMiddleware(handler) {
  return (req, res) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", async () => {
      if (body) {
        try {
          req.body = JSON.parse(body);
        } catch (e) {
          req.body = {};
        }
      }
      res.status = (code) => {
        res.statusCode = code;
        return res;
      };
      res.json = (data) => {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(data));
        return res;
      };
      try {
        await handler(req, res);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
  };
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: "api-dev-middleware",
      configureServer(server) {
        server.middlewares.use("/api/status", async (req, res, next) => {
          try {
            const { default: statusHandler } = await import("./api/status.js");
            expressToViteMiddleware(statusHandler)(req, res);
          } catch (err) {
            next(err);
          }
        });
        server.middlewares.use("/api/devices", async (req, res, next) => {
          try {
            const { default: devicesHandler } = await import("./api/devices.js");
            expressToViteMiddleware(devicesHandler)(req, res);
          } catch (err) {
            next(err);
          }
        });
      },
    },
  ],
});


