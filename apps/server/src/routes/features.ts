import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { CLASSES, RACES, subclassDetails, subclassNames } from "../rules/features.js";

export const featureRoutes = new Hono();

featureRoutes.get("/", requireAuth, (c) =>
  c.json({
    subclasses: subclassNames(),
    subclassDetails: subclassDetails(),
    races: RACES.map((r) => r.name),
    classes: CLASSES.map((c) => c.name),
  }),
);
