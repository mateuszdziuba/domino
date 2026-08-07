import { describe, expect, it } from "vitest";
import {
  RACES,
  CLASSES,
  buildCharacterFeatures,
  subclassesForClass,
  subclassNames,
} from "./features.js";

describe("SRD 5.2.1 races", () => {
  it("defines 8 races each with at least 2 level-1 features", () => {
    expect(RACES).toHaveLength(8);
    for (const race of RACES) {
      expect(race.features.length).toBeGreaterThanOrEqual(2);
      for (const feature of race.features) {
        expect(feature.level).toBe(1);
        expect(feature.category).toBe("race");
        expect(feature.name.length).toBeGreaterThan(0);
        expect(feature.description.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("SRD 5.2.1 classes", () => {
  it("defines 12 classes with hit die, saving throws, features and one subclass", () => {
    expect(CLASSES).toHaveLength(12);
    for (const klass of CLASSES) {
      expect(klass.hitDie).toBeGreaterThan(0);
      expect(klass.savingThrows.length).toBeGreaterThanOrEqual(2);
      expect(klass.features.length).toBeGreaterThanOrEqual(2);
      expect(klass.subclasses.length).toBeGreaterThan(0);
      for (const subclass of klass.subclasses) {
        expect(subclass.features.length).toBeGreaterThanOrEqual(1);
        expect(subclass.name.length).toBeGreaterThan(0);
      }
    }
  });

  it("keeps class features within levels 1-3 and subclasses within 1-2 features", () => {
    for (const klass of CLASSES) {
      for (const feature of klass.features) {
        expect(feature.level).toBeGreaterThanOrEqual(1);
        expect(feature.level).toBeLessThanOrEqual(3);
      }
      for (const subclass of klass.subclasses) {
        expect(subclass.features.length).toBeLessThanOrEqual(2);
      }
    }
  });
});

describe("buildCharacterFeatures", () => {
  it("returns only race and level-1 class features for a level-1 fighter", () => {
    const features = buildCharacterFeatures({
      race: "Elf",
      className: "Fighter",
      level: 1,
    });
    const raceFeatures = features.filter((f) => f.category === "race");
    const classFeatures = features.filter((f) => f.category === "class");
    const subclassFeatures = features.filter((f) => f.category === "subclass");
    expect(raceFeatures).toHaveLength(4);
    expect(classFeatures.map((f) => f.name)).toContain("Drugi oddech (Second Wind)");
    expect(classFeatures.every((f) => f.level === 1)).toBe(true);
    expect(classFeatures.map((f) => f.name)).not.toContain("Przypływ akcji (Action Surge)");
    expect(subclassFeatures).toHaveLength(0);
  });

  it("includes class features up to the character level", () => {
    const features = buildCharacterFeatures({
      race: "Human",
      className: "Fighter",
      level: 2,
    });
    const classFeatures = features.filter((f) => f.category === "class");
    expect(classFeatures.map((f) => f.name)).toContain("Przypływ akcji (Action Surge)");
  });

  it("includes subclass features for a level-3 cleric with a subclass", () => {
    const features = buildCharacterFeatures({
      race: "Human",
      className: "Cleric",
      subclass: "Domena Życia (Life Domain)",
      level: 3,
    });
    const subclassFeatures = features.filter((f) => f.category === "subclass");
    expect(subclassFeatures.map((f) => f.name)).toContain("Uczeń życia (Disciple of Life)");
    expect(subclassFeatures.map((f) => f.name)).toContain(
      "Kanał bóstwa: Zachowanie życia (Preserve Life)",
    );
  });

  it("excludes subclass features below level 3", () => {
    const features = buildCharacterFeatures({
      race: "Human",
      className: "Cleric",
      subclass: "Domena Życia (Life Domain)",
      level: 2,
    });
    expect(features.filter((f) => f.category === "subclass")).toHaveLength(0);
  });

  it("skips missing race or class without crashing", () => {
    expect(
      buildCharacterFeatures({ race: "Kobold", className: "Ninja", level: 5 }),
    ).toEqual([]);
    const onlyClass = buildCharacterFeatures({
      race: "Kobold",
      className: "Fighter",
      level: 3,
    });
    expect(onlyClass.filter((f) => f.category === "race")).toHaveLength(0);
    expect(onlyClass.filter((f) => f.category === "class")).toHaveLength(3);
    const onlyRace = buildCharacterFeatures({ race: "Human", className: "Ninja", level: 3 });
    expect(onlyRace.filter((f) => f.category === "race")).toHaveLength(2);
    expect(onlyRace.filter((f) => f.category === "class")).toHaveLength(0);
  });
});

describe("subclass helpers", () => {
  it("subclassesForClass returns the cleric subclass", () => {
    expect(subclassesForClass("Cleric")).toEqual(["Domena Życia (Life Domain)"]);
    expect(subclassesForClass("Unknown")).toEqual([]);
  });

  it("subclassNames covers all 12 classes with at least one subclass each", () => {
    const names = subclassNames();
    expect(Object.keys(names)).toHaveLength(12);
    for (const subs of Object.values(names)) {
      expect(subs.length).toBeGreaterThanOrEqual(1);
    }
  });
});
