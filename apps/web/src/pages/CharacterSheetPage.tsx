import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, ScrollText, Shield, Sparkles, Swords, Wand2, Upload } from "lucide-react";
import {
  characterApi,
  equipmentApi,
  featuresApi,
  spellbookApi,
  type EquipmentCatalog,
  type FeaturesCatalog,
  type SpellMeta,
} from "../lib/api-client";
import type { CharacterSheet, EquipmentSlotInfo, InventoryItem, SrdGearItem } from "@domino/shared";
import { Badge } from "../components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Select } from "../components/ui/select";
import { cn } from "../lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/ui/tooltip";
import { SubclassPicker } from "../components/SubclassPicker";
import { LevelUpDialog } from "../components/LevelUpDialog";
import { SKILL_ALIASES, SKILL_DESCRIPTIONS } from "../lib/chat-tooltips";
import { spellDisplayName } from "../lib/spell-lang";
import { ItemIcon } from "../lib/item-icons";

const ASI_LEVELS = [4, 8, 12, 16, 19];

const ABILITY_LABELS: Record<string, string> = {
  strength: "STR",
  dexterity: "DEX",
  constitution: "CON",
  intelligence: "INT",
  wisdom: "WIS",
  charisma: "CHA",
};

const XP_BY_LEVEL = [
  300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000,
  140000, 165000, 195000, 265000, 305000, 355000,
];

const GEAR_CATEGORY_LABELS: Record<SrdGearItem["category"], string> = {
  armor: "Zbroje",
  weapon: "Broń",
  gear: "Wyposażenie",
  magic: "Magiczne przedmioty",
};

const SLOT_FALLBACK: EquipmentSlotInfo[] = [
  { key: "head", label: "Głowa" },
  { key: "neck", label: "Szyja" },
  { key: "back", label: "Plecy" },
  { key: "body", label: "Zbroja" },
  { key: "belt", label: "Pas" },
  { key: "hands", label: "Dłonie" },
  { key: "feet", label: "Stopy" },
  { key: "ring", label: "Pierścień" },
  { key: "ring", label: "Pierścień" },
  { key: "weapon", label: "Broń" },
];

const ATTUNEMENT_LIMIT_DEFAULT = 3;

function spellEffectSummary(meta: SpellMeta): string {
  const effect = meta.effect as Omit<SpellMeta["effect"], "kind"> & {
    kind: string;
    condition?: string;
  };
  if (effect.kind === "damage") {
    const dice = [effect.dice, effect.damageType].filter(Boolean).join(" ");
    const extra = effect.attack
      ? ", atak"
      : effect.save
        ? `, rzut obronny ${effect.save}`
        : "";
    return `${dice}${extra}`;
  }
  if (effect.kind === "heal" || effect.kind === "heal_all") {
    return `${effect.dice ?? ""}${effect.mod ? "+mod" : ""} leczenia`;
  }
  switch (effect.kind) {
    case "condition_apply":
      return `nakłada stan: ${effect.condition ?? "?"}`;
    case "condition_remove":
      return "usuwa stan";
    case "restore":
      return "leczenie stanów/wyczerpania";
    case "revive":
      return "wskrzeszenie";
    case "stabilize":
      return "stabilizacja";
    default:
      return "—";
  }
}

