import { useEffect, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { Trash2, Eye } from "lucide-react";
import { characterApi, featuresApi, type FeaturesCatalog } from "../lib/api-client";
import { SKILLS, startingSkillCount, type CharacterSummary, type SkillName } from "@domino/shared";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select } from "../components/ui/select";
import { cn } from "../lib/utils";
import { SKILL_ALIASES } from "../lib/chat-tooltips";

const RACES = ["Dwarf", "Elf", "Halfling", "Human", "Dragonborn", "Gnome", "Half-Elf", "Half-Orc", "Tiefling"];
const CLASSES = ["Barbarian", "Bard", "Cleric", "Druid", "Fighter", "Monk", "Paladin", "Ranger", "Rogue", "Sorcerer", "Warlock", "Wizard"];
const ABILITIES = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"] as const;

const ABILITY_LABELS_PL: Record<string, string> = {
  strength: "Siła",
  dexterity: "Zręczność",
  constitution: "Kondycja",
  intelligence: "Inteligencja",
  wisdom: "Mądrość",
  charisma: "Charyzma",
};

const POINT_BUY_COSTS: Record<number, number> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
const POINT_BUY_BUDGET = 27;
const MIN_SCORE = 8;
const MAX_SCORE = 15;
const HIT_DICE: Record<string, number> = {
  Barbarian: 12,
  Fighter: 10,
  Paladin: 10,
  Ranger: 10,
  Bard: 8,
  Cleric: 8,
  Druid: 8,
  Monk: 8,
  Rogue: 8,
  Warlock: 8,
  Sorcerer: 6,
  Wizard: 6,
};

const BASE_SCORES = { strength: 8, dexterity: 8, constitution: 8, intelligence: 8, wisdom: 8, charisma: 8 };

function scoreModifier(score: number) {
  return Math.floor((score - 10) / 2);
}

