import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { authRoutes } from "./routes/auth.js";
import { characterRoutes } from "./routes/characters.js";
import { campaignRoutes } from "./routes/campaigns.js";
import { spellRoutes } from "./routes/spells.js";
import { featureRoutes } from "./routes/features.js";
import { equipmentRoutes } from "./routes/equipment.js";
import { adventureRoutes } from "./routes/adventures.js";

const app = new Hono();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  }),
);
app.use("/static/*", serveStatic({ root: "./data" }));

app.get("/api/health", (c) => c.json({ ok: true, service: "domino-server" }));

app.route("/api/auth", authRoutes);
app.route("/api/characters", characterRoutes);
app.route("/api/campaigns", campaignRoutes);
app.route("/api/spells", spellRoutes);
app.route("/api/features", featureRoutes);
app.route("/api/equipment", equipmentRoutes);
app.route("/api/adventures", adventureRoutes);

const port = Number(process.env.PORT ?? 3001);

if (process.env.NODE_ENV !== "test") {
  serve({ fetch: app.fetch, port }, (info) => {
    console.log(`DoMino server listening on http://localhost:${info.port}`);
  });
}

export default app;