function SectionTitle({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4 text-[#a97e1f]" />
      <span className="font-display text-xs uppercase tracking-[0.16em] text-[#4a3417]">
        {children}
      </span>
      <span className="h-px flex-1 bg-gradient-to-r from-[#a97e1f]/50 to-transparent" />
    </div>
  );
}

export default function CharacterSheetPage() {
  const { id } = useParams({ from: "/app/characters/$id" });
  const [sheet, setSheet] = useState<CharacterSheet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [registry, setRegistry] = useState<SpellMeta[] | null>(null);
  const [featuresCatalog, setFeaturesCatalog] = useState<FeaturesCatalog | null>(null);
  const [equipment, setEquipment] = useState<EquipmentCatalog | null>(null);
  const [pendingSlots, setPendingSlots] = useState<Record<string, string>>({});
  const [pendingGear, setPendingGear] = useState("");
  const [attuneError, setAttuneError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [imageConfigured, setImageConfigured] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [devDialogOpen, setDevDialogOpen] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");

  useEffect(() => {
    characterApi.imageStatus().then(({ configured }) => setImageConfigured(configured)).catch(() => {});
    spellbookApi.list().then((r) => setRegistry(r.spells)).catch(() => {});
    featuresApi.get().then(setFeaturesCatalog).catch(() => {});
    equipmentApi.get().then(setEquipment).catch(() => {});
  }, []);

  const loadSheet = useCallback(() => {
    if (!id) return;
    characterApi
      .sheet(id)
      .then(({ sheet }) => {
        setSheet(sheet);
        setNotesDraft(sheet.character.notes ?? "");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Nie udało się wczytać karty postaci"));
  }, [id]);

  useEffect(() => {
    loadSheet();
  }, [loadSheet]);

  if (error) {
    return (
      <div className="mx-auto max-w-4xl">
        <p className="text-[#8f1d1d]">{error}</p>
        <Link to="/app/characters" className="font-display text-[11px] uppercase tracking-[0.1em] text-[#7a4b1d] underline-offset-4 hover:underline">
          Wróć do postaci
        </Link>
      </div>
    );
  }

  if (!sheet) return <div className="mx-auto max-w-4xl italic text-[#7c6a45]">Czytam pergamin…</div>;

  const { character, abilityModifiers, savingThrows, skills, attacks, spellcasting, spellSlots } = sheet;

  async function toggleSpell(name: string) {
    if (saving) return;
    const known = character.spells ?? [];
    const next = known.includes(name) ? known.filter((s) => s !== name) : [...known, name];
    setSaving(true);
    setSaveError(null);
    try {
      const { character: updated } = await characterApi.update(character.id, { spells: next });
      setSheet((prev) => (prev ? { ...prev, character: updated } : prev));
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Nie udało się zapisać");
    } finally {
      setSaving(false);
    }
  }

  async function selectSubclass(subclass: string) {
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const { character: updated } = await characterApi.update(character.id, { subclass });
      setSheet((prev) => (prev ? { ...prev, character: updated } : prev));
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Nie udało się zapisać");
    } finally {
      setSaving(false);
    }
  }

  const inventory = character.inventory ?? [];
  const totalWeight = inventory.reduce(
    (sum, item) => sum + (item.weight ?? 0) * (item.quantity ?? 1),
    0,
  );
  const carryingCapacity = character.abilityScores.strength * 15;
  const overloaded = totalWeight > carryingCapacity;
  const attunementLimit = equipment?.attunementLimit ?? ATTUNEMENT_LIMIT_DEFAULT;
  const attunedCount = inventory.filter((item) => item.attuned).length;
  const catalogSlots = equipment?.slots ?? SLOT_FALLBACK;
  const slotTiles: EquipmentSlotInfo[] = (() => {
    const rest = catalogSlots.filter((s) => s.key !== "ring");
    const rings = catalogSlots.filter((s) => s.key === "ring");
    if (rings.length === 0) {
      return [...rest, { key: "ring", label: "Pierścień" }, { key: "ring", label: "Pierścień" }];
    }
    if (rings.length === 1) {
      return [...rest, rings[0]!, { key: "ring", label: rings[0]!.label }];
    }
    return catalogSlots;
  })();
  const slotOptions = catalogSlots.filter(
    (s, i, arr) => arr.findIndex((x) => x.key === s.key) === i,
  );
  const gearByName = new Map(
    (equipment?.gear ?? []).map((gear) => [gear.name.toLowerCase(), gear]),
  );
  const gearGroups = (["armor", "weapon", "gear", "magic"] as const)
    .map((category) => ({
      category,
      label: GEAR_CATEGORY_LABELS[category],
      items: (equipment?.gear ?? []).filter((g) => g.category === category),
    }))
    .filter((group) => group.items.length > 0);
  function suggestedSlotFor(item: InventoryItem): string {
    return gearByName.get(item.name.toLowerCase())?.slot ?? "";
  }

  async function patchInventory(next: InventoryItem[]) {
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const { character: updated } = await characterApi.update(character.id, { inventory: next });
      setSheet((prev) => (prev ? { ...prev, character: updated } : prev));
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Nie udało się zapisać");
    } finally {
      setSaving(false);
    }
  }

  function equipItem(id: string, slot: string) {
    if (!slot || slot === "") return;
    setAttuneError(null);
    patchInventory(inventory.map((item) => (item.id === id ? { ...item, slot } : item)));
  }

  function unequipItem(id: string) {
    if (saving) return;
    setAttuneError(null);
    patchInventory(
      inventory.map((item) => {
        if (item.id !== id) return item;
        const { slot: _slot, ...rest } = item;
        return rest;
      }),
    );
  }

  function toggleAttune(id: string) {
    if (saving) return;
    const item = inventory.find((i) => i.id === id);
    if (!item) return;
    const nextAttuned = !item.attuned;
    if (nextAttuned && attunedCount >= attunementLimit) {
      setAttuneError("Maksymalnie 3 atunementy (SRD).");
      return;
    }
    setAttuneError(null);
    patchInventory(
      inventory.map((i) => (i.id === id ? { ...i, attuned: nextAttuned } : i)),
    );
  }

  function addGear(gear: SrdGearItem) {
    if (saving) return;
    const attuned = gear.attuned ?? false;
    if (attuned && attunedCount >= attunementLimit) {
      setAttuneError("Maksymalnie 3 atunementy (SRD).");
      return;
    }
    setAttuneError(null);
    setPendingGear("");
    const next: InventoryItem[] = [
      ...inventory,
      {
        id: crypto.randomUUID(),
        name: gear.name,
        quantity: 1,
        weight: gear.weight,
        description: gear.description,
        slot: gear.slot,
        attuned,
      },
    ];
    patchInventory(next);
  }

  function slotLabelFor(slot?: string): string | undefined {
    return slotOptions.find((s) => s.key === slot)?.label;
  }

  const xp = character.xp ?? 0;
  const maxedOut = character.level >= 20;
  const nextThreshold = XP_BY_LEVEL[Math.min(character.level - 1, XP_BY_LEVEL.length - 1)]!;
  const prevThreshold = character.level <= 1 ? 0 : XP_BY_LEVEL[character.level - 2]!;
  const xpProgress = maxedOut
    ? 100
    : Math.max(0, Math.min(100, ((xp - prevThreshold) / Math.max(nextThreshold - prevThreshold, 1)) * 100));
  const hitDiceAvailable = Math.max(0, character.level - (character.hitDiceUsed ?? 0));
  const exhaustion = character.exhaustion ?? 0;
  const developmentAvailable =
    ASI_LEVELS.includes(character.level) &&
    !(character.asiLevels ?? []).includes(character.level);

  return (
    <div className="mx-auto max-w-4xl">
      {developmentAvailable && (
        <Card className="mb-4 border-[#a97e1f]/70 bg-[#f3e6c4]/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="size-4 text-[#a97e1f]" />
              Rozwój dostępny (poziom {character.level})
            </CardTitle>
            <CardDescription className="not-italic">
              Wybierz poprawę cech (ASI) lub feat z katalogu SRD.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" onClick={() => setDevDialogOpen(true)}>
              Wybierz rozwój
            </Button>
          </CardContent>
        </Card>
      )}
      {character.level >= 3 &&
        !character.subclass &&
        (featuresCatalog?.subclassDetails?.[character.className] ?? []).length > 0 && (
          <Card className="mb-4 border-[#a97e1f]/70 bg-[#f3e6c4]/60">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Sparkles className="size-4 text-[#a97e1f]" />
                Wybierz subklasę
              </CardTitle>
              <CardDescription className="not-italic">
                Osiągnąłeś poziom 3 — wybierz ścieżkę klasy {character.className}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SubclassPicker
                className={character.className}
                catalog={featuresCatalog}
                busy={saving}
                onSelect={selectSubclass}
              />
              {saveError && <p className="mt-2 text-sm text-[#8f1d1d]">{saveError}</p>}
            </CardContent>
          </Card>
        )}

      <div className="mb-4 flex items-center gap-3">
        <Link to="/app/characters" className="text-[#7c6a45] hover:text-[#4a3417]">
          <ArrowLeft className="size-4" />
        </Link>
        <div className="flex flex-col items-center gap-1.5">
          {character.portraitUrl && (
            <img
              src={character.portraitUrl}
              alt={`Portret ${character.name}`}
              className="h-24 w-24 shrink-0 rounded-sm border border-[#b99f6b] object-cover object-top shadow-[0_4px_12px_-4px_rgba(60,40,10,0.4)]"
            />
          )}
          <div className="flex items-center gap-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploading(true);
                  setUploadError(null);
                  characterApi
                    .uploadPortrait(character.id, file)
                    .then(({ portraitUrl }) => {
                      loadSheet();
                      void portraitUrl;
                    })
                    .catch((err) =>
                      setUploadError(err instanceof Error ? err.message : "Nie udało się przesłać"),
                    )
                    .finally(() => setUploading(false));
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 font-display text-[10px] uppercase tracking-[0.1em] text-[#7c6a45] hover:text-[#3a2c17]"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="size-3.5" />
                {uploading ? "Wysyłanie…" : "Prześlij"}
              </Button>
              <TooltipProvider delayDuration={250}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 font-display text-[10px] uppercase tracking-[0.1em] text-[#7c6a45] hover:text-[#3a2c17]"
                      disabled={generating || !imageConfigured}
                      onClick={() => {
                        setGenerating(true);
                        setUploadError(null);
                        characterApi
                          .generatePortrait(character.id)
                          .then(() => loadSheet())
                          .catch((err) =>
                            setUploadError(err instanceof Error ? err.message : "Nie udało się wygenerować"),
                          )
                          .finally(() => setGenerating(false));
                      }}
                    >
                      <Sparkles className="size-3.5" />
                      {generating ? "Generuję…" : "Wygeneruj portret"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <span className="text-[11px] leading-relaxed text-[#f6ead0]">
                      Generuje portret postaci w stylu olejnym; wgrany portret (jeśli jest) służy jako
                      referencja.
                    </span>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            {uploadError && <p className="text-xs text-[#8f1d1d]">{uploadError}</p>}
          </div>
        <div>
          <h1 className="text-2xl tracking-[0.1em] text-[#3a2c17]">{character.name}</h1>
          <p className="text-sm text-[#7c6a45]">
            {character.race} {character.className}
            {character.background ? ` · ${character.background}` : ""} · poziom {character.level}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-display text-[10px] uppercase tracking-[0.14em] text-[#7c6a45]">
              {maxedOut ? `XP ${xp} · maks. poziom` : `XP ${xp} / ${nextThreshold}`}
            </span>
            <span className="h-1.5 w-40 overflow-hidden rounded-full bg-[#dcc89a]">
              <span
                className="block h-full rounded-full bg-[#7a4b1d]"
                style={{ width: `${xpProgress}%` }}
              />
            </span>
            <TooltipProvider delayDuration={250}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="font-display text-[10px] uppercase tracking-[0.14em] text-[#7c6a45]">
                    Kości życia: {hitDiceAvailable}/{character.level}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <span className="text-[11px] leading-relaxed text-[#f6ead0]">
                    Krótki odpoczynek pozwala spędzić kości życia, aby się leczyć (kość klasy +
                    modyfikator Kondycji). Długi odpoczynek przywraca połowę z nich.
                  </span>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="font-display text-[10px] uppercase tracking-[0.14em] text-[#7c6a45]">
                    Złoto: {character.gold ?? 0} szt.
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <span className="text-[11px] leading-relaxed text-[#f6ead0]">
                    Złoto zdobywane z łupów i nagród (DM przyznaje je narzędziem grant_loot).
                  </span>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className={cn(
                      "font-display text-[10px] uppercase tracking-[0.14em]",
                      overloaded ? "text-[#8f1d1d]" : "text-[#a97e1f]",
                    )}
                  >
                    Ładowność: {totalWeight} / {carryingCapacity} lb
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <span className="text-[11px] leading-relaxed text-[#f6ead0]">
                    {overloaded
                      ? "Przeciążony — szybkość zmniejszona o 10 stóp (SRD)."
                      : "Ładowność: łączna waga przedmiotów (waga × ilość) do limitu Siła × 15 funtów (SRD)."}
                  </span>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="font-display text-[10px] uppercase tracking-[0.14em] text-[#7c6a45]">
                    Wyczerpanie:{" "}
                    <span
                      className={cn(
                        exhaustion >= 6
                          ? "text-[#8f1d1d]"
                          : exhaustion >= 3
                            ? "text-[#a83f22]"
                            : "text-inherit",
                      )}
                    >
                      {exhaustion}/6
                    </span>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <span className="text-[11px] leading-relaxed text-[#f6ead0]">
                    Poziomy wyczerpania (SRD): 1. Utrudnienie w testach cech; 2. Szybkość
                    zmniejszona o połowę; 3. Utrudnienie w atakach i rzutach obronnych;
                    4. Maksymalne HP zmniejszone o połowę; 5. Szybkość równa 0; 6. Śmierć.
                  </span>
                </TooltipContent>
              </Tooltip>
              {character.inspiration && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="font-display text-[10px] uppercase tracking-[0.14em] text-[#a97e1f]">
                      ✦ Inspiracja
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <span className="text-[11px] leading-relaxed text-[#f6ead0]">
                      Inspiracja daje przewagę na jeden rzut. DM przyznaje ją za wybitną grę.
                    </span>
                  </TooltipContent>
                </Tooltip>
              )}
            </TooltipProvider>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap justify-end gap-2">
          <Badge variant="secondary">HP {character.currentHp}/{character.maxHp}</Badge>
          <Badge variant="outline">AC {character.armorClass}</Badge>
          <Badge variant="outline">Szybkość {character.speed}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="border-[#b99f6b]">
          <CardHeader className="pb-2">
            <SectionTitle icon={Shield}>Wartości cech</SectionTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(character.abilityScores).map(([ability, score]) => (
                <div
                  key={ability}
                  className="rounded-sm border border-[#b99f6b] bg-[#fbf3dd]/70 p-2 text-center shadow-[inset_0_1px_3px_rgba(90,60,20,0.1)]"
                >
                  <div className="font-display text-[10px] uppercase tracking-[0.14em] text-[#7c6a45]">
                    {ABILITY_LABELS[ability]}
                  </div>
                  <div className="font-display text-2xl text-[#2e2113]">{score}</div>
                  <div className="text-sm text-[#a97e1f]">
                    {abilityModifiers[ability as keyof typeof abilityModifiers] >= 0 ? "+" : ""}
                    {abilityModifiers[ability as keyof typeof abilityModifiers]}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#b99f6b]">
          <CardHeader className="pb-2">
            <SectionTitle icon={Shield}>Rzuty obronne</SectionTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {savingThrows.map((st) => (
                <div
                  key={st.ability}
                  className={cn(
                    "rounded-sm border p-2 text-center shadow-[inset_0_1px_3px_rgba(90,60,20,0.1)]",
                    st.proficient
                      ? "border-[#a97e1f] bg-[#e8d3a0]/60"
                      : "border-[#b99f6b] bg-[#fbf3dd]/70",
                  )}
                >
                  <div className="font-display text-[10px] uppercase tracking-[0.14em] text-[#7c6a45]">
                    {ABILITY_LABELS[st.ability]}
                    {st.proficient && <span className="ml-1 text-[#a97e1f]">✦</span>}
                  </div>
                  <div className={cn("font-display text-lg", st.proficient ? "text-[#2e2113]" : "text-[#7c6a45]")}>
                    {st.mod >= 0 ? "+" : ""}
                    {st.mod}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#b99f6b]">
          <CardHeader className="pb-2">
            <SectionTitle icon={Sparkles}>Umiejętności</SectionTitle>
          </CardHeader>
          <CardContent className="scroll-parchment max-h-[420px] overflow-y-auto pr-1">
            <TooltipProvider delayDuration={250}>
              <div className="flex flex-col gap-px">
                {skills.map((skill) => (
                  <Tooltip key={skill.key}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "flex items-center justify-between rounded-sm px-2 py-[3px] text-sm",
                          skill.proficient && "bg-[#e8d3a0]/50",
                        )}
                      >
                          <span className="flex items-center gap-2">
                            <span className={cn("w-3 text-center text-[10px]", skill.proficient ? "text-[#a97e1f]" : "text-transparent")}>
                              ✦
                            </span>
                            {SKILL_ALIASES[skill.key]?.[1] ?? skill.label}
                            <span className="text-xs text-[#7c6a45]">{ABILITY_LABELS[skill.ability]}</span>
                          </span>
                        <span className={cn("font-display", skill.proficient ? "text-[#2e2113]" : "text-[#7c6a45]")}>
                          {skill.mod >= 0 ? "+" : ""}
                          {skill.mod}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="flex flex-col gap-1">
                        <span className="font-display text-xs tracking-[0.08em] text-[#e8c56a]">
                          {skill.label}
                        </span>
                        <span className="text-[11px] leading-relaxed text-[#f6ead0]">
                          {SKILL_DESCRIPTIONS[skill.key] ?? ""}
                        </span>
                        <span className="text-[10px] text-[#c9b183]">
                          Cecha: {ABILITY_LABELS[skill.ability]} · Modyfikator: {skill.mod >= 0 ? "+" : ""}
                          {skill.mod} · {skill.proficient ? "Biegłość" : "Brak biegłości"}
                        </span>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </TooltipProvider>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="border-[#b99f6b]">
            <CardHeader className="pb-2">
              <SectionTitle icon={Swords}>Ataki</SectionTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {inventory.some((item) => item.slot === "weapon") && (
                <p className="text-xs italic text-[#7c6a45]">
                  Ataki pochodzą z ekwipowanej broni — zmień broń w Ekwipunku.
                </p>
              )}
              <TooltipProvider delayDuration={250}>
                {attacks.map((attack) => (
                  <Tooltip key={attack.name}>
                    <TooltipTrigger asChild>
                      <div className="rounded-sm border border-[#b99f6b] bg-[#fbf3dd]/70 px-3 py-2">
                        <div className="flex items-center justify-between">
                          <span className="font-display text-sm tracking-[0.06em] text-[#2e2113]">{attack.name}</span>
                          <Badge variant="outline">+{attack.hitBonus} do trafienia</Badge>
                        </div>
                        <div className="mt-0.5 text-sm text-[#7c6a45]">
                          Obrażenia {attack.damageNotation}
                          {attack.damageBonus >= 0 ? " + " + attack.damageBonus : " " + attack.damageBonus} (
                          {ABILITY_LABELS[attack.ability]})
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="flex flex-col gap-1">
                        <span className="font-display text-xs tracking-[0.08em] text-[#e8c56a]">
                          {attack.name}
                        </span>
                        <span className="text-[10px] text-[#c9b183]">
                          Trafienie: biegłość + modyfikator ({attack.hitBonus})
                        </span>
                        <span className="text-[11px] text-[#f6ead0]">
                          Obrażenia: {attack.damageNotation}
                          {attack.damageBonus >= 0 ? " + " + attack.damageBonus : " " + attack.damageBonus}
                        </span>
                        <span className="text-[10px] text-[#c9b183]">
                          Cecha: {ABILITY_LABELS[attack.ability]}
                        </span>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </TooltipProvider>
            </CardContent>
          </Card>

          <Card className="border-[#b99f6b]">
            <CardHeader className="pb-2">
              <SectionTitle icon={Wand2}>Zaklęcia</SectionTitle>
              {spellcasting && (
                <CardDescription className="mt-1">
                  DC {spellcasting.saveDc} · attack +{spellcasting.attackBonus} (
                  {ABILITY_LABELS[spellcasting.ability]})
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {spellcasting && registry ? (
                <div className={cn("flex flex-col gap-3", saving && "pointer-events-none opacity-60")}>
                  {[...registry]
                    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
                    .reduce<number[]>((levels, s) => (levels.includes(s.level) ? levels : [...levels, s.level]), [])
                    .map((level) => (
                      <div key={level}>
                        <div className="font-display text-[10px] uppercase tracking-[0.14em] text-[#7c6a45]">
                          {level === 0 ? "Cantripy" : `Poziom ${level}`}
                        </div>
                        <div className="mt-1 flex flex-col gap-1">
                          {registry
                            .filter((s) => s.level === level)
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map((meta) => (
                              <label key={meta.name} className="flex items-start gap-2">
                                <input
                                  type="checkbox"
                                  checked={character.spells?.includes(meta.name) ?? false}
                                  disabled={saving}
                                  onChange={() => toggleSpell(meta.name)}
                                  className="mt-1 accent-[#7a4b1d]"
                                />
                                <span>
                                  <span className="block font-display text-sm text-[#2e2113]">
                                    {spellDisplayName(meta, meta.name)}
                                  </span>
                                  <span className="block text-sm text-[#7c6a45]">
                                    {spellEffectSummary(meta)}
                                  </span>
                                </span>
                              </label>
                            ))}
                        </div>
                      </div>
                    ))}
                  {saveError && <p className="text-sm text-[#8f1d1d]">{saveError}</p>}
                </div>
              ) : spellcasting && character.spells && character.spells.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {character.spells.map((spell) => (
                    <Badge key={spell}>
                      <Sparkles className="mr-1 size-3" />
                      {spell}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#7c6a45]">Brak znanych zaklęć.</p>
              )}
              {spellSlots.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#7c6a45]">
                  {spellSlots.map((s) => (
                    <span key={s.level}>
                      Poziom {s.level}: {s.used}/{s.max}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-[#b99f6b]">
            <CardHeader className="pb-2">
              <SectionTitle icon={ScrollText}>Cechy</SectionTitle>
            </CardHeader>
            <CardContent>
              {sheet.features.length === 0 ? (
                <p className="text-sm text-[#7c6a45]">Brak cech.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {(["race", "class", "subclass", "feat"] as const).map((category) => {
                    const features = sheet.features.filter((f) => f.category === category);
                    if (features.length === 0) return null;
                    const label =
                      category === "race"
                        ? "Rasa"
                        : category === "class"
                          ? "Klasa"
                          : category === "subclass"
                            ? "Subklasa"
                            : "Featy";
                    return (
                      <div key={category}>
                        <div className="font-display text-[10px] uppercase tracking-[0.14em] text-[#7c6a45]">
                          {label}
                        </div>
                        <div className="mt-1 flex flex-col gap-1.5">
                          {features.map((feature) => (
                            <div
                              key={feature.name}
                              className="rounded-sm border-b border-dotted border-[#c8b184] pb-1"
                            >
                              <div className="font-display text-sm text-[#2e2113]">{feature.name}</div>
                              <div className="text-xs text-[#7c6a45]">{feature.description}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-[#b99f6b]">
            <CardHeader className="pb-2">
              <SectionTitle icon={ScrollText}>Notatki</SectionTitle>
            </CardHeader>
            <CardContent>
              <textarea
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                onBlur={() => {
                  if (notesDraft !== (character.notes ?? "")) {
                    characterApi.update(character.id, { notes: notesDraft }).catch(() => {});
                  }
                }}
                placeholder="Twoje prywatne notatki — np. ile złota dostałaś, co znalazłaś, podejrzenia…"
                className="min-h-[96px] w-full resize-y rounded-sm border border-[#b99f6b] bg-[#fbf3dd]/60 px-2 py-1.5 text-sm text-[#2e2113] outline-none focus:border-[#a97e1f]"
              />
              <p className="mt-1 text-[10px] italic text-[#a08b5c]">
                Zapisuje się automatycznie po opuszczeniu pola. Nikt inny nie widzi tych notatek.
              </p>
            </CardContent>
          </Card>

          <Card className="border-[#b99f6b]">
            <CardHeader className="pb-2">
              <SectionTitle icon={Shield}>Ekwipunek</SectionTitle>
            </CardHeader>
            <CardContent className={cn("flex flex-col gap-3", saving && "pointer-events-none opacity-60")}>
              <TooltipProvider delayDuration={250}>
                <div className="flex items-center justify-between">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className={cn(
                          "font-display text-[11px] uppercase tracking-[0.14em]",
                          attunedCount > attunementLimit ? "text-[#8f1d1d]" : "text-[#a97e1f]",
                        )}
                      >
                        Atunement: {attunedCount}/{attunementLimit}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <span className="text-[11px] leading-relaxed text-[#f6ead0]">
                        SRD: maksymalnie 3 magiczne przedmioty z atunementem.
                      </span>
                    </TooltipContent>
                  </Tooltip>
                  {attuneError && <span className="text-xs text-[#8f1d1d]">{attuneError}</span>}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {slotTiles.map((slot, index) => {
                    const ringIndex =
                      slot.key === "ring"
                        ? slotTiles.filter((t, j) => t.key === "ring" && j < index).length
                        : 0;
                    const slotItems = inventory.filter((item) => item.slot === slot.key);
                    const equipped =
                      slot.key === "ring" ? slotItems[ringIndex] : slotItems[0];
                    return (
                      <div
                        key={`${slot.key}-${index}`}
                        onClick={equipped ? () => unequipItem(equipped.id) : undefined}
                        title={equipped ? "Kliknij, aby zdjąć" : undefined}
                        className={cn(
                          "group relative rounded-sm border px-2 py-1.5 shadow-[inset_0_1px_3px_rgba(90,60,20,0.1)]",
                          equipped
                            ? "cursor-pointer border-[#a97e1f] bg-[#e8d3a0]/60 hover:border-[#8f1d1d]/70 hover:bg-[#f0dbb0]"
                            : "border-[#b99f6b] bg-[#fbf3dd]/70",
                        )}
                      >
                        <div className="truncate font-display text-[9px] uppercase tracking-[0.12em] text-[#7c6a45]">
                          {slot.label}
                        </div>
                        {equipped ? (
                          <>
                            <div className="flex items-center justify-between gap-1">
                              <span className="flex min-w-0 items-center gap-1">
                                <ItemIcon icon={equipped.icon} className="size-3.5 shrink-0 text-[#a97e1f]" />
                                <span className="truncate font-display text-xs text-[#2e2113]">
                                  {equipped.name}
                                  {equipped.attuned && (
                                    <span className="ml-0.5 text-[#a97e1f]">✦</span>
                                  )}
                                </span>
                              </span>
                              <button
                                type="button"
                                aria-label={`Zdejmij ${equipped.name}`}
                                disabled={saving}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  unequipItem(equipped.id);
                                }}
                                className="shrink-0 text-[10px] text-[#7c6a45] opacity-100 transition-opacity hover:text-[#8f1d1d] lg:opacity-0 lg:group-hover:opacity-100"
                              >
                                ✕
                              </button>
                            </div>
                            {equipped.weight != null && (
                              <div className="text-[9px] text-[#a08b5c]">
                                {equipped.weight} {equipped.weight === 1 ? "funt" : "funtów"}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-xs text-[#a08b5c]">—</div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-col gap-1 text-sm">
                  {inventory.length > 0 ? (
                    inventory.map((item) => {
                      const equipped = !!item.slot;
                      const slotLabel = slotLabelFor(item.slot);
                      const rowSlotValue = pendingSlots[item.id] ?? suggestedSlotFor(item);
                      return (
                        <div
                          key={item.id}
                          className="flex flex-col gap-1.5 border-b border-dotted border-[#c8b184] py-2 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            {item.description ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="flex min-w-0 items-center gap-1.5">
                                    <ItemIcon icon={item.icon} className="size-3.5 shrink-0 text-[#a97e1f]" />
                                    <span className="truncate text-sm text-[#2e2113]">
                                      {item.name}
                                    </span>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <span className="text-[11px] leading-relaxed text-[#f6ead0]">
                                    {item.description}
                                  </span>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="flex min-w-0 items-center gap-1.5">
                                <ItemIcon icon={item.icon} className="size-3.5 shrink-0 text-[#a97e1f]" />
                                <span className="truncate text-sm text-[#2e2113]">
                                  {item.name}
                                </span>
                              </span>
                            )}
                            {item.quantity > 1 && (
                              <span className="shrink-0 italic text-xs text-[#7c6a45]">
                                ×{item.quantity}
                              </span>
                            )}
                            {equipped && slotLabel && (
                              <Badge variant="outline" className="shrink-0 px-1.5 py-0 text-[9px]">
                                {slotLabel}
                              </Badge>
                            )}
                            {item.attuned && (
                              <span className="shrink-0 text-xs text-[#a97e1f]" title="Atunowany">
                                ✦
                              </span>
                            )}
                            {item.weight != null && (
                              <span className="shrink-0 text-xs text-[#a08b5c]">
                                {item.weight} {item.weight === 1 ? "funt" : "funtów"}
                              </span>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {equipped ? (
                              <>
                                <label className="flex cursor-pointer items-center gap-1.5 text-xs text-[#3a2c17]">
                                  <input
                                    type="checkbox"
                                    checked={!!item.attuned}
                                    disabled={saving}
                                    onChange={() => toggleAttune(item.id)}
                                    className="accent-[#7a4b1d]"
                                  />
                                  Atunuj
                                </label>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={saving}
                                  onClick={() => unequipItem(item.id)}
                                >
                                  Zdejmij
                                </Button>
                              </>
                            ) : (
                              <>
                                <Select
                                  value={rowSlotValue}
                                  disabled={saving}
                                  onChange={(e) =>
                                    setPendingSlots((prev) => ({
                                      ...prev,
                                      [item.id]: e.target.value,
                                    }))
                                  }
                                  className="h-8 w-36"
                                >
                                  <option value="">—</option>
                                  {slotOptions.map((s) => (
                                    <option key={s.key} value={s.key}>
                                      {s.label}
                                    </option>
                                  ))}
                                </Select>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={saving || !rowSlotValue}
                                  onClick={() => equipItem(item.id, rowSlotValue)}
                                >
                                  Ekwipuj
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-[#7c6a45]">Pusto.</p>
                  )}
                </div>

                <div className="mt-1 border-t border-dotted border-[#c8b184] pt-3">
                  <div className="mb-1.5 font-display text-[10px] uppercase tracking-[0.14em] text-[#7c6a45]">
                    Dodaj z katalogu SRD
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value={pendingGear}
                      disabled={saving || (equipment?.gear ?? []).length === 0}
                      onChange={(e) => setPendingGear(e.target.value)}
                      className="h-8 min-w-0 flex-1 sm:flex-none"
                    >
                      <option value="">— wybierz przedmiot —</option>
                      {gearGroups.map((group) => (
                        <optgroup key={group.category} label={group.label}>
                          {group.items.map((gear) => (
                            <option key={gear.name} value={gear.name}>
                              {gear.name}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </Select>
                    <Button
                      size="sm"
                      disabled={saving || !pendingGear}
                      onClick={() => {
                        const gear = gearByName.get(pendingGear.toLowerCase());
                        if (gear) addGear(gear);
                      }}
                    >
                      Dodaj
                    </Button>
                  </div>
                </div>

                <p className="text-[10px] italic text-[#a08b5c]">
                  Sloty to wygodne grupowanie — SRD nie ogranicza liczby noszonych przedmiotów;
                  atunement: maks. 3 magiczne przedmioty.
                </p>
              </TooltipProvider>
            </CardContent>
          </Card>

        </div>
      </div>

      <LevelUpDialog
        open={devDialogOpen}
        onClose={() => setDevDialogOpen(false)}
        characterId={character.id}
        level={character.level}
        className={character.className}
        onDone={loadSheet}
      />
    </div>
  );
}
