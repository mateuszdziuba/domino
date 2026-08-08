import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  characterApi,
  featuresApi,
  type FeatInfo,
  type FeaturesCatalog,
} from "../lib/api-client";
import type { AbilityScore, Character, CharacterSheet } from "@domino/shared";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Select } from "./ui/select";
import { SubclassPicker } from "./SubclassPicker";
import { cn } from "../lib/utils";

const ASI_LEVELS = [4, 8, 12, 16, 19];

const ABILITY_OPTIONS: { key: keyof AbilityScore; label: string }[] = [
  { key: "strength", label: "Siła" },
  { key: "dexterity", label: "Zręczność" },
  { key: "constitution", label: "Kondycja" },
  { key: "intelligence", label: "Inteligencja" },
  { key: "wisdom", label: "Mądrość" },
  { key: "charisma", label: "Charyzma" },
];

const ABILITY_LABEL: Record<string, string> = Object.fromEntries(
  ABILITY_OPTIONS.map((a) => [a.key, a.label]),
);

type LevelUpDialogProps = {
  open: boolean;
  onClose: () => void;
  characterId: string;
  level: number;
  className: string;
  catalog?: FeaturesCatalog | null;
  onDone?: () => void;
};

export function LevelUpDialog({
  open,
  onClose,
  characterId,
  level,
  className,
  catalog: catalogProp,
  onDone,
}: LevelUpDialogProps) {
  const [fetchedCatalog, setFetchedCatalog] = useState<FeaturesCatalog | null>(
    catalogProp ?? null,
  );
  const [sheet, setSheet] = useState<CharacterSheet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"asi" | "feat">("asi");
  const [asiChoice, setAsiChoice] = useState<"+2" | "+1+1">("+2");
  const [primaryAbility, setPrimaryAbility] = useState<keyof AbilityScore | "">("");
  const [secondaryAbility, setSecondaryAbility] = useState<keyof AbilityScore | "">("");
  const [selectedFeat, setSelectedFeat] = useState<FeatInfo | null>(null);

  useEffect(() => {
    if (catalogProp) {
      setFetchedCatalog(catalogProp);
      return;
    }
    if (!open) return;
    let cancelled = false;
    featuresApi
      .get()
      .then((catalog) => {
        if (!cancelled) setFetchedCatalog(catalog);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [catalogProp, open]);

  useEffect(() => {
    if (!open || !characterId) return;
    let cancelled = false;
    setSheet(null);
    setError(null);
    setSavedNote(null);
    setMode("asi");
    setAsiChoice("+2");
    setPrimaryAbility("");
    setSecondaryAbility("");
    setSelectedFeat(null);
    characterApi
      .sheet(characterId)
      .then(({ sheet }) => {
        if (!cancelled) setSheet(sheet);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Nie udało się wczytać postaci");
      });
    return () => {
      cancelled = true;
    };
  }, [open, characterId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const catalog = catalogProp ?? fetchedCatalog;
  const character = sheet?.character;
  const feats = catalog?.feats ?? [];
  const asiPending =
    ASI_LEVELS.includes(level) && !(character?.asiLevels ?? []).includes(level);
  const needsSubclass =
    level >= 3 &&
    !character?.subclass &&
    (catalog?.subclassDetails?.[className] ?? []).length > 0;

  async function applyCharacter(patch: Partial<Character>) {
    if (!character || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { character: updated } = await characterApi.update(characterId, patch);
      setSheet((prev) => (prev ? { ...prev, character: updated } : prev));
      setSavedNote("Karta postaci została zaktualizowana.");
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zapisać");
    } finally {
      setBusy(false);
    }
  }

  async function onSubclassSelect(subclass: string) {
    if (!character || busy) return;
    setBusy(true);
    setError(null);
    try {
      await characterApi.update(characterId, { subclass });
      setSheet((prev) =>
        prev ? { ...prev, character: { ...prev.character, subclass } } : prev,
      );
      setSavedNote(`${character.name} przyjął subklasę ${subclass}.`);
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zapisać subklasy");
    } finally {
      setBusy(false);
    }
  }

  async function applyAsi() {
    if (!character) return;
    if (asiChoice === "+2") {
      if (!primaryAbility) {
        setError("Wybierz cechę do rozwoju.");
        return;
      }
      const scores = { ...character.abilityScores };
      scores[primaryAbility] = Math.min(scores[primaryAbility] + 2, 20);
      await applyCharacter({
        abilityScores: scores,
        asiLevels: [...(character.asiLevels ?? []), level],
      });
      return;
    }
    if (!primaryAbility || !secondaryAbility || primaryAbility === secondaryAbility) {
      setError("Wybierz dwie różne cechy do rozwoju.");
      return;
    }
    const scores = { ...character.abilityScores };
    scores[primaryAbility] = Math.min(scores[primaryAbility] + 1, 20);
    scores[secondaryAbility] = Math.min(scores[secondaryAbility] + 1, 20);
    await applyCharacter({
      abilityScores: scores,
      asiLevels: [...(character.asiLevels ?? []), level],
    });
  }

  async function applyFeat() {
    if (!character || !selectedFeat) return;
    const patch: Partial<Character> = {
      feats: [...(character.feats ?? []), selectedFeat.name],
      asiLevels: [...(character.asiLevels ?? []), level],
    };
    const bonusKey = selectedFeat.abilityBonus?.[0];
    if (bonusKey && bonusKey in character.abilityScores) {
      const key = bonusKey as keyof AbilityScore;
      patch.abilityScores = {
        ...character.abilityScores,
        [key]: Math.min(character.abilityScores[key] + 1, 20),
      };
    }
    await applyCharacter(patch);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#2e2113]/60 p-4"
      onClick={onClose}
    >
      <Card
        className="max-h-[80vh] w-full max-w-lg animate-fade-up overflow-y-auto border-[#b99f6b] shadow-[0_10px_30px_-12px_rgba(60,40,10,0.55)]"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="pb-3">
          <CardTitle>
            <span className="mr-2 text-[#a97e1f]">✦</span>
            Awans! {character?.name ?? "Postać"} osiąga poziom {level}
          </CardTitle>
          {needsSubclass && (
            <CardDescription>Wybierz subklasę ({className}):</CardDescription>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {error && <p className="text-sm text-[#8f1d1d]">{error}</p>}
          {savedNote && <p className="text-sm text-[#2e7d32]">{savedNote}</p>}
          {!character && <p className="text-sm italic text-[#7c6a45]">Czytam pergamin…</p>}
          {character && needsSubclass && (
            <SubclassPicker
              catalog={catalog}
              className={className}
              busy={busy}
              onSelect={onSubclassSelect}
            />
          )}
          {character && asiPending && (
            <div className="rounded-sm border border-[#a97e1f]/60 bg-[#f3e6c4]/50 p-3">
              <div className="font-display text-[11px] uppercase tracking-[0.14em] text-[#7a4b1d]">
                Rozwój na poziomie {level}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(
                  [
                    { key: "asi", label: "Poprawa cech (ASI)" },
                    { key: "feat", label: "Feat" },
                  ] as const
                ).map((tab) => (
                  <label
                    key={tab.key}
                    className={cn(
                      "cursor-pointer rounded-sm border px-2.5 py-1 font-display text-[10px] uppercase tracking-[0.1em] transition-colors",
                      mode === tab.key
                        ? "border-[#7a4b1d] bg-[#e8d3a0]/70 text-[#3a2c17]"
                        : "border-[#c8b184] bg-[#fbf3dd]/70 text-[#7c6a45] hover:bg-[#f0e2bd]",
                    )}
                  >
                    <input
                      type="radio"
                      name="development-mode"
                      className="sr-only"
                      checked={mode === tab.key}
                      onChange={() => setMode(tab.key)}
                    />
                    {tab.label}
                  </label>
                ))}
              </div>

              {mode === "asi" ? (
                <div className="mt-2.5 flex flex-col gap-2">
                  <div className="flex flex-col gap-1 text-xs text-[#3a2c17]">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="asi-choice"
                        checked={asiChoice === "+2"}
                        onChange={() => setAsiChoice("+2")}
                        className="accent-[#7a4b1d]"
                      />
                      +2 do jednej cechy
                    </label>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="asi-choice"
                        checked={asiChoice === "+1+1"}
                        onChange={() => setAsiChoice("+1+1")}
                        className="accent-[#7a4b1d]"
                      />
                      +1 do dwóch cech
                    </label>
                  </div>
                  <Select
                    value={primaryAbility}
                    onChange={(e) =>
                      setPrimaryAbility(e.target.value as keyof AbilityScore | "")
                    }
                  >
                    <option value="">— wybierz cechę —</option>
                    {ABILITY_OPTIONS.map((ability) => (
                      <option
                        key={ability.key}
                        value={ability.key}
                        disabled={character.abilityScores[ability.key] >= 20}
                      >
                        {ability.label}
                        {character.abilityScores[ability.key] >= 20 ? " (maks.)" : ""}
                      </option>
                    ))}
                  </Select>
                  {asiChoice === "+1+1" && (
                    <Select
                      value={secondaryAbility}
                      onChange={(e) =>
                        setSecondaryAbility(e.target.value as keyof AbilityScore | "")
                      }
                    >
                      <option value="">— wybierz drugą cechę —</option>
                      {ABILITY_OPTIONS.map((ability) => (
                        <option
                          key={ability.key}
                          value={ability.key}
                          disabled={
                            ability.key === primaryAbility ||
                            character.abilityScores[ability.key] >= 20
                          }
                        >
                          {ability.label}
                          {character.abilityScores[ability.key] >= 20 ? " (maks.)" : ""}
                        </option>
                      ))}
                    </Select>
                  )}
                  <Button
                    type="button"
                    disabled={busy}
                    onClick={applyAsi}
                    className="self-end"
                  >
                    Zastosuj
                  </Button>
                </div>
              ) : (
                <div className="mt-2.5 flex flex-col gap-1.5">
                  {feats.length === 0 ? (
                    <p className="text-xs italic text-[#7c6a45]">
                      Katalog featów niedostępny.
                    </p>
                  ) : (
                    <div className="scroll-parchment flex max-h-52 flex-col gap-1.5 overflow-y-auto pr-1">
                      {feats.map((feat) => (
                        <button
                          key={feat.name}
                          type="button"
                          onClick={() => setSelectedFeat(feat)}
                          className={cn(
                            "rounded-sm border px-2.5 py-1.5 text-left transition-colors",
                            selectedFeat?.name === feat.name
                              ? "border-[#7a4b1d] bg-[#e8d3a0]/70"
                              : "border-[#c8b184] bg-[#fbf3dd]/70 hover:bg-[#f0e2bd]",
                          )}
                        >
                          <span className="block font-display text-xs tracking-[0.06em] text-[#2e2113]">
                            {feat.label}
                          </span>
                          <span className="block text-[11px] text-[#7c6a45]">
                            {feat.description}
                          </span>
                          {feat.abilityBonus && feat.abilityBonus.length > 0 && (
                            <span className="mt-0.5 block font-display text-[10px] uppercase tracking-[0.08em] text-[#7a4b1d]">
                              Cecha: +1 do{" "}
                              {feat.abilityBonus
                                .map((k) => ABILITY_LABEL[k] ?? k)
                                .join(", ")}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  <Button
                    type="button"
                    disabled={busy || !selectedFeat}
                    onClick={applyFeat}
                    className="self-end"
                  >
                    Zastosuj
                  </Button>
                </div>
              )}
            </div>
          )}
          <p className="text-xs text-[#7c6a45]">
            Przy awansie możesz też dodać lub zamienić zaklęcia — zrób to w{" "}
            <Link
              to="/app/characters/$id"
              params={{ id: characterId }}
              className="font-display text-[11px] uppercase tracking-[0.1em] text-[#7a4b1d] underline-offset-4 hover:underline"
            >
              arkuszu postaci
            </Link>
            .
          </p>
          <Button
            type="button"
            variant="secondary"
            className="self-end"
            onClick={onClose}
          >
            Później
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