export default function CharactersPage() {
  const [characters, setCharacters] = useState<CharacterSummary[]>([]);
  const [name, setName] = useState("");
  const [race, setRace] = useState(RACES[0]!);
  const [className, setClassName] = useState(CLASSES[0]!);
  const [scores, setScores] = useState({ ...BASE_SCORES });
  const [skills, setSkills] = useState<Set<SkillName>>(new Set());
  const [catalog, setCatalog] = useState<FeaturesCatalog | null>(null);
  const [subclass, setSubclass] = useState("");
  const [startingFeat, setStartingFeat] = useState("");
  const [featAbility, setFeatAbility] = useState("");
  const [error, setError] = useState<string | null>(null);

  const skillLimit = startingSkillCount(className);
  const selectedCount = skills.size;
  const classSubclasses = catalog?.subclasses[className] ?? [];
  const remainingPoints =
    POINT_BUY_BUDGET - ABILITIES.reduce((sum, a) => sum + (POINT_BUY_COSTS[scores[a]] ?? 0), 0);
  const conMod = scoreModifier(scores.constitution);
  const dexMod = scoreModifier(scores.dexterity);
  const hitDie = HIT_DICE[className] ?? 8;
  const featDef = catalog?.feats?.find((f) => f.name === startingFeat) ?? null;
  const featBonusAbilities = featDef?.abilityBonus ?? [];

  function load() {
    characterApi.list().then(({ characters }) => setCharacters(characters)).catch(() => {});
  }

  useEffect(load, []);

  useEffect(() => {
    featuresApi.get().then(setCatalog).catch(() => {});
  }, []);

  function toggleSkill(skill: SkillName) {
    setSkills((prev) => {
      const next = new Set(prev);
      if (next.has(skill)) {
        next.delete(skill);
      } else if (next.size < skillLimit) {
        next.add(skill);
      }
      return next;
    });
  }

  function adjustScore(ability: (typeof ABILITIES)[number], delta: number) {
    setScores((prev) => {
      const next = prev[ability] + delta;
      if (next < MIN_SCORE || next > MAX_SCORE) return prev;
      return { ...prev, [ability]: next };
    });
  }

  function resetScores() {
    setScores({ ...BASE_SCORES });
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await characterApi.create({
        name,
        race,
        className,
        level: 1,
        abilityScores: scores,
        skills: Object.fromEntries([...skills].map((s) => [s, true])),
        ...(subclass ? { subclass } : {}),
        ...(startingFeat ? { startingFeat, ...(featAbility ? { featAbility } : {}) } : {}),
      });
      setName("");
      setScores({ ...BASE_SCORES });
      setSkills(new Set());
      setSubclass("");
      setStartingFeat("");
      setFeatAbility("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się utworzyć postaci");
    }
  }

  async function onDelete(id: string) {
    try {
      await characterApi.remove(id);
      load();
    } catch {
      setError("Nie udało się usunąć postaci");
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl tracking-[0.12em] text-[#3a2c17]">
        <span className="mr-2 text-[#a97e1f]">✦</span>Postacie
      </h1>
      <p className="mb-6 text-sm italic text-[#7c6a45]">
        Bohaterowie w budowie — skazani na chwałę lub zgubę.
      </p>

      <Card className="mb-6 border-[#b99f6b]">
        <CardHeader className="pb-3">
          <CardTitle>Nowa postać</CardTitle>
          <CardDescription>
            Stwórz awanturnika 1. poziomu. Wartości cech to standard SRD 5.2.1.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCreate} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="char-name">Imię</Label>
                <Input id="char-name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="char-class">Klasa</Label>
                <Select id="char-class" value={className} onChange={(e) => { setClassName(e.target.value); setSubclass(""); }}>
                  {CLASSES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </Select>
              </div>
              {catalog && classSubclasses.length > 0 && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="char-subclass">Subklasa (od 3. poziomu)</Label>
                  <Select id="char-subclass" value={subclass} onChange={(e) => setSubclass(e.target.value)}>
                    <option value="">—</option>
                    {classSubclasses.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </Select>
                  <p className="text-[11px] italic text-[#7c6a45]">
                    Subklasę wybiera się po osiągnięciu 3. poziomu — możesz zostawić to na później.
                  </p>
                </div>
              )}
              <div className="flex flex-col gap-2">
                <Label htmlFor="char-race">Rasa</Label>
                <Select id="char-race" value={race} onChange={(e) => setRace(e.target.value)}>
                  {RACES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-2 rounded-sm border border-[#b99f6b] bg-[#fbf3dd]/40 p-3">
              <Label htmlFor="char-feat">Feat startowy (opcjonalnie)</Label>
              <Select
                id="char-feat"
                value={startingFeat}
                onChange={(e) => {
                  setStartingFeat(e.target.value);
                  setFeatAbility("");
                }}
              >
                <option value="">Brak</option>
                {(catalog?.feats ?? []).map((f) => (
                  <option key={f.name} value={f.name}>
                    {f.label}
                    {f.abilityBonus && f.abilityBonus.length > 0
                      ? ` (+1 ${ABILITY_LABELS_PL[f.abilityBonus[0]!]})`
                      : ""}
                  </option>
                ))}
              </Select>
              {featDef && (
                <>
                  <p className="text-[11px] italic text-[#7c6a45]">{featDef.description}</p>
                  {featBonusAbilities.length > 1 && (
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs">
                        +1 do cechy (wybierz, jeśli nie chcesz domyślnej)
                      </Label>
                      <Select value={featAbility} onChange={(e) => setFeatAbility(e.target.value)}>
                        {featBonusAbilities.map((a) => (
                          <option key={a} value={a}>
                            {ABILITY_LABELS_PL[a]} ({scores[a as keyof typeof scores] ?? 8} → {Math.min(20, (scores[a as keyof typeof scores] ?? 8) + 1)})
                          </option>
                        ))}
                      </Select>
                    </div>
                  )}
                  {featBonusAbilities.length === 1 && (
                    <p className="text-[11px] text-[#7c6a45]">
                      +1 do {ABILITY_LABELS_PL[featBonusAbilities[0]!]} ({scores[featBonusAbilities[0] as keyof typeof scores] ?? 8} →{" "}
                      {Math.min(20, (scores[featBonusAbilities[0] as keyof typeof scores] ?? 8) + 1)}) — doliczane po Point Buy.
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="flex flex-col gap-3 rounded-sm border border-[#b99f6b] bg-[#fbf3dd]/40 p-3">
              <div className="flex items-center justify-between">
                <Label className="text-base">Cechy (Point Buy)</Label>
                <Button type="button" variant="outline" size="sm" onClick={resetScores} disabled={remainingPoints === POINT_BUY_BUDGET}>
                  Resetuj
                </Button>
              </div>
              <p className="text-[11px] italic text-[#7c6a45]">
                SRD Point Buy: 27 punktów, cechy 8–15 (modyfikatory rasowe doliczasz samodzielnie w grze — w tej wersji
                silnik ich nie aplikuje).
              </p>
              <div className="flex flex-col gap-1.5">
                {ABILITIES.map((ability) => {
                  const value = scores[ability];
                  const cost = POINT_BUY_COSTS[value] ?? 0;
                  return (
                    <div key={ability} className="flex items-center justify-between gap-2">
                      <span className="text-sm text-[#3a2c17]">{ABILITY_LABELS_PL[ability]}</span>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => adjustScore(ability, -1)}
                          disabled={value <= MIN_SCORE}
                          aria-label={`Zmniejsz ${ABILITY_LABELS_PL[ability]}`}
                        >
                          −
                        </Button>
                        <span className="w-8 text-center font-display text-base text-[#3a2c17]">{value}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => adjustScore(ability, 1)}
                          disabled={value >= MAX_SCORE}
                          aria-label={`Zwiększ ${ABILITY_LABELS_PL[ability]}`}
                        >
                          +
                        </Button>
                        <span className="w-10 text-right text-xs text-[#7c6a45]">{cost} pkt</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[#b99f6b]/60 pt-2 text-sm">
                <span className={cn("font-display tracking-[0.06em]", remainingPoints < 0 ? "text-[#8f1d1d]" : "text-[#3a2c17]")}>
                  Pozostałe punkty: {remainingPoints}/{POINT_BUY_BUDGET}
                </span>
                <span className="text-[#7c6a45]">
                  HP: K{hitDie} + {conMod >= 0 ? `+${conMod}` : conMod} = {hitDie + conMod}
                </span>
                <span className="text-[#7c6a45]">
                  AC bazowe: {10 + dexMod} (zbroja/tarcza ze startowego zestawu doda więcej)
                </span>
              </div>
              {className && (
                <p className="text-[11px] italic text-[#7c6a45]">
                  Startowy zestaw ({className}) zostanie przydzielony automatycznie.
                </p>
              )}
            </div>

            <div>
              <Label className="mb-1 block">
                Biegłości umiejętności{" "}
                <span className={cn("text-xs", selectedCount >= skillLimit ? "text-destructive" : "text-muted-foreground")}>
                  ({selectedCount}/{skillLimit} — {className})
                </span>
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {SKILLS.map((skill) => {
                  const active = skills.has(skill.key);
                  return (
                    <button
                      key={skill.key}
                      type="button"
                      onClick={() => toggleSkill(skill.key)}
                      disabled={!active && selectedCount >= skillLimit}
                      className={cn(
                        "rounded-sm border px-2 py-1.5 text-left text-xs transition-colors",
                        active
                          ? "border-[#a97e1f] bg-[#2e4d3a] text-[#e8d9b2]"
                          : "border-[#b99f6b] bg-[#fbf3dd]/60 text-[#7c6a45] hover:bg-[#e8d3a0]/50 disabled:opacity-40",
                      )}
                    >
                      <span className="font-display text-[10px] uppercase tracking-[0.08em]">
                        {SKILL_ALIASES[skill.key]?.[1] ?? skill.label}
                      </span>
                      <span className="block text-[10px] italic opacity-70">
                        {ABILITY_LABELS_PL[skill.ability]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {error && <p className="text-sm text-[#8f1d1d]">{error}</p>}
            <Button type="submit" className="self-start">
              Stwórz postać
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        {characters.length === 0 && (
          <p className="text-sm text-muted-foreground">Nie masz jeszcze postaci.</p>
        )}
        {characters.map((character) => {
          const portraitUrl = (character as CharacterSummary & { portraitUrl?: string }).portraitUrl;
          return (
            <Card key={character.id}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  {portraitUrl && (
                    <img
                      src={portraitUrl}
                      alt={`Portret ${character.name}`}
                      className="h-10 w-10 shrink-0 rounded-sm border border-[#b99f6b] object-cover shadow-[0_4px_12px_-4px_rgba(60,40,10,0.4)]"
                    />
                  )}
                  <CardTitle>{character.name}</CardTitle>
                <Badge variant="secondary">
                  {character.race} {character.className} · poziom {character.level}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1">
                {Object.keys(character.skills ?? {}).length === 0 && (
                  <span className="text-xs text-muted-foreground">Brak biegłości</span>
                )}
                {Object.entries(character.skills ?? {}).map(([key, enabled]) => {
                  const info = SKILLS.find((s) => s.key === key);
                  return enabled && info ? (
                    <Badge key={key} variant="outline">
                      {SKILL_ALIASES[key]?.[1] ?? info.label}
                    </Badge>
                  ) : null;
                })}
              </div>
            </CardContent>
            <CardFooter className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                HP {character.currentHp}/{character.maxHp}
              </span>
              <div className="flex gap-1">
                <Button asChild variant="outline" size="sm">
                  <Link to="/app/characters/$id" params={{ id: character.id }}>
                    <Eye className="size-4" />
                    Otwórz
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => void onDelete(character.id)}>
                  <Trash2 className="size-4" />
                  Usuń
                </Button>
              </div>
            </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
