import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { fileURLToPath } from "node:url";
import { authRoutes } from "./routes/auth.js";
import { characterRoutes } from "./routes/characters.js";
import { campaignRoutes } from "./routes/campaigns.js";
import { spellRoutes } from "./routes/spells.js";
import { featureRoutes } from "./routes/features.js";
import { equipmentRoutes } from "./routes/equipment.js";
import { adventureRoutes } from "./routes/adventures.js";

const app = new Hono();
const isProduction = process.env.NODE_ENV === "production";
const dataDir = fileURLToPath(new URL("../data", import.meta.url));
const webDistDir = fileURLToPath(new URL("../../web/dist", import.meta.url));

if (isProduction) {
  const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");
  const { db } = await import("./db/index.js");
  try {
    migrate(db, { migrationsFolder: fileURLToPath(new URL("../drizzle", import.meta.url)) });
    console.log("Migrations applied.");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  }),
);
app.use(
  "/static/*",
  serveStatic({
    root: dataDir,
    rewriteRequestPath: (path) => path.replace(/^\/static/, ""),
  }),
);

app.get("/api/health", (c) => c.json({ ok: true, service: "domino-server" }));

app.route("/api/auth", authRoutes);
app.route("/api/characters", characterRoutes);
app.route("/api/campaigns", campaignRoutes);
app.route("/api/spells", spellRoutes);
app.route("/api/features", featureRoutes);
app.route("/api/equipment", equipmentRoutes);
app.route("/api/adventures", adventureRoutes);

if (isProduction) {
  app.use("/assets/*", serveStatic({ root: webDistDir }));
  let cachedIndex: string | null = null;
  app.get("*", async (c, next) => {
    if (c.req.path.startsWith("/api") || c.req.path.startsWith("/static")) return next();
    if (cachedIndex === null) {
      const { readFile } = await import("node:fs/promises");
      try {
        cachedIndex = await readFile(
          fileURLToPath(new URL("../../web/dist/index.html", import.meta.url)),
          "utf8",
        );
      } catch {
        return next();
      }
    }
    return c.html(cachedIndex);
  });
}

const port = Number(process.env.PORT ?? 3001);

if (process.env.NODE_ENV !== "test") {
  serve({ fetch: app.fetch, port }, (info) => {
    console.log(`DoMino server listening on http://localhost:${info.port}`);
  });
}

export default app;
