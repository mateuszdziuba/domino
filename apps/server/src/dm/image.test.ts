import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { existsSync, rmSync } from "node:fs";
import { buildPortraitPrompt, generateImage, isImageConfigured } from "./image.js";

const IMAGES_DIR = new URL("../../data/images", import.meta.url).pathname;

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.IMAGE_PROVIDER;
  delete process.env.GEMINI_API_KEY;
});

afterAll(() => {
  rmSync(IMAGES_DIR, { recursive: true, force: true });
});

describe("buildPortraitPrompt", () => {
  it("builds a prompt from the character", () => {
    const prompt = buildPortraitPrompt({
      name: "Elara",
      race: "Elf",
      className: "Cleric",
      level: 3,
    });
    expect(prompt).toContain("Elara");
    expect(prompt).toContain("level 3 Elf Cleric");
    expect(prompt).toContain("portrait");
  });
});

describe("generateImage", () => {
  it("generates via pollinations (default, no key) and saves a file", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), { status: 200 }),
      ),
    );
    const result = await generateImage("a goblin ambush");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.url).toMatch(/^\/static\/images\/.+\.jpg$/);
    const file = IMAGES_DIR + "/" + result.url.split("/").pop();
    expect(existsSync(file)).toBe(true);
    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(url).toContain("image.pollinations.ai/prompt/");
    expect(url).toContain("nologo=true");
  });

  it("returns an error when the provider is off", async () => {
    process.env.IMAGE_PROVIDER = "off";
    const result = await generateImage("anything");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("wyłączone");
  });

  it("uses the gemini provider when configured", async () => {
    process.env.IMAGE_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ inlineData: { data: "aGVsbG8=" } }],
                },
              },
            ],
          }),
          { status: 200 },
        ),
      ),
    );
    const result = await generateImage("a portrait");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.url).toMatch(/^\/static\/images\/.+\.jpg$/);
    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(url).toContain("generativelanguage.googleapis.com");
  });

  it("fails gracefully on fetch errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    const result = await generateImage("anything");
    expect(result.ok).toBe(false);
  });
});

describe("isImageConfigured", () => {
  it("is true for the default provider and false when off", () => {
    expect(isImageConfigured()).toBe(true);
    process.env.IMAGE_PROVIDER = "off";
    expect(isImageConfigured()).toBe(false);
  });

  it("requires a gemini key for the gemini provider", () => {
    process.env.IMAGE_PROVIDER = "gemini";
    expect(isImageConfigured()).toBe(false);
    process.env.GEMINI_API_KEY = "k";
    expect(isImageConfigured()).toBe(true);
  });
});
