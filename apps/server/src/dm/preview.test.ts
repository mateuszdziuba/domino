import { describe, expect, it } from "vitest";
import { shouldAutoGenerateCombat } from "./preview.js";

describe("shouldAutoGenerateCombat", () => {
  it("detects explicit combat intent", () => {
    expect(shouldAutoGenerateCombat("I attack the goblin")).toBe(true);
    expect(shouldAutoGenerateCombat("We charge into the ambush")).toBe(true);
    expect(shouldAutoGenerateCombat("I draw my sword")).toBe(true);
    expect(shouldAutoGenerateCombat("the bandits attack us!")).toBe(true);
  });

  it("ignores peaceful messages", () => {
    expect(shouldAutoGenerateCombat("I look around the room")).toBe(false);
    expect(shouldAutoGenerateCombat("I talk to the innkeeper")).toBe(false);
    expect(shouldAutoGenerateCombat("we rest by the fire")).toBe(false);
    expect(shouldAutoGenerateCombat("I search the desk")).toBe(false);
  });
});
