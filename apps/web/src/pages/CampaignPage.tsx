import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { Send, Users } from "lucide-react";
import {
  campaignApi,
  characterApi,
  spellbookApi,
  type CampaignDetail,
  type SpellMeta,
} from "../lib/api-client";
import type { ChatMessage, DmSuggestion } from "@domino/shared";
import { useAuth } from "../lib/auth";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Select } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/ui/tooltip";
import { CombatPanel } from "../components/CombatPanel";
import { subscribeCampaign } from "../lib/stream";

const ACTION_PROMPTS: Record<string, string> = {
  attack: "Atakuję najbliższego wroga!",
  dodge: "Wykonuję unik.",
  dash: "Biegnę sprintem.",
  disengage: "Wycofuję się ostrożnie.",
  hide: "Ukrywam się.",
  ready: "Przygotowuję akcję: ",
  help: "Pomagam sojusznikowi.",
  "use-item": "Używam przedmiotu: ",
  "cast-spell": "Rzucam zaklęcie: ",
  "dodge-bonus": "Używam akcji dodatkowej.",
  "opportunity-attack": "Atakuję okazyjnie!",
  investigate: "Przeszukuję teren w poszukiwaniu wskazówek.",
  perception: "Rozglądam się i nasłuchuję.",
  negotiate: "Próbuję wynegocjować pokój.",
  interact: "Interaguję ze światem: ",
  rest: "Odpoczywamy przy ognisku.",
};

function spellEffectSummary(meta: SpellMeta): string {
  if (meta.effect.kind === "damage") {
    const dice = [meta.effect.dice, meta.effect.damageType].filter(Boolean).join(" ");
    const extra = meta.effect.attack
      ? ", atak"
      : meta.effect.save
        ? `, rzut obronny ${meta.effect.save}`
        : "";
    return `${dice}${extra}`;
  }
  if (meta.effect.kind === "heal") {
    return `${meta.effect.dice ?? ""}${meta.effect.mod ? "+mod" : ""} leczenia`;
  }
  return "stabilizacja";
}

function spellEffectDescription(meta: SpellMeta): string {
  if (meta.effect.kind === "damage") {
    const dice = [meta.effect.dice, meta.effect.damageType].filter(Boolean).join(" ");
    const extra = meta.effect.attack
      ? "rzut ataku"
      : meta.effect.save
        ? `rzut obronny (${meta.effect.save})`
        : "";
    return `Obrażenia: ${dice}${extra ? ` — ${extra}` : ""}`;
  }
  if (meta.effect.kind === "heal") {
    return `Leczenie: ${meta.effect.dice ?? ""}${meta.effect.mod ? " + modyfikator" : ""} punktów życia`;
  }
  return "Stabilizuje istotę na 0 punktach życia.";
}

