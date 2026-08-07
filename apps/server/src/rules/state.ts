import type { CampaignState } from "@domino/shared";

export function defaultCampaignState(): CampaignState {
  return {
    phase: "exploration",
    location: "The campaign's starting location",
    scene: "The adventure begins",
    worldProgress: [],
    combat: {
      active: false,
      combatants: [],
      turnIndex: 0,
      round: 1,
    },
    notes: "",
    updatedAt: new Date().toISOString(),
  };
}
