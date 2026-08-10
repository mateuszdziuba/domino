import { useEffect, useRef, useState } from "react";
import { Users, X } from "lucide-react";
import type { CharacterSheet } from "@domino/shared";
import { characterApi, spellbookApi, type SpellMeta } from "../lib/api-client";
import { Badge } from "./ui/badge";
import { cn } from "../lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { SKILL_ALIASES } from "../lib/chat-tooltips";
import { spellDisplayName } from "../lib/spell-lang";
import { ItemIcon } from "../lib/item-icons";

const ABILITY_LABELS_PL: Record<string, string> = {
  strength: "Siła",
  dexterity: "Zręczność",
  constitution: "Kondycja",
  intelligence: "Inteligencja",
  wisdom: "Mądrość",
  charisma: "Charyzma",
};

const ABILITY_SHORT_PL: Record<string, string> = {
  strength: "SIŁ",
  dexterity: "ZRĘ",
  constitution: "KON",
  intelligence: "INT",
  wisdom: "MĄD",
  charisma: "CHA",
};

function spellEffectDescriptionLocal(meta: SpellMeta): string {
  const e = meta.effect as SpellMeta["effect"] & {
    flat?: number;
    condition?: string;
    fullHp?: boolean;
  };
  if (e.kind === "damage") {
    const dice = [e.dice, e.damageType].filter(Boolean).join(" ");
    const extra = e.attack
      ? "rzut ataku"
      : e.save
        ? `rzut obronny (${e.save})`
        : "";
    return `Obrażenia: ${dice}${extra ? ` — ${extra}` : ""}`;
  }
  if (e.kind === "heal" || e.kind === "heal_all") {
    const amount = e.flat != null ? `${e.flat}` : `${e.dice ?? ""}${e.mod ? " + modyfikator" : ""}`;
    return `Leczenie: ${amount} punktów życia`;
  }
  if (e.kind === "condition_apply") return `Nakłada stan: ${e.condition ?? "—"} — rzut obronny (${e.save ?? "—"})`;
  if (e.kind === "condition_remove") return "Usuwa jeden stan.";
  if (e.kind === "restore") return "Leczy stany i wyczerpanie.";
  if (e.kind === "revive") return e.fullHp ? "Wskrzeszenie z pełnym HP." : "Wskrzeszenie.";
  if (e.kind === "stabilize") return "Stabilizuje istotę na 0 punktach życia.";
  if (e.kind === "none") return "Efekt narracyjny — rozstrzyga DM.";
  return "—";
}

const SLOT_LABELS: { key: string; label: string }[] = [
  { key: "head", label: "Głowa" },
  { key: "neck", label: "Szyja" },
  { key: "back", label: "Płaszcz" },
  { key: "body", label: "Zbroja" },
  { key: "hands", label: "Rękawice" },
  { key: "belt", label: "Pas" },
  { key: "ring", label: "Pierścień" },
  { key: "ring", label: "Pierścień" },
  { key: "weapon", label: "Broń" },
  { key: "shield", label: "Tarcza" },
  { key: "feet", label: "Buty" },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-display text-[10px] uppercase tracking-[0.14em] text-[#7c6a45]">
        {children}
      </span>
      <span className="h-px flex-1 bg-gradient-to-r from-[#a97e1f]/50 to-transparent" />
    </div>
  );
}

type CharacterDrawerProps = {
  open: boolean;
  onClose: () => void;
  characterId: string | null;
};

