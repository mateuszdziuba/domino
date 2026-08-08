import { describe, expect, it } from "vitest";
import {
  ADVENTURES,
  adventureSummaries,
  buildAdventureState,
  findAdventure,
} from "./adventures.js";

describe("ADVENTURES library", () => {
  it("has exactly 6 adventures", () => {
    expect(ADVENTURES).toHaveLength(6);
  });

  it("each adventure has non-empty content within the required bounds", () => {
    for (const adventure of ADVENTURES) {
      expect(adventure.title.length).toBeGreaterThan(0);
      expect(adventure.source.length).toBeGreaterThan(0);
      expect(adventure.hook.length).toBeGreaterThan(0);
      expect(adventure.locations.length).toBeGreaterThanOrEqual(2);
      expect(adventure.plotBeats.length).toBeGreaterThanOrEqual(3);
      expect(adventure.monsters.length).toBeGreaterThanOrEqual(1);
      for (const location of adventure.locations) {
        expect(location.length).toBeGreaterThan(0);
      }
      for (const beat of adventure.plotBeats) {
        expect(beat.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("findAdventure", () => {
  it("matches titles case-insensitively by substring", () => {
    expect(findAdventure("potent")?.title).toBe("A Most Potent Brew");
    expect(findAdventure("POTENT")?.title).toBe("A Most Potent Brew");
    expect(findAdventure("wolves")?.title).toBe("The Wolves of Welton");
    expect(findAdventure("delian")?.title).toBe("The Delian Tomb");
    expect(findAdventure("wild sheep")?.title).toBe("A Wild Sheep Chase");
    expect(findAdventure("mad manor")?.title).toBe("The Mad Manor of Astabar");
    expect(findAdventure("winter")?.title).toBe("Winter's Splinter");
  });

  it("returns undefined for an unknown title", () => {
    expect(findAdventure("Przygoda o kotach")).toBeUndefined();
    expect(findAdventure("")).toBeUndefined();
  });
});

describe("adventureSummaries", () => {
  it("returns title, source, hook and locations for every adventure", () => {
    const summaries = adventureSummaries();
    expect(summaries).toHaveLength(ADVENTURES.length);
    for (let i = 0; i < ADVENTURES.length; i++) {
      const adventure = ADVENTURES[i]!;
      const summary = summaries[i]!;
      expect(summary.title).toBe(adventure.title);
      expect(summary.source).toBe(adventure.source);
      expect(summary.hook).toBe(adventure.hook);
      expect(summary.locations).toEqual(adventure.locations);
    }
  });

  it("does not leak plot beats or monsters into summaries", () => {
    for (const summary of adventureSummaries()) {
      expect(summary).not.toHaveProperty("plotBeats");
      expect(summary).not.toHaveProperty("monsters");
    }
  });
});

describe("buildAdventureState", () => {
  it("sets location to the first location and scene to the hook", () => {
    const adventure = ADVENTURES[0]!;
    const state = buildAdventureState(adventure);
    expect(state.location).toBe(adventure.locations[0]);
    expect(state.scene).toBe(adventure.hook);
  });

  it("records the adventure title in world progress", () => {
    const adventure = ADVENTURES[1]!;
    const state = buildAdventureState(adventure);
    expect(state.worldProgress).toContain(`Przygoda: ${adventure.title}`);
  });

  it("writes a compact DM summary into notes", () => {
    const adventure = ADVENTURES[2]!;
    const state = buildAdventureState(adventure);
    expect(state.notes).toContain(adventure.hook);
    expect(state.notes).toContain(adventure.plotBeats[0]);
  });

  it("honors an explicit location override", () => {
    const state = buildAdventureState(ADVENTURES[0]!, "Kaplica");
    expect(state.location).toBe("Kaplica");
  });
});
