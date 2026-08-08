import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import {
  ATTUNEMENT_LIMIT,
  EQUIPMENT_SLOTS,
  SRD_GEAR,
} from "../rules/equipment.js";

export const equipmentRoutes = new Hono();

equipmentRoutes.get("/", requireAuth, (c) =>
  c.json({
    slots: EQUIPMENT_SLOTS,
    gear: SRD_GEAR,
    attunementLimit: ATTUNEMENT_LIMIT,
  }),
);