export default function CharacterDrawer({ open, onClose, characterId }: CharacterDrawerProps) {
  const [sheets, setSheets] = useState<Record<string, CharacterSheet>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [spellRegistry, setSpellRegistry] = useState<SpellMeta[] | null>(null);
  const cacheRef = useRef<Record<string, CharacterSheet>>({});

  useEffect(() => {
    spellbookApi.list().then((r) => setSpellRegistry(r.spells)).catch(() => {});
  }, []);

  const sheet = characterId ? sheets[characterId] : undefined;

  useEffect(() => {
    if (!open || !characterId) return;
    if (cacheRef.current[characterId]) {
      setSheets({ ...cacheRef.current });
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    characterApi
      .sheet(characterId)
      .then(({ sheet }) => {
        if (cancelled) return;
        cacheRef.current = { ...cacheRef.current, [characterId]: sheet };
        setSheets(cacheRef.current);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Nie udało się wczytać karty postaci");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, characterId, retry]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-[#2e2113]/60" onClick={onClose} aria-hidden="true" />
      <aside
        role="dialog"
        aria-label="Karta postaci"
        className="animate-fade-up fixed right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l border-[#a97e1f]/60 bg-[#fbf3dd] pb-[env(safe-area-inset-bottom)] shadow-[-10px_0_35px_-12px_rgba(30,20,5,0.6)]"
      >
        {loading && (
          <div className="flex h-full items-center justify-center italic text-[#7c6a45]">
            Czytam pergamin…
          </div>
        )}
        {error && (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-sm text-[#8f1d1d]">{error}</p>
            <button
              type="button"
              onClick={() => setRetry((r) => r + 1)}
              className="rounded-sm border border-[#a97e1f] bg-transparent px-3 py-1.5 font-display text-[11px] uppercase tracking-[0.08em] text-[#3a2c17] hover:bg-[#e8d3a0]/50"
            >
              Spróbuj ponownie
            </button>
          </div>
        )}
        {sheet && <DrawerContent sheet={sheet} spellRegistry={spellRegistry} onClose={onClose} />}
      </aside>
    </div>
  );
}

function DrawerContent({
  sheet,
  spellRegistry,
  onClose,
}: {
  sheet: CharacterSheet;
  spellRegistry: SpellMeta[] | null;
  onClose: () => void;
}) {
  const { character, abilityModifiers, savingThrows, attacks, spellcasting, spellSlots } = sheet;
  const inventory = character.inventory ?? [];
  const backpackItems = inventory.filter((item) => !item.slot);
  const totalWeight = inventory.reduce(
    (sum, item) => sum + (item.weight ?? 0) * (item.quantity ?? 1),
    0,
  );
  const carryingCapacity = character.abilityScores.strength * 15;
  const overloaded = totalWeight > carryingCapacity;
  const hpPct =
    character.maxHp > 0
      ? Math.max(0, Math.min(100, (character.currentHp / character.maxHp) * 100))
      : 0;
  const proficientSkills = sheet.skills.filter((s) => s.proficient);

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-10 border-b border-[#a97e1f]/40 bg-[#fbf3dd]/95 px-5 pb-4 pt-5 backdrop-blur-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-4">
            {character.portraitUrl ? (
              <img
                src={character.portraitUrl}
                alt={`Portret ${character.name}`}
                className="h-36 w-28 shrink-0 rounded-sm border border-[#b99f6b] bg-[#efe2c4] object-cover object-top shadow-[0_6px_16px_-6px_rgba(60,40,10,0.5)]"
              />
            ) : (
              <div className="flex h-36 w-28 shrink-0 items-center justify-center rounded-sm border border-[#b99f6b] bg-[#efe2c4]">
                <Users className="size-8 text-[#a08b5c]" />
              </div>
            )}
            <div className="min-w-0">
              <h2 className="font-display text-xl tracking-[0.08em] text-[#3a2c17]">
                {character.name}
              </h2>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <Badge variant="secondary">{character.race}</Badge>
                <Badge variant="secondary">{character.className}</Badge>
                <Badge variant="outline">poz. {character.level}</Badge>
                {character.subclass && <Badge variant="outline">{character.subclass}</Badge>}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-[#7c6a45]">
                <span className="font-display text-[#3a2c17]">AC {character.armorClass}</span>
                <span>·</span>
                <span>Szybkość {character.speed}</span>
                <span>·</span>
                <span>Biegłość +{character.proficiencyBonus}</span>
                <span>·</span>
                <span>Złoto {character.gold ?? 0}</span>
                <span>·</span>
                <span>XP {character.xp ?? 0}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zamknij kartę postaci"
            className="shrink-0 rounded-sm p-1 text-[#7c6a45] hover:bg-[#e4d3ab]/60 hover:text-[#3a2c17]"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-display text-[9px] uppercase tracking-[0.14em] text-[#7c6a45]">
              Punkty życia
            </span>
            <span className={cn("font-display tracking-[0.06em]", hpPct === 0 ? "text-[#8f1d1d]" : "text-[#2e2113]")}>
              {character.currentHp}/{character.maxHp}
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#dcc89a]">
            <span
              className={cn("block h-full rounded-full", hpPct === 0 ? "bg-[#8f1d1d]" : "bg-[#2e4d3a]")}
              style={{ width: `${hpPct}%` }}
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[#7c6a45]">
          <span className="font-display text-[#3a2c17]">AC {character.armorClass}</span>
          <span>·</span>
          <span>Szybkość {character.speed}</span>
          <span>·</span>
          <span>Złoto {character.gold ?? 0}</span>
          <span>·</span>
          {overloaded ? (
            <TooltipProvider delayDuration={250}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="font-display text-[#8f1d1d]">
                    Ładowność {totalWeight}/{carryingCapacity} lb
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <span className="text-[11px] leading-relaxed text-[#f6ead0]">
                    Przeciążony — szybkość zmniejszona o 10 stóp (SRD).
                  </span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <span>Ładowność {totalWeight}/{carryingCapacity} lb</span>
          )}
          <span>·</span>
          <span>XP {character.xp ?? 0}</span>
          {character.inspiration && (
            <TooltipProvider delayDuration={250}>
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
            </TooltipProvider>
          )}
        </div>
      </header>

      <section className="px-5 py-4">
        <SectionLabel>Cechy</SectionLabel>
        <div className="mt-2 grid grid-cols-6 gap-1.5">
          {Object.entries(character.abilityScores).map(([ability, score]) => {
            const mod = abilityModifiers[ability as keyof typeof abilityModifiers];
            return (
              <div
                key={ability}
                className="rounded-sm border border-[#b99f6b] bg-[#fbf3dd]/70 px-1 py-1.5 text-center shadow-[inset_0_1px_3px_rgba(90,60,20,0.1)]"
              >
                <div className="font-display text-[8px] uppercase tracking-[0.1em] text-[#7c6a45]">
                  {ABILITY_SHORT_PL[ability]}
                </div>
                <div className="font-display text-sm leading-tight text-[#2e2113]">{score}</div>
                <div className="text-[10px] leading-tight text-[#a97e1f]">{mod >= 0 ? "+" : ""}{mod}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="border-t border-dotted border-[#c8b184] px-5 py-4">
        <SectionLabel>Rzuty obronne</SectionLabel>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {savingThrows.map((st) => (
            <div
              key={st.ability}
              className={cn(
                "flex items-center justify-between rounded-sm border px-2.5 py-1 shadow-[inset_0_1px_3px_rgba(90,60,20,0.1)]",
                st.proficient
                  ? "border-[#a97e1f] bg-[#e8d3a0]/60"
                  : "border-[#b99f6b] bg-[#fbf3dd]/70",
              )}
            >
              <span className="text-xs text-[#3a2c17]">
                {ABILITY_LABELS_PL[st.ability]}
                {st.proficient && <span className="ml-1 text-[10px] text-[#a97e1f]">✦</span>}
              </span>
              <span className={cn("font-display text-xs", st.proficient ? "text-[#2e2113]" : "text-[#7c6a45]")}>
                {st.mod >= 0 ? "+" : ""}{st.mod}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-dotted border-[#c8b184] px-5 py-4">
        <SectionLabel>Ataki</SectionLabel>
        {attacks.length === 0 ? (
          <p className="mt-2 text-xs italic text-[#7c6a45]">Brak ataków.</p>
        ) : (
          <div className="mt-2 flex flex-col gap-1.5">
            {attacks.map((attack) => (
              <div
                key={attack.name}
                className="rounded-sm border border-[#b99f6b] bg-[#fbf3dd]/70 px-2.5 py-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-display text-xs tracking-[0.06em] text-[#2e2113]">
                    {attack.name}
                  </span>
                  <span className="shrink-0 font-display text-[10px] text-[#7a4b1d]">
                    +{attack.hitBonus}
                  </span>
                </div>
                <div className="text-[11px] text-[#7c6a45]">
                  {attack.damageNotation}
                  {attack.damageBonus >= 0 ? " + " + attack.damageBonus : " " + attack.damageBonus}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="border-t border-dotted border-[#c8b184] px-5 py-4">
        <SectionLabel>Cechy rasowe, klasowe, subklasowe i featy</SectionLabel>
        {sheet.features.length === 0 ? (
          <p className="mt-2 text-xs italic text-[#7c6a45]">Brak cech.</p>
        ) : (
          <div className="mt-2 flex flex-col gap-2.5">
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
                  <div className="font-display text-[9px] uppercase tracking-[0.14em] text-[#a97e1f]">
                    {label}
                  </div>
                  <div className="mt-1 flex flex-col">
                    {features.map((feature) => (
                      <div
                        key={feature.name}
                        title={feature.description}
                        className="border-b border-dotted border-[#c8b184] py-1 last:border-0"
                      >
                        <div className="font-display text-xs text-[#2e2113]">{feature.name}</div>
                        <div className="line-clamp-1 text-xs text-[#7c6a45]">
                          {feature.description}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {spellcasting && character.spells && character.spells.length > 0 && (
        <section className="border-t border-dotted border-[#c8b184] px-5 py-4">
          <SectionLabel>Zaklęcia (przygotowane)</SectionLabel>
          {spellSlots.filter((s) => s.max > 0).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {spellSlots
                .filter((s) => s.max > 0)
                .map((s) => (
                  <span
                    key={s.level}
                    className="rounded-sm border border-[#c8b184] bg-[#fbf3dd]/70 px-1.5 py-0.5 font-display text-[9px] uppercase tracking-[0.1em] text-[#5c4018]"
                  >
                    Poziom {s.level}: {s.used}/{s.max}
                  </span>
                ))}
              <span className="rounded-sm border border-[#a97e1f]/50 bg-[#e8d3a0]/60 px-1.5 py-0.5 font-display text-[9px] uppercase tracking-[0.1em] text-[#5c4018]">
                Cantripy ∞
              </span>
            </div>
          )}
          <div className="mt-3 flex flex-col gap-2.5">
            {character.spells.map((spell) => {
              const meta = spellRegistry?.find((m) => m.name === spell);
              const displayName = spellDisplayName(meta, spell);
              return (
                <div
                  key={spell}
                  className="rounded-sm border border-[#b99f6b] bg-[#fbf3dd]/70 p-3 shadow-[inset_0_1px_3px_rgba(90,60,20,0.08)]"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-display text-sm tracking-[0.05em] text-[#2e2113]">
                      {displayName}
                    </span>
                    {meta && (
                      <span className="shrink-0 font-display text-[9px] uppercase tracking-[0.12em] text-[#a97e1f]">
                        {meta.level === 0 ? "Cantrip" : `Poziom ${meta.level}`} · {meta.school}
                      </span>
                    )}
                  </div>
                  {meta?.description && (
                    <p className="mt-1.5 text-xs leading-relaxed text-[#3a2c17]">
                      {meta.description}
                    </p>
                  )}
                  <div className="mt-1.5 text-[10px] text-[#7c6a45]">
                    {meta
                      ? `${meta.castingTime} · ${meta.range} · ${meta.duration} · ${meta.components}`
                      : "—"}
                  </div>
                  {meta && (
                    <div className="mt-1 border-t border-dotted border-[#c8b184] pt-1 font-display text-[10px] uppercase tracking-[0.08em] text-[#7a4b1d]">
                      {spellEffectDescriptionLocal(meta)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="border-t border-dotted border-[#c8b184] px-5 py-4">
        <div className="flex items-center justify-between">
          <SectionLabel>Ekwipunek</SectionLabel>
          <span className="font-display text-[10px] uppercase tracking-[0.1em] text-[#7c6a45]">
            {character.gold ?? 0} zł
          </span>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {SLOT_LABELS.map((slot, index) => {
            const ringIndex =
              slot.key === "ring"
                ? SLOT_LABELS.filter((s, j) => s.key === "ring" && j < index).length
                : 0;
            const slotItems = inventory.filter((item) => item.slot === slot.key);
            const equipped = slot.key === "ring" ? slotItems[ringIndex] : slotItems[0];
            return (
              <div
                key={`${slot.key}-${index}`}
                className={cn(
                  "rounded-sm border px-1.5 py-1 shadow-[inset_0_1px_3px_rgba(90,60,20,0.1)]",
                  equipped
                    ? "border-[#a97e1f] bg-[#e8d3a0]/60"
                    : "border-[#b99f6b] bg-[#fbf3dd]/70",
                )}
              >
                <div className="truncate font-display text-[8px] uppercase tracking-[0.12em] text-[#7c6a45]">
                  {slot.label}
                </div>
                {equipped ? (
                  <div className="flex min-w-0 items-center gap-1">
                    <ItemIcon icon={equipped.icon} className="size-3 shrink-0 text-[#a97e1f]" />
                    <span className="truncate font-display text-[10px] text-[#2e2113]">
                      {equipped.name}
                      {equipped.attuned && <span className="text-[#a97e1f]"> ✦</span>}
                    </span>
                  </div>
                ) : (
                  <div className="text-[10px] text-[#a08b5c]">—</div>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-[#7c6a45]">
          Przedmioty w plecaku: {backpackItems.length}
        </p>
        <div className="mt-1 flex flex-col gap-1">
          <div className="font-display text-[10px] uppercase tracking-[0.14em] text-[#7c6a45]">
            Plecak
          </div>
          {backpackItems.length === 0 ? (
            <p className="text-xs italic text-[#7c6a45]">Plecak pusty.</p>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {backpackItems.map((item) => (
                <li key={item.id} className="flex items-center gap-1.5 text-xs text-[#7c6a45]">
                  <ItemIcon icon={item.icon} className="size-3 shrink-0 text-[#a97e1f]" />
                  <span className="min-w-0 truncate">{item.name}</span>
                  <span className="shrink-0">×{item.quantity}</span>
                  {item.weight != null && <span className="shrink-0">({item.weight} lb)</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="border-t border-dotted border-[#c8b184] px-5 pb-6 pt-4">
        <SectionLabel>Umiejętności</SectionLabel>
        <p className="mt-2 text-xs leading-relaxed text-[#2e2113]">
          {proficientSkills.length > 0 ? (
            proficientSkills
              .map((s) => (SKILL_ALIASES[s.key]?.[1] ?? s.label))
              .join(" · ")
          ) : (
            <span className="italic text-[#7c6a45]">Brak biegłości</span>
          )}
        </p>
      </section>
    </div>
  );
}
