import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";

export type ImageProvider = "pollinations" | "gemini" | "off";

const IMAGES_DIR = fileURLToPath(new URL("../../data/images", import.meta.url));

export function imageProvider(): ImageProvider {
  const provider = (process.env.IMAGE_PROVIDER ?? "pollinations").toLowerCase();
  if (provider === "gemini") return "gemini";
  if (provider === "off") return "off";
  return "pollinations";
}

export function isImageConfigured(): boolean {
  const provider = imageProvider();
  if (provider === "off") return false;
  if (provider === "gemini") return Boolean(process.env.GEMINI_API_KEY);
  return true;
}

export type ImageResult = { ok: true; url: string } | { ok: false; error: string };

function saveImage(buffer: Buffer): string {
  mkdirSync(IMAGES_DIR, { recursive: true });
  const file = `${Date.now()}-${randomUUID().slice(0, 8)}.jpg`;
  writeFileSync(resolve(IMAGES_DIR, file), buffer);
  return `/static/images/${file}`;
}

export type ImageReference = { url?: string; base64?: string };

export async function generateImage(
  prompt: string,
  opts?: { width?: number; height?: number; reference?: ImageReference },
): Promise<ImageResult> {
  const provider = imageProvider();
  if (provider === "off") {
    return { ok: false, error: "Generowanie obrazów jest wyłączone." };
  }
  const width = opts?.width ?? 512;
  const height = opts?.height ?? 512;
  try {
    if (provider === "gemini") {
      const key = process.env.GEMINI_API_KEY;
      if (!key) return { ok: false, error: "Brak klucza GEMINI_API_KEY." };
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: opts?.reference?.base64
                  ? [
                      {
                        inlineData: {
                          mimeType: "image/jpeg",
                          data: opts.reference.base64,
                        },
                      },
                      { text: prompt },
                    ]
                  : [{ text: prompt }],
              },
            ],
          }),
        },
      );
      if (!response.ok) {
        return { ok: false, error: `Gemini API error ${response.status}.` };
      }
      const json = (await response.json()) as {
        candidates?: { content?: { parts?: { inlineData?: { data?: string } }[] } }[];
      };
      const data = json.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!data) return { ok: false, error: "Gemini nie zwrócił obrazu." };
      return { ok: true, url: saveImage(Buffer.from(data, "base64")) };
    }
    const referenceUrl = opts?.reference?.url?.startsWith("http")
      ? opts.reference.url
      : undefined;
    const response = await fetch(
      `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&nologo=true${
        referenceUrl ? `&image=${encodeURIComponent(referenceUrl)}` : ""
      }`,
    );
    if (!response.ok) {
      return { ok: false, error: `Pollinations error ${response.status}.` };
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    return { ok: true, url: saveImage(buffer) };
  } catch {
    return { ok: false, error: "Nie udało się wygenerować obrazu." };
  }
}

export function portraitFileFromUrl(url: string): string | null {
  const match = url.match(/^\/static\/images\/([^/]+)$/);
  if (!match) return null;
  return resolve(IMAGES_DIR, match[1]!);
}

export async function loadPortraitReference(url: string): Promise<ImageReference> {
  if (url.startsWith("http")) return { url };
  const file = portraitFileFromUrl(url);
  if (!file) return {};
  try {
    const { readFile } = await import("node:fs/promises");
    const buffer = await readFile(file);
    return { base64: buffer.toString("base64") };
  } catch {
    return {};
  }
}

export function buildPortraitPrompt(character: {
  name: string;
  race: string;
  className: string;
  level: number;
}): string {
  return `Fantasy character portrait, oil painting style: ${character.name}, a level ${character.level} ${character.race} ${character.className}, detailed face, heroic pose, warm parchment-toned background`;
}
