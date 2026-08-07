import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { CLASSES, RACES, subclassNames } from "../rules/features.js";

export const featureRoutes = new Hono();

featureRoutes.get("/", requireAuth, (c) =>
  c.json({
    subclasses: subclassNames(),
    races: RACES.map((r) => r.name),
    classes: CLASSES.map((c) => c.name),
  }),
);
