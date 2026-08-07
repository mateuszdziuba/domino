import { useState } from "react";
import { Swords, Wand2 } from "lucide-react";
import { combatApi } from "../lib/api-client";
import type { CampaignState, Combatant } from "@domino/shared";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Select } from "./ui/select";
import { cn } from "../lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

const CONDITION_LABELS: Record<string, string> = {
  blinded: "ślepota",
  frightened: "przerażony",
  poisoned: "zatruty",
  prone: "powalony",
  restrained: "skrępowany",
  paralyzed: "sparaliżowany",
  petrified: "skamieniały",
  stunned: "ogłuszony",
  unconscious: "nieprzytomny",
  incapacitated: "obezwładniony",
};

type Props = {
  campaignId: string;
  state: CampaignState;
  myCharacterId?: string;
  onChange: (state: CampaignState) => void;
};

export function CombatPanel({ campaignId, state, myCharacterId, onChange }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [targetId, setTargetId] = useState("");
  const [damageNotation, setDamageNotation] = useState("1d8");

  const { combat } = state;

  async function call(action: () => Promise<{ state: CampaignState }>, clearLast = true) {
    setError(null);
    if (clearLast) setLastResult(null);
    try {
      const result = await action();
      onChange(result.state);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się wykonać akcji walki");
    }
  }

  async function onAttack(attacker: Combatant) {
    if (!targetId) {
      setError("Najpierw wybierz cel");
      return;
    }
    setError(null);
    setLastResult(null);
    try {
      const result = await combatApi.attack(campaignId, attacker.id, targetId, { damageNotation });
      setLastResult(
        result.result.hit
          ? `${attacker.name} trafia ${result.result.targetName} za ${result.result.damageTotal} obrażeń (atak ${result.result.attackTotal} vs AC).${result.result.critical ? " Trafienie krytyczne!" : ""}`
          : `${attacker.name} pudłuje — ${result.result.targetName} (atak ${result.result.attackTotal} vs AC).`,
      );
      onChange(result.state);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zaatakować");
    }
  }

  async function onDeathSave(combatant: Combatant) {
    try {
      const result = await combatApi.deathSave(campaignId, combatant.id);
      const { result: ds } = result;
      setLastResult(
        ds.dead
          ? `${combatant.name} ginie po nieudanych rzutach obronnych przed śmiercią.`
          : ds.stable
            ? `${combatant.name} stabilizuje się.`
            : `${combatant.name} rzut obronny przed śmiercią: ${ds.roll} (${ds.successes} sukces, ${ds.failures} porażki).`,
      );
      onChange(result.state);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się wykonać rzutu obronnego");
    }
  }

  const current = combat.active
    ? combat.combatants[combat.turnIndex % combat.combatants.length]
    : undefined;
  const myCombatant = combat.active
    ? combat.combatants.find((c) => c.isPlayer && c.characterId === myCharacterId)
    : undefined;

  return (
    <Card className="border-[#b99f6b]">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Swords className="size-4 text-[#a97e1f]" />
          Walka
          {combat.active && (
            <Badge>
              Runda {combat.round} · {combat.turnIndex % combat.combatants.length + 1}/
              {combat.combatants.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        {!combat.active && (
          <p className="flex items-center gap-2 text-xs text-[#7c6a45]">
            <Wand2 className="size-4 shrink-0 text-[#a97e1f]" />
            Jeszcze nie ma walki. DoMino snuje fabułę — niebezpieczeństwo nadejdzie, gdy historia tego
            zażąda.
          </p>
        )}

        {combat.active && (
          <>
            <div className="flex flex-col gap-1">
              <TooltipProvider delayDuration={250}>
              {combat.combatants.map((c, i) => (
                <div
                  key={c.id}
                  className={`flex items-center justify-between gap-2 rounded-sm border px-2 py-1.5 ${
                    i === combat.turnIndex % combat.combatants.length
                      ? "border-[#a97e1f] bg-[#f0e2bd] shadow-[0_0_0_1px_rgba(169,126,31,0.15)]"
                      : "border-[#c8b184] bg-[#fbf3dd]/50"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-6 font-display text-[10px] tracking-wide text-[#7c6a45]">
                      {c.initiative}
                    </span>
                    <span className={cn("font-display text-sm tracking-[0.04em]", c.characterId ? "text-[#2e2113]" : "text-[#5c4018]")}>
                      {c.name}
                    </span>
                    {c.characterId && <Badge variant="secondary">PC</Badge>}
                    {c.status === "dead" && (
                      <Badge variant="destructive">
                        <span className="line-through">martwy</span>
                      </Badge>
                    )}
                    {c.status === "downed" && <Badge variant="outline">powalony</Badge>}
                    {c.status === "stable" && <Badge variant="outline">stabilny</Badge>}
                    {(c.conditions ?? [])
                      .filter((cond) => cond !== "guiding_bolt")
                      .map((cond) => (
                        <Tooltip key={cond}>
                          <TooltipTrigger asChild>
                            <span className="rounded-sm border border-[#8f1d1d]/40 bg-[#8f1d1d]/10 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.1em] text-[#8f1d1d]">
                              {CONDITION_LABELS[cond] ?? cond}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <span className="text-[11px] text-[#f6ead0]">
                              {CONDITION_LABELS[cond] ?? cond}
                            </span>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                  </span>
                  <span className="flex items-center gap-2">
                    {c.isPlayer ? (
                      <>
                        <span className="h-1.5 w-14 overflow-hidden rounded-full bg-[#dcc89a]">
                          <span
                            className="block h-full rounded-full bg-[#7a4b1d]"
                            style={{ width: `${Math.max(0, Math.min(100, (c.currentHp / Math.max(c.maxHp, 1)) * 100))}%` }}
                          />
                        </span>
                        <span className="font-display text-[10px] tracking-wide text-[#7c6a45]">
                          {c.currentHp}/{c.maxHp} · AC {c.armorClass}
                        </span>
                      </>
                    ) : (
                      <span className="font-display text-[10px] tracking-wide text-[#7c6a45]">
                        AC {c.armorClass}
                      </span>
                    )}
                  </span>
                </div>
              ))}
              </TooltipProvider>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select value={targetId} onChange={(e) => setTargetId(e.target.value)} className="max-w-40">
                <option value="">Cel…</option>
                {combat.combatants
                  .filter((c) => !c.characterId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (AC {c.armorClass})
                    </option>
                  ))}
              </Select>
              <Input
                value={damageNotation}
                onChange={(e) => setDamageNotation(e.target.value)}
                className="w-24"
                title="Damage notation, e.g. 1d8+2"
              />
              <Button
                size="sm"
                onClick={() => myCombatant && void onAttack(myCombatant)}
                disabled={!myCombatant || !targetId}
              >
                Atak
              </Button>
              {myCombatant?.status === "downed" && (
                <Button size="sm" variant="secondary" onClick={() => void onDeathSave(myCombatant)}>
                  Rzut obronny
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => void call(() => combatApi.advance(campaignId))}>
                Koniec tury
              </Button>
              <Button size="sm" variant="ghost" onClick={() => void call(() => combatApi.end(campaignId))}>
                Zakończ walkę
              </Button>
            </div>

            <p className="text-xs text-[#7c6a45]">
              {current ? (
                <>
                  <span className="font-display not-italic tracking-[0.06em] text-[#7a4b1d]">{current.name}</span>
                  {" — to twoja tura."}
                </>
              ) : (
                "Brak aktywnej tury."
              )}{" "}
              Atak używa twojej broni (domyślnie 1d8 + STR) vs AC.
            </p>
          </>
        )}

        {lastResult && (
          <p className="animate-fade-up rounded-sm border-l-2 border-l-[#a97e1f] bg-[#efe2c4] px-2 py-1 text-sm">
            {lastResult}
          </p>
        )}
        {error && <p className="text-xs text-[#8f1d1d]">{error}</p>}
      </CardContent>
    </Card>
  );
}
