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

export default function CharactersPage() {
  const [characters, setCharacters] = useState<CharacterSummary[]>([]);
  const [name, setName] = useState("");
  const [race, setRace] = useState(RACES[0]!);
  const [className, setClassName] = useState(CLASSES[0]!);
  const [maxHp, setMaxHp] = useState(10);
  const [armorClass, setArmorClass] = useState(12);
  const [scores, setScores] = useState({ strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 });
  const [skills, setSkills] = useState<Set<SkillName>>(new Set());
  const [catalog, setCatalog] = useState<FeaturesCatalog | null>(null);
  const [subclass, setSubclass] = useState("");
  const [error, setError] = useState<string | null>(null);

  const skillLimit = startingSkillCount(className);
  const selectedCount = skills.size;
  const classSubclasses = catalog?.subclasses[className] ?? [];

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
        maxHp,
        armorClass,
        speed: 30,
        skills: Object.fromEntries([...skills].map((s) => [s, true])),
        ...(subclass ? { subclass } : {}),
      });
      setName("");
      setScores({ strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 });
      setSkills(new Set());
      setSubclass("");
      setMaxHp(10);
      setArmorClass(12);
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
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="char-hp">Maks. HP</Label>
                  <Input id="char-hp" type="number" min={1} value={maxHp} onChange={(e) => setMaxHp(Number(e.target.value))} required />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="char-ac">AC</Label>
                  <Input id="char-ac" type="number" min={1} value={armorClass} onChange={(e) => setArmorClass(Number(e.target.value))} required />
                </div>
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Wartości cech</Label>
              <div className="grid grid-cols-6 gap-3">
                {ABILITIES.map((ability) => (
                  <div key={ability} className="flex flex-col items-center gap-1">
                    <Label className="text-xs text-muted-foreground">{ABILITY_LABELS_PL[ability]}</Label>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={scores[ability]}
                      onChange={(e) => setScores((prev) => ({ ...prev, [ability]: Number(e.target.value) }))}
                      className="text-center"
                    />
                  </div>
                ))}
              </div>
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
        {characters.map((character) => (
          <Card key={character.id}>
            <CardHeader>
              <div className="flex items-center gap-3">
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
        ))}
      </div>
    </div>
  );
}
