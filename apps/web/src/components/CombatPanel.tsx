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

const HIDDEN_CONDITION_MARKERS = ["guiding_bolt", "sapped"];

function isHiddenMarker(cond: string): boolean {
  return (
    HIDDEN_CONDITION_MARKERS.includes(cond) ||
    cond.startsWith("slowed:") ||
    cond.startsWith("vexed:")
  );
}

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

  const grid = combat.grid;
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
            {grid && grid.cols > 0 && grid.rows > 0 && (
              <div>
                <div
                  className="relative w-full overflow-hidden rounded-sm border border-[#b99f6b] bg-[#efe2c4] shadow-[inset_0_2px_6px_rgba(90,60,20,0.15)]"
                  style={{
                    height: "11rem",
                    backgroundImage:
                      "repeating-linear-gradient(0deg, rgba(160,139,92,0.35) 0 1px, transparent 1px 100%), repeating-linear-gradient(90deg, rgba(160,139,92,0.35) 0 1px, transparent 1px 100%)",
                    backgroundSize: `${100 / grid.cols}% ${100 / grid.rows}%`,
                  }}
                >
                  {combat.combatants
                    .filter((c) => c.x != null && c.y != null && c.status !== "dead")
                    .map((c) => (
                      <Tooltip key={c.id}>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "absolute flex items-center justify-center rounded-full border text-[9px] font-display text-[#f6ead0]",
                              c.isPlayer
                                ? "border-[#5c4018] bg-[#a97e1f]"
                                : "border-[#2e2113] bg-[#4a3417]",
                              c.id === current?.id && "ring-2 ring-[#8f1d1d]",
                              c.status === "downed" && "opacity-60",
                            )}
                            style={{
                              left: `${((c.x! - 1) / grid.cols) * 100}%`,
                              top: `${((c.y! - 1) / grid.rows) * 100}%`,
                              width: `calc(${100 / grid.cols}% * 0.8)`,
                              aspectRatio: "1",
                            }}
                            title={c.name}
                          >
                            {c.isPlayer ? "✦" : "•"}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <span className="text-[11px] text-[#f6ead0]">
                            {c.name} — pole {c.x},{c.y}
                            {c.id === current?.id ? " (aktywna tura)" : ""}
                          </span>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                </div>
                <p className="mt-1 text-[10px] italic text-[#7c6a45]">
                  Pole bitwy {grid.cols}×{grid.rows} · 5 ft / pole
                </p>
              </div>
            )}
            {combat.lightLevel && (
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "rounded-sm border px-1.5 py-0.5 text-[9px] uppercase tracking-[0.1em]",
                    combat.lightLevel === "bright"
                      ? "border-[#4a7a3d]/40 bg-[#4a7a3d]/10 text-[#3f6b34]"
                      : combat.lightLevel === "dim"
                        ? "border-[#a97e1f]/60 bg-[#dcc89a]/50 text-[#5c4018]"
                        : "border-[#2e2113]/50 bg-[#2e2113]/10 text-[#2e2113]",
                  )}
                >
                  Światło:{" "}
                  {combat.lightLevel === "bright"
                    ? "jasne"
                    : combat.lightLevel === "dim"
                      ? "przyćmione"
                      : "ciemne"}
                </span>
                {combat.lightLevel === "dark" && (
                  <span className="text-[10px] leading-snug text-[#7c6a45]">
                    Ciemność: postacie bez ciemnowidzenia mają utrudnienie ataków (i ataki przeciw
                    nim mają przewagę).
                  </span>
                )}
              </div>
            )}
            <div className="flex flex-col gap-1">
              <TooltipProvider delayDuration={250}>
              {(() => {
                const current = combat.combatants[combat.turnIndex % combat.combatants.length];
                const alive = combat.combatants.filter((c) => c.status !== "dead");
                return alive.map((c) => (
                <div
                  key={c.id}
                  className={`flex items-center justify-between gap-2 rounded-sm border px-2 py-1.5 ${
                    c.id === current?.id
                      ? "border-[#a97e1f] bg-[#f0e2bd] shadow-[0_0_0_1px_rgba(169,126,31,0.15)]"
                      : "border-[#c8b184] bg-[#fbf3dd]/50"
                  }`}
                >
                  <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    <span className="w-6 shrink-0 font-display text-[10px] tracking-wide text-[#7c6a45]">
                      {c.initiative}
                    </span>
                    <span className={cn("min-w-0 truncate font-display text-sm tracking-[0.04em]", c.characterId ? "text-[#2e2113]" : "text-[#5c4018]")}>
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
                      .filter((cond) => !isHiddenMarker(cond))
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
                    {c.concentratingOn && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="rounded-sm border border-[#a97e1f]/60 bg-[#dcc89a]/50 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.1em] text-[#5c4018]">
                            ✦ {c.concentratingOn}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <span className="text-[11px] text-[#f6ead0]">
                            Koncentruje się na: {c.concentratingOn} — obrażenia mogą przerwać
                            koncentrację (rzut obronny na Kondycję).
                          </span>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {c.x != null && c.y != null ? (
                      <span className="text-[9px] text-[#a08b5c]">pole {c.x},{c.y}</span>
                    ) : (
                      c.position != null &&
                      c.position > 0 && (
                        <span className="text-[9px] text-[#a08b5c]">{c.position} ft</span>
                      )
                    )}
                    {c.speed != null && c.movementLeft != null && (
                      <span
                        className={cn(
                          "text-[9px]",
                          c.movementLeft <= 0
                            ? "text-[#8f1d1d]"
                            : c.movementLeft < c.speed
                              ? "text-[#a97e1f]"
                              : "text-[#a08b5c]",
                        )}
                      >
                        ruch {c.movementLeft}/{c.speed} ft
                      </span>
                    )}
                    {c.darkvision && (
                      <span
                        title="Widzi w ciemności"
                        className="rounded-sm border border-[#a97e1f]/50 bg-[#e8d3a0]/50 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.1em] text-[#5c4018]"
                      >
                        ciemnowidz.
                      </span>
                    )}
                    <span
                      title={
                        c.bonusActionAvailable
                          ? "Dostępna akcja dodatkowa"
                          : "Brak akcji dodatkowej"
                      }
                      className={cn(
                        "rounded-sm border px-1.5 py-0.5 text-[9px] uppercase tracking-[0.1em]",
                        c.bonusActionAvailable
                          ? "border-[#a97e1f]/60 bg-[#dcc89a]/50 text-[#5c4018]"
                          : "border-[#c8b184] bg-[#fbf3dd]/40 text-[#a08b5c]",
                      )}
                    >
                      akcja dod.
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
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
              ));
              })()}
              </TooltipProvider>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full max-w-full sm:max-w-40"
              >
                <option value="">Cel…</option>
                {combat.combatants
                  .filter((c) => !c.characterId && c.status !== "dead")
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (AC {c.armorClass})
                    </option>
                  ))}
              </Select>
              <Input
                value={damageNotation}
                onChange={(e) => setDamageNotation(e.target.value)}
                className="w-full sm:w-24"
                title="Notacja obrażeń (domyślnie z broni postaci)"
              />
              <Button
                size="sm"
                className="h-10"
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
              Atak używa ekwipowanej broni (kości i modyfikator z karty postaci) vs AC.
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
