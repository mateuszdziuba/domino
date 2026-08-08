import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { adventureSummaries } from "../rules/adventures.js";

export const adventureRoutes = new Hono();

adventureRoutes.get("/", requireAuth, (c) => c.json({ adventures: adventureSummaries() }));
