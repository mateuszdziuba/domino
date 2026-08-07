import { useEffect, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Shield, Sparkles, Swords, Wand2 } from "lucide-react";
import { characterApi } from "../lib/api-client";
import type { CharacterSheet } from "@domino/shared";
import { Badge } from "../components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "../components/ui/card";
import { cn } from "../lib/utils";

const ABILITY_LABELS: Record<string, string> = {
  strength: "STR",
  dexterity: "DEX",
  constitution: "CON",
  intelligence: "INT",
  wisdom: "WIS",
  charisma: "CHA",
};

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

  useEffect(() => {
    if (!id) return;
    characterApi
      .sheet(id)
      .then(({ sheet }) => setSheet(sheet))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load sheet"));
  }, [id]);

  if (error) {
    return (
      <div className="mx-auto max-w-4xl">
        <p className="text-[#8f1d1d]">{error}</p>
        <Link to="/app/characters" className="font-display text-[11px] uppercase tracking-[0.1em] text-[#7a4b1d] underline-offset-4 hover:underline">
          Back to characters
        </Link>
      </div>
    );
  }

  if (!sheet) return <div className="mx-auto max-w-4xl italic text-[#7c6a45]">Reading the parchment…</div>;

  const { character, abilityModifiers, savingThrows, skills, attacks, spellcasting } = sheet;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex items-center gap-3">
        <Link to="/app/characters" className="text-[#7c6a45] hover:text-[#4a3417]">
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-2xl tracking-[0.1em] text-[#3a2c17]">{character.name}</h1>
          <p className="text-sm italic text-[#7c6a45]">
            {character.race} {character.className} · level {character.level}
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          <Badge variant="secondary">HP {character.currentHp}/{character.maxHp}</Badge>
          <Badge variant="outline">AC {character.armorClass}</Badge>
          <Badge variant="outline">Speed {character.speed}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="border-[#b99f6b]">
          <CardHeader className="pb-2">
            <SectionTitle icon={Shield}>Ability scores</SectionTitle>
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
            <SectionTitle icon={Shield}>Saving throws</SectionTitle>
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
            <SectionTitle icon={Sparkles}>Skills</SectionTitle>
          </CardHeader>
          <CardContent className="scroll-parchment max-h-[420px] overflow-y-auto pr-1">
            <div className="flex flex-col gap-px">
              {skills.map((skill) => (
                <div
                  key={skill.key}
                  className={cn(
                    "flex items-center justify-between rounded-sm px-2 py-[3px] text-sm",
                    skill.proficient && "bg-[#e8d3a0]/50",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span className={cn("w-3 text-center text-[10px]", skill.proficient ? "text-[#a97e1f]" : "text-transparent")}>
                      ✦
                    </span>
                    {skill.label}
                    <span className="text-xs italic text-[#7c6a45]">{ABILITY_LABELS[skill.ability]}</span>
                  </span>
                  <span className={cn("font-display", skill.proficient ? "text-[#2e2113]" : "text-[#7c6a45]")}>
                    {skill.mod >= 0 ? "+" : ""}
                    {skill.mod}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="border-[#b99f6b]">
            <CardHeader className="pb-2">
              <SectionTitle icon={Swords}>Attacks</SectionTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {attacks.map((attack) => (
                <div key={attack.name} className="rounded-sm border border-[#b99f6b] bg-[#fbf3dd]/70 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-sm tracking-[0.06em] text-[#2e2113]">{attack.name}</span>
                    <Badge variant="outline">+{attack.hitBonus} to hit</Badge>
                  </div>
                  <div className="mt-0.5 text-xs italic text-[#7c6a45]">
                    Damage {attack.damageNotation}
                    {attack.damageBonus >= 0 ? " + " + attack.damageBonus : " " + attack.damageBonus} (
                    {ABILITY_LABELS[attack.ability]})
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-[#b99f6b]">
            <CardHeader className="pb-2">
              <SectionTitle icon={Wand2}>Spells</SectionTitle>
              {spellcasting && (
                <CardDescription className="mt-1">
                  DC {spellcasting.saveDc} · attack +{spellcasting.attackBonus} (
                  {ABILITY_LABELS[spellcasting.ability]})
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {spellcasting && character.spells && character.spells.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {character.spells.map((spell) => (
                    <Badge key={spell}>
                      <Sparkles className="mr-1 size-3" />
                      {spell}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm italic text-[#7c6a45]">No spells known.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-[#b99f6b]">
            <CardHeader className="pb-2">
              <SectionTitle icon={Shield}>Inventory</SectionTitle>
            </CardHeader>
            <CardContent>
              {character.inventory && character.inventory.length > 0 ? (
                <div className="flex flex-col gap-1 text-sm">
                  {character.inventory.map((item) => (
                    <div key={item.id} className="flex justify-between border-b border-dotted border-[#c8b184] pb-1">
                      <span>{item.name}</span>
                      <span className="italic text-[#7c6a45]">×{item.quantity}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm italic text-[#7c6a45]">Empty.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
