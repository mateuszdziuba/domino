import { describe, expect, it } from "vitest";
import {
  RACES,
  CLASSES,
  FEATS,
  findFeat,
  buildCharacterFeatures,
  subclassesForClass,
  subclassNames,
  subclassLevelForClass,
  subclassDetails,
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

  it("keeps class features within levels 1-20 and subclasses within 1-2 features", () => {
    for (const klass of CLASSES) {
      for (const feature of klass.features) {
        expect(feature.level).toBeGreaterThanOrEqual(1);
        expect(feature.level).toBeLessThanOrEqual(20);
      }
      for (const subclass of klass.subclasses) {
        expect(subclass.features.length).toBeLessThanOrEqual(2);
      }
    }
  });

  it("covers every class level 4-20 with class or subclass features", () => {
    for (const klass of CLASSES) {
      const covered = new Set([
        ...klass.features.map((f) => f.level),
        ...klass.subclasses.flatMap((s) => s.features.map((f) => f.level)),
      ]);
      for (let level = 4; level <= 20; level++) {
        expect(covered.has(level), `${klass.name} has no feature at level ${level}`).toBe(
          true,
        );
      }
    }
  });

  it("includes ASI entries at levels 4, 8, 12, 16 and 19 for every class", () => {
    for (const klass of CLASSES) {
      for (const level of [4, 8, 12, 16, 19]) {
        const names = klass.features.filter((f) => f.level === level).map((f) => f.name);
        expect(
          names,
          `${klass.name} missing ASI at level ${level}`,
        ).toContain("Poprawa cech (ASI)");
      }
    }
  });

  it("gives Extra Attack to martial classes at level 5 and Fighter also at 11", () => {
    const martial = ["Barbarian", "Fighter", "Monk", "Paladin", "Ranger"];
    for (const className of martial) {
      const klass = CLASSES.find((c) => c.name === className);
      expect(klass).toBeDefined();
      expect(
        klass!.features.some((f) => f.level === 5 && /extra attack/i.test(f.name)),
        `${className} missing Extra Attack at level 5`,
      ).toBe(true);
    }
    const fighter = CLASSES.find((c) => c.name === "Fighter");
    expect(
      fighter!.features.some((f) => f.level === 11 && /extra attack/i.test(f.name)),
    ).toBe(true);
  });
});

describe("SRD 5.2.1 feats", () => {
  it("defines at least 30 feats with name, label and description", () => {
    expect(FEATS.length).toBeGreaterThanOrEqual(30);
    const names = new Set<string>();
    for (const feat of FEATS) {
      expect(feat.name.length).toBeGreaterThan(0);
      expect(feat.label.length).toBeGreaterThan(0);
      expect(feat.description.length).toBeGreaterThan(0);
      expect(names.has(feat.name)).toBe(false);
      names.add(feat.name);
    }
  });

  it("findFeat matches by English name and Polish label, case-insensitively", () => {
    expect(findFeat("Alert")?.label).toBe("Czujność");
    expect(findFeat("czujność")?.name).toBe("Alert");
    expect(findFeat(" tOuGh ")?.name).toBe("Tough");
    expect(findFeat("Twardziel")?.name).toBe("Tough");
    expect(findFeat("NoSuchFeat")).toBeUndefined();
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

  it("includes the character's feats as feat features with the ASI level", () => {
    const features = buildCharacterFeatures({
      race: "Human",
      className: "Fighter",
      level: 10,
      feats: ["Tough"],
      asiLevels: [8],
    });
    const featFeatures = features.filter((f) => f.category === "feat");
    expect(featFeatures).toHaveLength(1);
    const feat = featFeatures[0]!;
    expect(feat.name).toBe("Twardziel");
    expect(feat.description.length).toBeGreaterThan(0);
    expect(feat.level).toBe(8);
  });

  it("matches feats by Polish label and defaults to level 4 without asiLevels", () => {
    const features = buildCharacterFeatures({
      race: "Human",
      className: "Fighter",
      level: 10,
      feats: ["Czujność"],
    });
    const featFeatures = features.filter((f) => f.category === "feat");
    expect(featFeatures).toHaveLength(1);
    const feat = featFeatures[0]!;
    expect(feat.name).toBe("Czujność");
    expect(feat.level).toBe(4);
  });

  it("ignores unknown feat names gracefully", () => {
    const features = buildCharacterFeatures({
      race: "Human",
      className: "Fighter",
      level: 10,
      feats: ["NoSuchFeat", "Tough", ""],
    });
    const featFeatures = features.filter((f) => f.category === "feat");
    expect(featFeatures).toHaveLength(1);
    expect(featFeatures[0]!.name).toBe("Twardziel");
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

  it("subclassLevelForClass returns the subclass level for known classes", () => {
    expect(subclassLevelForClass("Cleric")).toBe(3);
    expect(subclassLevelForClass("Fighter")).toBe(3);
    expect(subclassLevelForClass("Unknown")).toBeNull();
  });

  it("subclassDetails covers all 12 classes with named subclasses and features", () => {
    const details = subclassDetails();
    expect(Object.keys(details)).toHaveLength(12);
    for (const classSubclasses of Object.values(details)) {
      expect(classSubclasses.length).toBeGreaterThanOrEqual(1);
      for (const subclass of classSubclasses) {
        expect(subclass.name.length).toBeGreaterThan(0);
        expect(subclass.features.length).toBeGreaterThanOrEqual(1);
        for (const feature of subclass.features) {
          expect(feature.name.length).toBeGreaterThan(0);
          expect(feature.description.length).toBeGreaterThan(0);
        }
      }
    }
  });
});