export default function CampaignPage() {
  const { id } = useParams({ from: "/app/campaigns/$id" });
  const { user } = useAuth();
  const [detail, setDetail] = useState<CampaignDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [suggestion, setSuggestion] = useState<DmSuggestion | null>(null);
  const [myCharacters, setMyCharacters] = useState<{ id: string; name: string }[]>([]);
  const [joinCharacterId, setJoinCharacterId] = useState("");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [dmMode, setDmMode] = useState<string>("preview");
  const [connState, setConnState] = useState<"connecting" | "live" | "offline">("connecting");
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [roll, setRoll] = useState<{
    id: number;
    label: string;
    detail: string;
    kind: "attack" | "death-save" | "spell";
  } | null>(null);
  const rollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [spellbook, setSpellbook] = useState<{
    spells: string[];
    slots: { level: number; used: number; max: number }[];
    spellcastingAbility: string;
  } | null>(null);
  const [spellRegistry, setSpellRegistry] = useState<SpellMeta[] | null>(null);

  const member = detail?.members.find((m) => m.userId === user?.id);

  const refreshSpellbook = useCallback(() => {
    if (!member?.characterId) {
      setSpellbook(null);
      return;
    }
    characterApi
      .sheet(member.characterId)
      .then(({ sheet }) =>
        setSpellbook({
          spells: sheet.character.spells ?? [],
          slots: sheet.spellSlots,
          spellcastingAbility: sheet.spellcasting?.ability ?? "",
        }),
      )
      .catch(() => {});
  }, [member?.characterId]);

  useEffect(() => {
    spellbookApi.list().then((r) => setSpellRegistry(r.spells)).catch(() => {});
  }, []);

  useEffect(() => {
    refreshSpellbook();
  }, [refreshSpellbook, id]);

  const load = useCallback(() => {
    if (!id) return;
    campaignApi.get(id).then(setDetail).catch(() => {});
    campaignApi.messages(id).then(({ messages }) => setMessages(messages)).catch(() => {});
    campaignApi
      .dmSuggestion(id)
      .then(({ suggestion }) => setSuggestion(suggestion))
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    load();
    characterApi.list().then(({ characters }) => setMyCharacters(characters)).catch(() => {});
    if (!id) return;
    return subscribeCampaign(id, {
      onConnected: () => {
        setConnState("live");
        load();
        refreshSpellbook();
      },
      onState: (state) => {
        setDetail((prev) => (prev ? { ...prev, state } : prev));
        refreshSpellbook();
        campaignApi
          .dmSuggestion(id)
          .then(({ suggestion }) => setSuggestion(suggestion))
          .catch(() => {});
      },
      onChatMessage: (message) =>
        setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message])),
      onActionResolved: (payload) => {
        showRoll(payload);
        refreshSpellbook();
      },
      onEvent: (type) => {
        if (type === "character.joined") load();
      },
      onOffline: () => setConnState("offline"),
    });
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!id) return null;

  async function onJoin(e: FormEvent) {
    e.preventDefault();
    if (!joinCharacterId || !id) return;
    try {
      await campaignApi.join(id, joinCharacterId);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join");
    }
  }

  async function onSend(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const result = await campaignApi.sendMessage(id!, input.trim());
      setDmMode(result.dmMode);
      setInput("");
      setMessages((prev) => {
        let next = prev.some((m) => m.id === result.message.id)
          ? prev
          : [...prev, result.message];
        next = next.some((m) => m.id === result.dmMessage.id) ? next : [...next, result.dmMessage];
        return next;
      });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  const legalActions = (suggestion?.availableActions.filter((a) => a.legal) ?? []).slice(0, 6);

  function showRoll(payload: Record<string, unknown>) {
    const type = payload.type;
    if (type !== "attack" && type !== "death-save" && type !== "spell") return;
    let label = "";
    let detail = "";
    if (type === "attack") {
      const attackRoll = Number(payload.attackRoll ?? 0);
      const attackTotal = Number(payload.attackTotal ?? 0);
      const outcome = payload.critical ? "KRYTYK!" : payload.hit ? "Trafienie!" : "Pudło";
      label = `Rzut ataku: ${attackRoll} (${attackTotal} vs AC) — ${outcome}`;
      const damage = Number(payload.damageTotal ?? 0);
      if (payload.hit && damage > 0) label += ` · Obrażenia: ${damage}`;
    } else if (type === "death-save") {
      label = `Rzut obronny: ${Number(payload.roll ?? 0)}`;
      detail = `${Number(payload.successes ?? 0)} sukces / ${Number(payload.failures ?? 0)} porażki`;
      if (payload.stable) detail += " — Stabilizacja!";
      if (payload.dead) detail += " — Śmierć!";
    } else {
      label = `Zaklęcie: ${String(payload.spell ?? "?")}`;
      const saved =
        typeof payload.saveTotal === "number" && typeof payload.saveDc === "number"
          ? payload.saveTotal >= payload.saveDc
          : undefined;
      label +=
        saved === undefined
          ? payload.hit
            ? " — Trafienie!"
            : " — Pudło!"
          : saved
            ? " — Udany rzut obronny"
            : " — Nieudany rzut obronny";
      const damage = Number(payload.damageTotal ?? 0);
      const healed = Number(payload.healed ?? 0);
      if (healed > 0) label += ` · Leczenie: ${healed}`;
      else if (damage > 0) label += ` · Obrażenia: ${damage}`;
    }
    if (rollTimerRef.current) clearTimeout(rollTimerRef.current);
    setRoll({ id: Date.now(), label, detail, kind: type });
    rollTimerRef.current = setTimeout(() => setRoll(null), 4000);
  }

  function onStateChange(newState: NonNullable<CampaignDetail["state"]>) {
    setDetail((prev) => (prev ? { ...prev, state: newState } : prev));
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl tracking-[0.1em] text-[#3a2c17]">
          <span className="mr-2 text-[#a97e1f]">✦</span>
          {detail?.campaign.name ?? "Campaign"}
        </h1>
        <Badge variant="secondary">{detail?.state.phase ?? "…"}</Badge>
        <Badge variant="outline">{detail?.state.location ?? "…"}</Badge>
        <Badge variant={dmMode === "preview" ? "secondary" : "default"}>
          DM: {dmMode}
        </Badge>
        <Badge
          variant={connState === "live" ? "default" : connState === "offline" ? "destructive" : "secondary"}
          className={connState === "live" ? "text-[#2e7d32]" : undefined}
        >
          {connState === "live" ? "Live" : connState === "offline" ? "Offline" : "Connecting…"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <Card className="border-[#b99f6b]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">DM chat</CardTitle>
              <CardDescription>Describe what your character does.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="scroll-parchment flex max-h-[55vh] min-h-[300px] flex-col gap-3 overflow-y-auto pr-1">
                {messages.length === 0 && (
                  <p className="text-sm italic text-[#7c6a45]">
                    The adventure hasn't begun. Say something to the DM.
                  </p>
                )}
                {messages.map((message, i) => (
                  <div
                    key={message.id}
                    className={`max-w-[85%] animate-fade-up px-3 py-2 text-sm shadow-[0_2px_6px_-3px_rgba(60,40,10,0.4)] ${
                      message.role === "dm"
                        ? "self-start rounded-r-md rounded-tl-sm border border-[#c8b184] border-l-2 border-l-[#a97e1f] bg-[#efe2c4] text-[#2e2113]"
                        : "self-end rounded-l-md rounded-tr-sm border border-[#4a3417] bg-[#2e2113] text-[#f6ead0]"
                    }`}
                    style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
                  >
                    <div
                      className={`mb-0.5 font-display text-[10px] uppercase tracking-[0.14em] ${
                        message.role === "dm" ? "text-[#a97e1f]" : "text-[#c9b183]"
                      }`}
                    >
                      {message.senderName}
                    </div>
                    <div className="whitespace-pre-wrap italic">{message.content}</div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              {roll && (
                <div
                  key={roll.id}
                  className="animate-dice-roll mt-3 rounded-sm border-l-2 border-l-[#a97e1f] bg-[#efe2c4] px-3 py-2 text-sm"
                >
                  🎲 <span className="font-display tracking-[0.06em] text-[#7a4b1d]">{roll.label}</span>
                  {roll.detail && <> — {roll.detail}</>}
                </div>
              )}
              {member && spellbook && spellbook.spells.length > 0 && (
                <div className="mt-3 rounded-sm border border-[#c8b184]/70 bg-[#fbf3dd]/40 p-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-display text-[10px] uppercase tracking-[0.14em] text-[#7c6a45]">
                      Księga zaklęć
                    </div>
                    {spellbook.slots.filter((s) => s.max > 0).length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {spellbook.slots
                          .filter((s) => s.max > 0)
                          .map((s) => (
                            <span
                              key={s.level}
                              className={`rounded-sm border px-1.5 py-0.5 font-display text-[9px] uppercase tracking-[0.1em] ${
                                s.used >= s.max
                                  ? "border-[#8f1d1d]/50 bg-[#8f1d1d]/10 text-[#8f1d1d]"
                                  : s.used === s.max - 1
                                    ? "border-[#a97e1f]/60 bg-[#dcc89a]/50 text-[#5c4018]"
                                    : "border-[#2e4d3a]/40 bg-[#2e4d3a]/10 text-[#2e4d3a]"
                              }`}
                            >
                              P{s.level}: {s.used}/{s.max}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>

                  <TooltipProvider delayDuration={250}>
                    {[0, 1].map((groupLevel) => {
                      const group =
                        groupLevel === 0
                          ? spellbook.spells.filter(
                              (s) => (spellRegistry?.find((m) => m.name === s)?.level ?? 1) === 0,
                            )
                          : spellbook.spells.filter(
                              (s) => (spellRegistry?.find((m) => m.name === s)?.level ?? 1) === groupLevel,
                            );
                      if (group.length === 0) return null;
                      return (
                        <div key={groupLevel} className="mt-2 first:mt-2">
                          <div className="mb-1 flex items-center gap-1.5">
                            <span className="font-display text-[9px] uppercase tracking-[0.14em] text-[#a97e1f]">
                              {groupLevel === 0 ? "Cantripy" : `Poziom ${groupLevel}`}
                            </span>
                            <span className="h-px flex-1 bg-[#c8b184]/50" />
                          </div>
                          <div className="flex flex-col gap-1">
                            {group.map((spell) => {
                              const meta = spellRegistry?.find((s) => s.name === spell);
                              const level = meta?.level ?? 1;
                              const isCantrip = level === 0;
                              const slot = isCantrip ? undefined : spellbook.slots[level - 1];
                              const unavailable = !isCantrip && (!slot || slot.used >= slot.max);
                              const remaining = slot ? slot.max - slot.used : 0;
                              return (
                                <Tooltip key={spell}>
                                  <TooltipTrigger asChild>
                                    <span className="inline-flex">
                                      <button
                                        type="button"
                                        disabled={unavailable}
                                        onClick={() => setInput(`Rzucam ${spell} na `)}
                                        className={`group flex w-full items-center justify-between gap-2 rounded-sm border px-2.5 py-1.5 text-left transition-colors ${
                                          unavailable
                                            ? "cursor-not-allowed border-[#c8b184]/40 bg-[#fbf3dd]/20 opacity-50"
                                            : "border-[#c8b184] bg-[#fbf3dd]/70 hover:border-[#a97e1f] hover:bg-[#f0e2bd]"
                                        } focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#a97e1f]`}
                                      >
                                        <span className="flex min-w-0 items-baseline gap-1.5">
                                          <span className="truncate font-display text-xs tracking-[0.06em] text-[#2e2113]">
                                            {spell}
                                          </span>
                                          {meta && (
                                            <span className="truncate text-[10px] italic text-[#7c6a45]">
                                              {spellEffectSummary(meta)}
                                            </span>
                                          )}
                                        </span>
                                        {isCantrip ? (
                                          <span className="rounded-sm bg-[#dcc89a]/60 px-1.5 py-0.5 font-display text-[9px] uppercase tracking-[0.1em] text-[#5c4018]">
                                            ∞
                                          </span>
                                        ) : (
                                          <span
                                            className={`rounded-sm px-1.5 py-0.5 font-display text-[9px] uppercase tracking-[0.1em] ${
                                              remaining === 0
                                                ? "bg-[#8f1d1d]/15 text-[#8f1d1d]"
                                                : remaining === 1
                                                  ? "bg-[#dcc89a]/60 text-[#5c4018]"
                                                  : "bg-[#2e4d3a]/15 text-[#2e4d3a]"
                                            }`}
                                          >
                                            {slot ? `${slot.used}/${slot.max}` : "0/0"}
                                          </span>
                                        )}
                                      </button>
                                    </span>
                                  </TooltipTrigger>
                                  {meta && (
                                    <TooltipContent>
                                      <div className="flex flex-col gap-1">
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                          <span className="font-display text-xs tracking-[0.08em] text-[#e8c56a]">
                                            {meta.name}
                                          </span>
                                          <span className="text-[9px] uppercase tracking-[0.12em] text-[#c9b183]">
                                            {meta.school}
                                            {meta.level === 0 ? " · cantrip" : ` · poziom ${meta.level}`}
                                          </span>
                                        </div>
                                        <div className="text-[10px] text-[#c9b183]">
                                          {meta.castingTime} · {meta.range} · {meta.duration} ·{" "}
                                          {meta.components}
                                        </div>
                                        <div className="text-[11px] text-[#f6ead0]">
                                          {spellEffectDescription(meta)}
                                        </div>
                                        {unavailable && (
                                          <div className="text-[10px] italic text-[#e8a08a]">
                                            Brak wolnych slotów poziomu {level} — długi odpoczynek je
                                            odzyskuje.
                                          </div>
                                        )}
                                      </div>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </TooltipProvider>
                </div>
              )}
              {legalActions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {legalActions.map((action) => (
                    <button
                      key={action.key}
                      type="button"
                      disabled={!member}
                      onClick={() => setInput(ACTION_PROMPTS[action.key] ?? action.label)}
                      className="rounded-sm border border-[#c8b184] bg-[#fbf3dd]/60 px-2 py-1 font-display text-xs tracking-[0.06em] text-[#3a2c17] hover:bg-[#f0e2bd] disabled:pointer-events-none disabled:opacity-50"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
              <form onSubmit={onSend} className="mt-3 flex gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`${member ? "Your turn, adventurer" : "Join with a character first"}…`}
                  className="min-h-[60px] flex-1"
                  disabled={!member || sending}
                />
                <Button type="submit" disabled={!member || sending} className="self-end">
                  <Send className="size-4" />
                  Send
                </Button>
              </form>
              {error && <p className="mt-2 text-sm text-[#8f1d1d]">{error}</p>}
            </CardContent>
          </Card>

          {!member && (
            <Card className="border-[#b99f6b]">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Join this campaign</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={onJoin} className="flex gap-2">
                  <Select value={joinCharacterId} onChange={(e) => setJoinCharacterId(e.target.value)}>
                    <option value="">Choose a character…</option>
                    {myCharacters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                  <Button type="submit" disabled={!joinCharacterId}>
                    Join
                  </Button>
                </form>
                {myCharacters.length === 0 && (
                  <p className="mt-2 text-sm italic text-[#7c6a45]">
                    You need a character first —{" "}
                    <Link to="/app/characters" className="font-display text-[11px] uppercase tracking-[0.1em] text-[#7a4b1d] underline-offset-4 hover:underline">
                      create one
                    </Link>
                    .
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {detail && (
            <CombatPanel
              campaignId={id}
              state={detail.state}
              myCharacterId={member?.characterId}
              onChange={onStateChange}
            />
          )}

          <Card className="border-[#b99f6b]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="size-4 text-[#a97e1f]" />
                Party
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              {detail?.members.length === 0 && (
                <p className="italic text-[#7c6a45]">No adventurers yet.</p>
              )}
              {detail?.members.map((m) => (
                <div key={m.characterId} className="flex items-center justify-between border-b border-dotted border-[#c8b184] pb-1">
                  <span>
                    <span className="mr-1 text-[10px] text-[#a97e1f]">✦</span>
                    {m.characterName ?? m.characterId}
                  </span>
                  <Badge variant="outline">joined</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-[#b99f6b]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Your turn</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="italic text-[#7c6a45]">Phase:</span>
                <Badge variant="secondary">{detail?.state.phase ?? "…"}</Badge>
              </div>
              {suggestion?.turnOf ? (
                <p>
                  It is <strong className="font-display tracking-[0.06em] text-[#7a4b1d]">{suggestion.turnOf.name}</strong>'s turn
                  {detail?.state.combat.active && (
                    <span className="italic text-[#7c6a45]">
                      {" "}· round {detail.state.combat.round}
                    </span>
                  )}
                  .
                </p>
              ) : (
                <p className="italic text-[#7c6a45]">No active turn.</p>
              )}
              <div className="mt-1 flex flex-col gap-1">
                {suggestion?.availableActions.length === 0 && (
                  <p className="text-xs italic text-[#7c6a45]">Waiting for your turn…</p>
                )}
                {suggestion?.availableActions.map((action) => (
                  <div
                    key={action.key}
                    className="flex items-center justify-between gap-2 rounded-sm border border-[#c8b184] bg-[#fbf3dd]/60 px-2 py-1.5 text-xs"
                  >
                    <span>
                      <span className="font-display tracking-[0.06em] text-[#3a2c17]">{action.label}</span>
                      <span className="italic text-[#7c6a45]"> · {action.description}</span>
                    </span>
                    {action.legal ? (
                      <Badge>available</Badge>
                    ) : (
                      <Badge variant="outline">{action.reason ?? "unavailable"}</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
