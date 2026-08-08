import type { SpellMeta } from "./api-client";

const STORAGE_KEY = "domino-spell-pl";

export function spellNamesPlEnabled(): boolean {
  return localStorage.getItem(STORAGE_KEY) === "1";
}

export function setSpellNamesPl(enabled: boolean): void {
  localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
}

export function spellDisplayName(meta: SpellMeta | undefined, englishName: string): string {
  return spellNamesPlEnabled() && meta?.namePl ? meta.namePl : englishName;
}
