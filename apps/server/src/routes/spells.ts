import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { summarizeSpells } from "../rules/spells.js";

export const spellRoutes = new Hono();

spellRoutes.get("/", requireAuth, (c) => c.json({ spells: summarizeSpells() }));
