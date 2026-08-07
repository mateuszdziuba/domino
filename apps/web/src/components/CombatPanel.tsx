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
      setError(err instanceof Error ? err.message : "Combat action failed");
    }
  }

  async function onAttack(attacker: Combatant) {
    if (!targetId) {
      setError("Choose a target first");
      return;
    }
    setError(null);
    setLastResult(null);
    try {
      const result = await combatApi.attack(campaignId, attacker.id, targetId, { damageNotation });
      setLastResult(
        result.result.hit
          ? `${attacker.name} hits ${result.result.targetName} for ${result.result.damageTotal} damage (attack ${result.result.attackTotal} vs AC).${result.result.critical ? " Critical hit!" : ""}`
          : `${attacker.name} misses ${result.result.targetName} (attack ${result.result.attackTotal} vs AC).`,
      );
      onChange(result.state);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Attack failed");
    }
  }

  async function onDeathSave(combatant: Combatant) {
    try {
      const result = await combatApi.deathSave(campaignId, combatant.id);
      const { result: ds } = result;
      setLastResult(
        ds.dead
          ? `${combatant.name} fails their death saves and dies.`
          : ds.stable
            ? `${combatant.name} stabilizes.`
            : `${combatant.name} death save: ${ds.roll} (${ds.successes} success, ${ds.failures} failures).`,
      );
      onChange(result.state);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Death save failed");
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
          Combat
          {combat.active && (
            <Badge>
              Round {combat.round} · {combat.turnIndex % combat.combatants.length + 1}/
              {combat.combatants.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        {!combat.active && (
          <p className="flex items-center gap-2 text-xs italic text-[#7c6a45]">
            <Wand2 className="size-4 shrink-0 text-[#a97e1f]" />
            No battle yet. DoMino weaves the plot — danger comes when the story calls for it.
          </p>
        )}

        {combat.active && (
          <>
            <div className="flex flex-col gap-1">
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
                        <span className="line-through">dead</span>
                      </Badge>
                    )}
                    {c.status === "downed" && <Badge variant="outline">downed</Badge>}
                    {c.status === "stable" && <Badge variant="outline">stable</Badge>}
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
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select value={targetId} onChange={(e) => setTargetId(e.target.value)} className="max-w-40">
                <option value="">Target…</option>
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
                Attack
              </Button>
              {myCombatant?.status === "downed" && (
                <Button size="sm" variant="secondary" onClick={() => void onDeathSave(myCombatant)}>
                  Death save
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => void call(() => combatApi.advance(campaignId))}>
                End turn
              </Button>
              <Button size="sm" variant="ghost" onClick={() => void call(() => combatApi.end(campaignId))}>
                End combat
              </Button>
            </div>

            <p className="text-xs italic text-[#7c6a45]">
              {current ? (
                <>
                  <span className="font-display not-italic tracking-[0.06em] text-[#7a4b1d]">{current.name}</span>
                  's turn.
                </>
              ) : (
                "No active turn."
              )}{" "}
              Attack uses your weapon (default 1d8 + STR) vs AC.
            </p>
          </>
        )}

        {lastResult && (
          <p className="animate-fade-up rounded-sm border-l-2 border-l-[#a97e1f] bg-[#efe2c4] px-2 py-1 text-xs italic">
            {lastResult}
          </p>
        )}
        {error && <p className="text-xs text-[#8f1d1d]">{error}</p>}
      </CardContent>
    </Card>
  );
}
