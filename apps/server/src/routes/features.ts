import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import {
  CLASSES,
  FEATS,
  RACES,
  subclassDetails,
  subclassNames,
} from "../rules/features.js";
import { BACKGROUNDS } from "../rules/backgrounds.js";

export const featureRoutes = new Hono();

featureRoutes.get("/", requireAuth, (c) =>
  c.json({
    subclasses: subclassNames(),
    subclassDetails: subclassDetails(),
    races: RACES.map((r) => r.name),
    classes: CLASSES.map((c) => c.name),
    feats: FEATS.map((f) => ({
      name: f.name,
      label: f.label,
      description: f.description,
      abilityBonus: f.abilityBonus,
    })),
    backgrounds: BACKGROUNDS.map((b) => ({
      name: b.name,
      label: b.label,
      description: b.description,
      feat: b.feat,
      featSpellList: b.featSpellList,
      abilityOptions: b.abilityOptions,
      skills: b.skills,
      tool: b.tool,
      equipment: b.equipment,
      gold: b.gold,
    })),
  }),
);
