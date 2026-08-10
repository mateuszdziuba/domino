import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useParams } from "@tanstack/react-router";
import {
  Map,
  Play,
  Coins,
  Send,
  Users,
  Dices,
  Volume2,
  VolumeX,
  ScrollText,
  Image as ImageIcon,
} from "lucide-react";
import {
  campaignApi,
  characterApi,
  featuresApi,
  spellbookApi,
  type CampaignDetail,
  type FeaturesCatalog,
  type SpellMeta,
} from "../lib/api-client";
import type { ChatMessage, DmSuggestion } from "@domino/shared";
import { MerchantPanel } from "../components/MerchantPanel";
import { DiceRollDisplay, type DiceSpec } from "../components/dice-roll";
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
import { LevelUpDialog } from "../components/LevelUpDialog";
import CharacterDrawer from "../components/CharacterDrawer";
import { subscribeCampaign } from "../lib/stream";
import { RichMessageText } from "../lib/chat-tooltips";
import { setSpellNamesPl, spellDisplayName, spellNamesPlEnabled } from "../lib/spell-lang";
import { playDice, playMessage, setSoundEnabled, soundEnabled } from "../lib/sound";

type RollEntry = {
  id: string;
  kind: "attack" | "death-save" | "spell" | "skill" | "item" | "image";
  label: string;
  detail: string;
  createdAt: string;
  animated?: boolean;
  url?: string;
  dice?: DiceSpec[];
  bonus?: number;
  total?: number;
  damageDice?: DiceSpec[];
  damageBonus?: number;
  damageTotal?: number;
};

type LevelUpInfo = {
  characterId: string;
  name: string;
  level: number;
  className: string;
};

type PartyChar = {
  characterId: string;
  name: string;
  currentHp: number;
  maxHp: number;
  level: number;
  gold?: number;
  portraitUrl?: string;
};

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

const SKILL_LABELS_PL: Record<string, string> = {
  acrobatics: "Akrobatyka",
  animalHandling: "Obsługa zwierząt",
  arcana: "Tajemnice",
  athletics: "Atletyka",
  deception: "Oszustwo",
  history: "Historia",
  insight: "Intuicja",
  intimidation: "Zastraszanie",
  investigation: "Śledztwo",
  medicine: "Medycyna",
  nature: "Natura",
  perception: "Percepcja",
  performance: "Występy",
  persuasion: "Perswazja",
  religion: "Religia",
  sleightOfHand: "Zwinne dłonie",
  stealth: "Skradanie",
  survival: "Przetrwanie",
};

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
    if (effect.flat != null) return `${effect.flat} punktów życia`;
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
      return effect.fullHp ? "wskrzeszenie z pełnym HP" : "wskrzeszenie";
    case "stabilize":
      return "stabilizacja";
    case "none":
      return "efekt narracyjny";
    default:
      return "—";
  }
}

function spellEffectDescription(meta: SpellMeta): string {
  const effect = meta.effect as Omit<SpellMeta["effect"], "kind"> & {
    kind: string;
    condition?: string;
  };
  if (effect.kind === "damage") {
    const dice = [effect.dice, effect.damageType].filter(Boolean).join(" ");
    const extra = effect.attack
      ? "rzut ataku"
      : effect.save
        ? `rzut obronny (${effect.save})`
        : "";
    return `Obrażenia: ${dice}${extra ? ` — ${extra}` : ""}`;
  }
  if (effect.kind === "heal" || effect.kind === "heal_all") {
    if (effect.flat != null) return `Leczenie: ${effect.flat} punktów życia`;
    return `Leczenie: ${effect.dice ?? ""}${effect.mod ? " + modyfikator" : ""} punktów życia`;
  }
  switch (effect.kind) {
    case "condition_apply":
      return `Nakłada stan: ${effect.condition ?? "?"}${effect.save ? ` — rzut obronny (${effect.save})` : ""}`;
    case "condition_remove":
      return "Usuwa stan.";
    case "restore":
      return "Leczy stany i wyczerpanie.";
    case "revive":
      return effect.fullHp ? "Wskrzeszenie z pełnym HP." : "Wskrzeszenie.";
    case "stabilize":
      return "Stabilizuje istotę na 0 punktach życia.";
    default:
      return "—";
  }
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
  const [soundOn, setSoundOn] = useState(() => soundEnabled());
  const [spellPl, setSpellPl] = useState(() => spellNamesPlEnabled());
  const [connState, setConnState] = useState<"connecting" | "live" | "offline">("connecting");
  const [merchantOpen, setMerchantOpen] = useState(false);
  const [myNotes, setMyNotes] = useState("");
  const [myNotesSaved, setMyNotesSaved] = useState("");
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [rolls, setRolls] = useState<RollEntry[]>([]);
  const seenRollIdsRef = useRef<Set<string>>(new Set());
  const [spellbook, setSpellbook] = useState<{
    spells: string[];
    slots: { level: number; used: number; max: number }[];
    spellcastingAbility: string;
  } | null>(null);
  const [spellRegistry, setSpellRegistry] = useState<SpellMeta[] | null>(null);
  const [partyChars, setPartyChars] = useState<PartyChar[]>([]);
  const [showGuide, setShowGuide] = useState(() => localStorage.getItem("domino-guide") !== "1");
  const [featuresCatalog, setFeaturesCatalog] = useState<FeaturesCatalog | null>(null);
  const [pendingLevelUp, setPendingLevelUp] = useState<LevelUpInfo | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerCharacterId, setDrawerCharacterId] = useState<string | null>(null);
  const [subclassDialogOpen, setSubclassDialogOpen] = useState(false);
  const subclassCheckDoneRef = useRef(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const member = detail?.members.find((m) => m.userId === user?.id);
  const amOwner = detail?.campaign.ownerId === user?.id;
  const combat = detail?.state.combat;
  const currentCombatant = combat?.active
    ? combat.combatants[combat.turnIndex % combat.combatants.length]
    : undefined;
  const myCombatant = combat?.active && member
    ? combat.combatants.find((c) => c.characterId === member.characterId)
    : undefined;
  const chatBlocked = Boolean(
    combat?.active && !amOwner && (!myCombatant || currentCombatant?.id !== myCombatant.id),
  );

  const showLobby = (detail?.state as { started?: boolean } | undefined)?.started === false;
  const isOwner = detail?.campaign.ownerId === user?.id;

  const refreshSpellbook = useCallback(() => {
    if (!member?.characterId) {
      setSpellbook(null);
      return;
    }
    characterApi
      .sheet(member.characterId)
      .then(({ sheet }) => {
        setSpellbook({
          spells: sheet.character.spells ?? [],
          slots: sheet.spellSlots,
          spellcastingAbility: sheet.spellcasting?.ability ?? "",
        });
        if (
          !subclassCheckDoneRef.current &&
          featuresCatalog &&
          sheet.character.level >= 3 &&
          !sheet.character.subclass &&
          (featuresCatalog.subclassDetails?.[sheet.character.className] ?? []).length > 0
        ) {
          subclassCheckDoneRef.current = true;
          setPendingLevelUp({
            characterId: sheet.character.id,
            name: sheet.character.name,
            level: sheet.character.level,
            className: sheet.character.className,
          });
          setSubclassDialogOpen(true);
        }
      })
      .catch(() => {});
  }, [member?.characterId, featuresCatalog]);

  useEffect(() => {
    spellbookApi.list().then((r) => setSpellRegistry(r.spells)).catch(() => {});
    featuresApi.get().then(setFeaturesCatalog).catch(() => {});
  }, []);

  const refreshParty = useCallback(() => {
    if (!detail?.members.length) {
      setPartyChars([]);
      return;
    }
    Promise.all(
      detail.members.map((m) =>
        characterApi
          .get(m.characterId)
          .then(({ character }) => ({
            characterId: character.id,
            name: character.name,
            currentHp: character.currentHp,
            maxHp: character.maxHp,
            level: character.level,
            gold: character.gold,
            portraitUrl: character.portraitUrl,
          }))
          .catch(() => null),
      ),
    ).then((chars) =>
      setPartyChars(chars.filter((c): c is NonNullable<typeof c> => c !== null)),
    );
  }, [detail?.members.length]);

  useEffect(() => {
    refreshParty();
  }, [refreshParty, id, detail?.members.length]);

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
    campaignApi
      .notes(id)
      .then(({ notes }) => {
        setMyNotes(notes);
        setMyNotesSaved(notes);
      })
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
        refreshParty();
      },
      onState: (state) => {
        setDetail((prev) => (prev ? { ...prev, state } : prev));
        refreshSpellbook();
        refreshParty();
        campaignApi
          .dmSuggestion(id)
          .then(({ suggestion }) => setSuggestion(suggestion))
          .catch(() => {});
      },
      onChatMessage: (message) => {
        if (message.role === "dm" && !document.hasFocus()) playMessage();
        setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
      },
      onActionResolved: (payload, event) => {
        const mapped = mapRollPayload(payload);
        if (mapped) {
          const eventId = event?.id ?? hashPayload(payload);
          if (eventId && !seenRollIdsRef.current.has(eventId)) {
            seenRollIdsRef.current.add(eventId);
            playDice();
            setRolls((prev) => [
              ...prev,
              {
                id: eventId,
                ...mapped,
                createdAt: event?.createdAt ?? new Date().toISOString(),
                animated: true,
              },
            ].slice(-40));
          }
        }
        refreshSpellbook();
        if (payload.type === "xp-award" && Array.isArray(payload.levelUps)) {
          const levelUp = (payload.levelUps as LevelUpInfo[]).find(
            (lu) => lu.characterId === member?.characterId,
          );
          if (levelUp) {
            setPendingLevelUp(levelUp);
            setSubclassDialogOpen(true);
          }
        }
      },
      onEvent: (type) => {
        if (type === "character.joined") load();
      },
      onOffline: () => setConnState("offline"),
    });
  }, [load, member?.characterId]);

  useEffect(() => {
    subclassCheckDoneRef.current = false;
  }, [member?.characterId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, rolls, sending]);

  if (!id) return null;

  async function onJoin(e: FormEvent) {
    e.preventDefault();
    if (!joinCharacterId || !id) return;
    try {
      await campaignApi.join(id, joinCharacterId);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się dołączyć");
    }
  }

  async function onStart() {
    if (!id || starting) return;
    setStarting(true);
    setStartError(null);
    try {
      const { state } = await campaignApi.start(id);
      setDetail((prev) => (prev ? { ...prev, state } : prev));
    } catch (err) {
      setStartError(err instanceof Error ? err.message : "Nie udało się rozpocząć przygody");
    } finally {
      setStarting(false);
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
        if (result.dmMessage) {
          next = next.some((m) => m.id === result.dmMessage.id) ? next : [...next, result.dmMessage];
        }
        return next;
      });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się wysłać");
    } finally {
      setSending(false);
    }
  }

  const legalActions = (suggestion?.availableActions.filter((a) => a.legal) ?? []).slice(0, 6);

  function mapRollPayload(payload: Record<string, unknown>): {
    kind: "attack" | "death-save" | "spell" | "skill" | "item" | "image";
    label: string;
    detail: string;
    url?: string;
    dice?: DiceSpec[];
    bonus?: number;
    total?: number;
    damageDice?: DiceSpec[];
    damageBonus?: number;
    damageTotal?: number;
  } | null {
    const type = payload.type;
    if (type === "image") {
      return {
        kind: "image",
        label: "Obraz",
        detail: String(payload.prompt ?? ""),
        url: String(payload.url ?? ""),
      };
    }
    if (type === "portrait") {
      return {
        kind: "image",
        label: `Portret: ${String(payload.name ?? "?")}`,
        detail: "",
        url: String(payload.url ?? ""),
      };
    }
    if (
      type !== "attack" &&
      type !== "death-save" &&
      type !== "spell" &&
      type !== "skill-check" &&
      type !== "item-use"
    ) {
      return null;
    }
    let label = "";
    let detail = "";
    let dice: DiceSpec[] | undefined;
    let bonus: number | undefined;
    let diceTotal: number | undefined;
    let damageDice: DiceSpec[] | undefined;
    let damageBonus: number | undefined;
    let damageTotal: number | undefined;

    function parseNotation(notation: string): { count: number; sides: number } | null {
      const match = notation.match(/^(\d*)d(\d+)/i);
      if (!match) return null;
      return { count: Number(match[1] ?? "1") || 1, sides: Number(match[2]) };
    }
    function buildDamageDice(notation: string, rolls: number[]) {
      const parsed = parseNotation(notation);
      if (!parsed || rolls.length === 0) return;
      damageDice = rolls.map((value) => ({ sides: parsed.sides, value }));
      damageBonus =
        damageTotal === undefined
          ? undefined
          : damageTotal - rolls.reduce((a, b) => a + b, 0);
    }
    if (type === "attack") {
      const attackRoll = Number(payload.attackRoll ?? 0);
      const attackTotal = Number(payload.attackTotal ?? 0);
      const outcome = payload.critical ? "KRYTYK!" : payload.hit ? "Trafienie!" : "Pudło";
      label = `Rzut ataku: ${attackRoll} (${attackTotal} vs AC) — ${outcome}`;
      const damage = Number(payload.damageTotal ?? 0);
      if (payload.hit && damage > 0) label += ` · Obrażenia: ${damage}`;
      const attackRolls = (payload.attackRolls as number[] | undefined) ?? [attackRoll];
      dice = attackRolls.map((r) => ({ sides: 20, value: r }));
      bonus = attackTotal - attackRoll;
      diceTotal = attackTotal;
    } else if (type === "death-save") {
      const roll = Number(payload.roll ?? 0);
      label = `Rzut obronny: ${roll}`;
      detail = `${Number(payload.successes ?? 0)} sukces / ${Number(payload.failures ?? 0)} porażki`;
      if (payload.stable) detail += " — Stabilizacja!";
      if (payload.dead) detail += " — Śmierć!";
      dice = [{ sides: 20, value: roll }];
      diceTotal = roll;
    } else if (type === "spell") {
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
      if (typeof payload.attackRoll === "number") {
        const rolls = (payload.attackRolls as number[] | undefined) ?? [payload.attackRoll];
        dice = rolls.map((r) => ({ sides: 20, value: r }));
        diceTotal = Number(payload.attackTotal ?? 0);
        bonus = diceTotal - (payload.attackRoll as number);
      } else if (typeof payload.saveTotal === "number") {
        dice = [{ sides: 20, value: payload.saveTotal }];
        diceTotal = payload.saveTotal;
      }
      const damage = Number(payload.damageTotal ?? 0);
      const healed = Number(payload.healed ?? 0);
      if (healed > 0) label += ` · Leczenie: ${healed}`;
      else if (damage > 0) label += ` · Obrażenia: ${damage}`;
      if (damage > 0) {
        damageTotal = damage;
        buildDamageDice(
          String(payload.damageNotation ?? "1d6"),
          (payload.damageRolls as number[] | undefined) ?? [],
        );
      }
    } else if (type === "skill-check") {
      const skillKey = String(payload.skill ?? "?");
      const skill = SKILL_LABELS_PL[skillKey] ?? skillKey;
      const roll = Number(payload.roll ?? 0);
      const mod = Number(payload.mod ?? 0);
      const total = Number(payload.total ?? 0);
      const dc = Number(payload.dc ?? 0);
      const success = Boolean(payload.success);
      label = `Test umiejętności: ${skill}`;
      detail = `rzut ${roll} + ${mod} = ${total} vs DC ${dc} — ${success ? "sukces!" : "porażka"}`;
      if (payload.advantage) detail += " · przewaga";
      if (payload.disadvantage) detail += " · utrudnienie";
      if (payload.inspirationUsed) detail += " · inspiracja";
      const rolls = (payload.rolls as number[] | undefined) ?? [roll];
      dice = rolls.map((r) => ({ sides: 20, value: r }));
      bonus = mod;
      diceTotal = Number(payload.total ?? 0);
    } else if (type === "item-use") {
      label = `Przedmiot: ${String(payload.item ?? "?")}`;
      detail = `${String(payload.character ?? "?")} odzyskuje ${Number(payload.healed ?? 0)} punktów życia`;
    }
    const kind = type === "skill-check" ? "skill" : type === "item-use" ? "item" : type;
    return {
      kind,
      label,
      detail,
      dice,
      bonus,
      total: diceTotal,
      damageDice,
      damageBonus,
      damageTotal,
    };
  }

  function hashPayload(payload: Record<string, unknown>): string {
    const str = JSON.stringify(payload);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return `p${hash}`;
  }

  useEffect(() => {
    if (!id) return;
    campaignApi
      .events(id)
      .then(({ events }) => {
        const history: RollEntry[] = [];
        for (const event of events) {
          if (event.type !== "action.resolved") continue;
          const payload = (event.payload ?? {}) as Record<string, unknown>;
          const mapped = mapRollPayload(payload);
          if (!mapped) continue;
          if (event.id) seenRollIdsRef.current.add(event.id);
          history.push({
            id: event.id,
            ...mapped,
            createdAt: event.createdAt,
            animated: false,
          });
        }
        history.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        setRolls(history.slice(-20));
      })
      .catch(() => {});
  }, [id]);

  function onStateChange(newState: NonNullable<CampaignDetail["state"]>) {
    setDetail((prev) => (prev ? { ...prev, state: newState } : prev));
  }

  const timeline = [
    ...messages.map((message) => ({ kind: "message" as const, message })),
    ...rolls.map((roll) => ({ kind: "roll" as const, roll })),
  ].sort((a, b) => {
    const ta = a.kind === "message" ? a.message.createdAt : a.roll.createdAt;
    const tb = b.kind === "message" ? b.message.createdAt : b.roll.createdAt;
    return ta.localeCompare(tb);
  });

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl tracking-[0.1em] text-[#3a2c17]">
          <span className="mr-2 text-[#a97e1f]">✦</span>
          {detail?.campaign.name ?? "Kampania"}
        </h1>
        <Badge variant="secondary">{detail?.state.phase ?? "…"}</Badge>
        <Badge variant="outline">{detail?.state.location ?? "…"}</Badge>
        <Badge variant={dmMode === "preview" ? "secondary" : "default"}>
          DM: {dmMode}
        </Badge>
        <TooltipProvider delayDuration={250}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={soundOn ? "Wyłącz dźwięk" : "Włącz dźwięk"}
                  className="h-6 w-6 p-0 text-[#7c6a45] hover:text-[#3a2c17]"
                  onClick={() => {
                    const next = !soundOn;
                    setSoundEnabled(next);
                    setSoundOn(next);
                  }}
                >
                  {soundOn ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              Dźwięk: {soundOn ? "włączony" : "wyłączony"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {member && (
          <TooltipProvider delayDuration={250}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="Karta postaci"
                    className="h-6 w-6 p-0 text-[#7c6a45] hover:text-[#3a2c17]"
                    onClick={() => {
                      setDrawerCharacterId(member.characterId);
                      setDrawerOpen(true);
                    }}
                  >
                    <ScrollText className="size-4" />
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>Karta postaci</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <Badge
          variant={connState === "live" ? "default" : connState === "offline" ? "destructive" : "secondary"}
          className={connState === "live" ? "text-[#2e7d32]" : undefined}
        >
          {connState === "live" ? "Na żywo" : connState === "offline" ? "Offline" : "Łączenie…"}
        </Badge>
      </div>

      {showLobby ? (
        <div className="mx-auto max-w-2xl">
          <Card className="border-[#b99f6b]">
            <CardHeader className="pb-3">
              <CardTitle className="text-2xl">
                <span className="mr-2 text-[#a97e1f]">✦</span>Lobby — {detail?.campaign.name}
              </CardTitle>
              <CardDescription className="not-italic">
                Gracze dołączają przed startem — przygoda zacznie się dla wszystkich jednocześnie.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-[#a97e1f]" />
                  <span className="font-display text-[10px] uppercase tracking-[0.14em] text-[#7c6a45]">
                    Drużyna
                  </span>
                </div>
                {detail && <PartyRows detail={detail} partyChars={partyChars} />}
              </div>
              {isOwner ? (
                <div className="flex flex-col gap-2">
                  <Button type="button" onClick={onStart} disabled={starting} className="self-start">
                    <Play className="size-4" />
                    Rozpocznij przygodę
                  </Button>
                  {startError && <p className="text-sm text-[#8f1d1d]">{startError}</p>}
                </div>
              ) : (
                <p className="text-sm italic text-[#7c6a45]">
                  Czekamy, aż prowadzący rozpocznie przygodę…
                </p>
              )}
            </CardContent>
          </Card>
          {!member && (
            <div className="mt-4">
              <JoinCard
                myCharacters={myCharacters}
                joinCharacterId={joinCharacterId}
                onCharacterChange={setJoinCharacterId}
                onJoin={onJoin}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          {showGuide && (
            <div className="rounded-sm border border-[#c8b184] bg-[#fbf3dd]/60 px-3 py-2 text-xs text-[#3a2c17]">
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-[11px] uppercase tracking-[0.14em] text-[#a97e1f]">
                  Jak grać
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 font-display text-[10px] uppercase tracking-[0.1em] text-[#7c6a45]"
                  onClick={() => {
                    localStorage.setItem("domino-guide", "1");
                    setShowGuide(false);
                  }}
                >
                  Zamknij
                </Button>
              </div>
              <ul className="mt-1 flex list-inside list-disc flex-col gap-0.5">
                <li>Opisz w czacie, co robi twoja postać — DM poprowadzi akcję zgodnie z zasadami SRD.</li>
                <li>Kliknij zaklęcie, umiejętność lub sugerowaną akcję, aby wypełnić pole wiadomości.</li>
                <li>Rzuty kości i ich wyniki pojawiają się w czacie na żywo.</li>
              </ul>
            </div>
          )}
          <Card className="border-[#b99f6b]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Czat z DM</CardTitle>
              <CardDescription className="not-italic">Opisz, co robi twoja postać.</CardDescription>
            </CardHeader>
            <CardContent>
              <TooltipProvider delayDuration={250}>
                <div className="scroll-parchment scroll-pretty flex max-h-[55vh] min-h-[300px] flex-col gap-3 overflow-y-auto pr-1">
                  {timeline.length === 0 && (
                    <p className="text-sm text-[#7c6a45]">
                      Przygoda jeszcze się nie zaczęła. Napisz coś do DM-a.
                    </p>
                  )}
                  {timeline.map((item, i) => {
                    if (item.kind === "message") {
                      const { message } = item;
                      const speakerPortrait = partyChars.find(
                        (p) => p.name === message.senderName,
                      )?.portraitUrl;
                      return (
                        <div
                          key={message.id}
                          className={`flex max-w-[85%] items-end gap-1.5 ${
                            message.role === "dm" ? "self-start" : "self-end"
                          }`}
                          style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
                        >
                          {message.role === "dm" && (
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#a97e1f]/60 bg-[#241708] text-[10px] text-[#e5cfa0]">
                              <Dices className="size-3.5" />
                            </div>
                          )}
                          {message.role !== "dm" && speakerPortrait && (
                            <img
                              src={speakerPortrait}
                              alt={message.senderName}
                              className="h-7 w-7 shrink-0 rounded-full border border-[#a97e1f]/60 object-cover object-top"
                            />
                          )}
                          <div
                            className={`animate-fade-up px-3.5 py-2.5 text-[15px] leading-relaxed shadow-[0_2px_6px_-3px_rgba(60,40,10,0.4)] ${
                              message.role === "dm"
                                ? "rounded-r-md rounded-tl-sm border border-[#c8b184] border-l-2 border-l-[#a97e1f] bg-[#efe2c4] text-[#2e2113]"
                                : "rounded-l-md rounded-tr-sm border border-[#4a3417] bg-[#2e2113] text-[#f6ead0]"
                            }`}
                          >
                            <div
                              className={`mb-1 font-display text-[10px] uppercase tracking-[0.18em] ${
                                message.role === "dm" ? "text-[#8a5a20]" : "text-[#c9b183]"
                              }`}
                            >
                              {message.senderName}
                            </div>
                            <div className="whitespace-pre-wrap">
                              <RichMessageText text={message.content} spellRegistry={spellRegistry} />
                            </div>
                          </div>
                        </div>
                      );
                    }
                    const { roll } = item;
                    if (roll.kind === "image" && roll.url) {
                      return (
                        <div
                          key={roll.id}
                          className="self-start flex max-w-[85%] flex-col gap-1.5 rounded-sm border border-[#a97e1f]/50 bg-[#efe2c4] p-2"
                        >
                          <img
                            src={roll.url}
                            alt={roll.label}
                            loading="lazy"
                            className="max-h-64 w-full rounded-sm border border-[#b99f6b] object-cover shadow-[0_4px_12px_-4px_rgba(60,40,10,0.4)]"
                          />
                          <div className="flex items-center gap-1.5 text-xs text-[#7c6a45]">
                            <ImageIcon className="size-3.5 shrink-0 text-[#7a4b1d]" />
                            <span className="font-display tracking-[0.06em] text-[#7a4b1d]">{roll.label}</span>
                            {roll.detail && <span>{roll.detail}</span>}
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div
                        key={roll.id}
                        className={`self-start flex max-w-[85%] flex-col gap-1 rounded-sm border border-[#a97e1f]/50 bg-[#efe2c4] px-2.5 py-1.5 text-xs ${
                          roll.animated ? "animate-dice-roll" : ""
                        }`}
                      >
                        {roll.dice && roll.dice.length > 0 && (
                          <DiceRollDisplay dice={roll.dice} bonus={roll.bonus ?? 0} total={roll.total} />
                        )}
                        {roll.damageDice && roll.damageDice.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            <DiceRollDisplay
                              dice={roll.damageDice}
                              bonus={roll.damageBonus ?? 0}
                              total={roll.damageTotal}
                            />
                            <span className="font-display text-[9px] uppercase tracking-[0.1em] text-[#a08b5c]">
                              obrażenia
                            </span>
                          </div>
                        )}
                        <span className="flex items-center gap-1.5">
                          <Dices
                            className={`size-3.5 shrink-0 text-[#7a4b1d] ${
                              roll.animated ? "animate-dice-spin" : ""
                            }`}
                          />
                          <span className="font-display tracking-[0.06em] text-[#7a4b1d]">{roll.label}</span>
                          {roll.detail && <span className="text-[#2e2113]">{roll.detail}</span>}
                        </span>
                      </div>
                    );
                  })}
                  {sending && (
                    <div className="animate-fade-up self-start flex items-center gap-2.5 rounded-md rounded-tl-sm border border-[#c8b184] border-l-2 border-l-[#a97e1f] bg-[#efe2c4] px-3.5 py-2.5">
                      <span className="flex items-center gap-1">
                        <span className="thinking-dot size-1.5 rounded-full bg-[#8a5a20]" />
                        <span className="thinking-dot size-1.5 rounded-full bg-[#8a5a20]" />
                        <span className="thinking-dot size-1.5 rounded-full bg-[#8a5a20]" />
                      </span>
                      <span className="font-display text-[10px] uppercase tracking-[0.18em] text-[#8a5a20]">
                        DM myśli…
                      </span>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>
              </TooltipProvider>
              {member && spellbook && spellbook.spells.length > 0 && (
                <div className="mt-3 rounded-sm border border-[#c8b184]/70 bg-[#fbf3dd]/40 p-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <div className="font-display text-[10px] uppercase tracking-[0.14em] text-[#7c6a45]">
                        Księga zaklęć
                      </div>
                      <TooltipProvider delayDuration={250}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex">
                              <button
                                type="button"
                                aria-label="Polskie nazwy zaklęć"
                                aria-pressed={spellPl}
                                onClick={() => {
                                  const next = !spellPl;
                                  setSpellNamesPl(next);
                                  setSpellPl(next);
                                }}
                                className={`h-7 min-w-7 shrink-0 rounded-sm border px-1.5 font-display text-[9px] uppercase tracking-[0.1em] transition-colors ${
                                  spellPl
                                    ? "border-[#a97e1f] bg-[#e8d3a0]/60 text-[#5c4018]"
                                    : "border-[#c8b184] bg-[#fbf3dd]/60 text-[#7c6a45] hover:bg-[#e8d3a0]/40"
                                }`}
                              >
                                PL/EN
                              </button>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <span className="text-[11px] text-[#f6ead0]">
                              {spellPl
                                ? "Polskie nazwy zaklęć włączone"
                                : "Pokaż polskie nazwy zaklęć"}
                            </span>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
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
                                        aria-label={`Rzucam zaklęcie ${spellDisplayName(meta, spell)}`}
                                        onClick={() =>
                                          setInput(`Rzucam ${spellDisplayName(meta, spell)} na `)
                                        }
                                        className={`group flex w-full items-center justify-between gap-2 rounded-sm border px-2.5 py-1.5 text-left transition-colors ${
                                          unavailable
                                            ? "cursor-not-allowed border-[#c8b184]/40 bg-[#fbf3dd]/20 opacity-50"
                                            : "border-[#c8b184] bg-[#fbf3dd]/70 hover:border-[#a97e1f] hover:bg-[#f0e2bd]"
                                        } focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#a97e1f]`}
                                      >
                                        <span className="flex min-w-0 items-baseline gap-1.5">
                                          <span className="truncate font-display text-xs tracking-[0.06em] text-[#2e2113]">
                                            {spellDisplayName(meta, spell)}
                                          </span>
                                          {meta && (
                                            <span className="truncate text-[10px] text-[#7c6a45]">
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
                                            {spellDisplayName(meta, meta.name)}
                                          </span>
                                          <span className="text-[9px] uppercase tracking-[0.12em] text-[#c9b183]">
                                            {meta.school}
                                            {meta.level === 0 ? " · cantrip" : ` · poziom ${meta.level}`}
                                          </span>
                                        </div>
                                        {meta.description && (
                                          <div className="text-[11px] leading-relaxed text-[#f6ead0]">
                                            {meta.description}
                                          </div>
                                        )}
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
                  <TooltipProvider delayDuration={250}>
                    {legalActions.map((action) => (
                      <Tooltip key={action.key}>
                        <TooltipTrigger asChild>
                          <span className="inline-flex">
                            <button
                              type="button"
                              disabled={!member}
                              aria-label={`Wypełnij akcję: ${action.label}`}
                              onClick={() => setInput(ACTION_PROMPTS[action.key] ?? action.label)}
                              className="rounded-sm border border-[#c8b184] bg-[#fbf3dd]/60 px-2 py-1 font-display text-xs tracking-[0.06em] text-[#3a2c17] hover:bg-[#f0e2bd] disabled:pointer-events-none disabled:opacity-50"
                            >
                              {action.label}
                            </button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="flex flex-col gap-1">
                            <span className="font-display text-xs tracking-[0.08em] text-[#e8c56a]">
                              {action.label}
                            </span>
                            <span className="text-[11px] leading-relaxed text-[#f6ead0]">
                              {action.description}
                            </span>
                            {!action.legal && action.reason && (
                              <span className="text-[10px] italic text-[#e8a08a]">
                                Powód: {action.reason}
                              </span>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </TooltipProvider>
                </div>
              )}
              <form
                onSubmit={onSend}
                className="mt-3 flex flex-wrap items-end gap-2 pb-[env(safe-area-inset-bottom)]"
              >
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    !member
                      ? "Najpierw dołącz postacią…"
                      : chatBlocked
                        ? `Czekaj na swoją turę${currentCombatant ? ` (teraz: ${currentCombatant.name})` : ""}…`
                        : "Twoja tura, awanturniku…"
                  }
                  className="min-h-[60px] min-w-0 flex-1"
                  disabled={!member || sending || chatBlocked}
                />
                <Button
                  type="submit"
                  disabled={!member || sending || chatBlocked}
                  className="h-10 shrink-0"
                >
                  <Send className="size-4" />
                  Wyślij
                </Button>
              </form>
              {error && <p className="mt-2 text-sm text-[#8f1d1d]">{error}</p>}
            </CardContent>
          </Card>

          {!member && (
            <JoinCard
              myCharacters={myCharacters}
              joinCharacterId={joinCharacterId}
              onCharacterChange={setJoinCharacterId}
              onJoin={onJoin}
            />
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
              <CardTitle className="text-base">Twoje notatki</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                value={myNotes}
                onChange={(e) => setMyNotes(e.target.value)}
                onBlur={() => {
                  if (myNotes !== myNotesSaved) {
                    campaignApi.saveNotes(id, myNotes).then(() => setMyNotesSaved(myNotes)).catch(() => {});
                  }
                }}
                placeholder="Prywatne notatki do przygody — nikt inny ich nie widzi, bez spoilerów…"
                className="min-h-[96px] w-full resize-y rounded-sm border border-[#b99f6b] bg-[#fbf3dd]/60 px-2 py-1.5 text-sm text-[#2e2113] outline-none focus:border-[#a97e1f]"
              />
              <p className="mt-1 text-[10px] italic text-[#a08b5c]">
                Widoczne tylko dla Ciebie — notatki DM nie są pokazywane nikomu.
              </p>
            </CardContent>
          </Card>

          <Card className="border-[#b99f6b]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="size-4 text-[#a97e1f]" />
                Drużyna
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="ml-auto h-7 px-2 font-display text-[10px] uppercase tracking-[0.1em] text-[#7c6a45]"
                  onClick={() => setMerchantOpen(true)}
                  disabled={!member?.characterId}
                  title={member?.characterId ? undefined : "Przypisz postać do kampanii, aby korzystać z kramu"}
                >
                  <Coins className="size-3.5" />
                  Kupiec
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              {detail && <PartyRows detail={detail} partyChars={partyChars} />}
            </CardContent>
          </Card>

          <Card className="border-[#b99f6b]">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Map className="size-4 text-[#a97e1f]" />
                Świat kampanii
                <Badge variant="secondary" className="ml-auto">
                  {detail?.state.phase ?? "…"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <div className="flex items-baseline gap-2">
                <span className="font-display text-[10px] uppercase tracking-[0.14em] text-[#7c6a45]">
                  Lokacja
                </span>
                <span className="font-display tracking-[0.04em] text-[#2e2113]">
                  {detail?.state.location || "—"}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-display text-[10px] uppercase tracking-[0.14em] text-[#7c6a45]">
                  Scena
                </span>
                <p className="text-sm leading-relaxed text-[#2e2113]">
                  {detail?.state.scene || "…"}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-display text-[10px] uppercase tracking-[0.14em] text-[#7c6a45]">
                  Postęp świata
                </span>
                {detail && detail.state.worldProgress.length > 0 ? (
                  <ol className="flex flex-col gap-1 border-l border-[#c8b184] pl-2.5">
                    {detail.state.worldProgress.map((entry, i) => (
                      <li
                        key={i}
                        className="flex items-baseline gap-1.5 text-xs leading-relaxed text-[#2e2113]"
                      >
                        <span className="text-[10px] text-[#a97e1f]">✦</span>
                        <span>{entry}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-xs italic text-[#7c6a45]">Kampania dopiero się zaczyna.</p>
                )}
              </div>
              {detail?.state.notes && (
                <div className="flex flex-col gap-1">
                  {/* Notatki DM ukryte — spoilery */}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-[#b99f6b]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Twoja tura</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-[#7c6a45]">Faza:</span>
                <Badge variant="secondary">{detail?.state.phase ?? "…"}</Badge>
              </div>
              {suggestion?.turnOf ? (
                <p>
                  To tura <strong className="font-display tracking-[0.06em] text-[#7a4b1d]">{suggestion.turnOf.name}</strong>
                  {detail?.state.combat.active && (
                    <span className="text-[#7c6a45]">
                      {" "}· runda {detail.state.combat.round}
                    </span>
                  )}
                  .
                </p>
              ) : (
                <p className="text-[#7c6a45]">Brak aktywnej tury.</p>
              )}
              <div className="mt-1 flex flex-col gap-1">
                {suggestion?.availableActions.length === 0 && (
                  <p className="text-xs text-[#7c6a45]">Czekaj na swoją turę…</p>
                )}
                {suggestion?.availableActions.map((action) => (
                  <div
                    key={action.key}
                    className="flex items-center justify-between gap-2 rounded-sm border border-[#c8b184] bg-[#fbf3dd]/60 px-2 py-1.5 text-xs"
                  >
                    <span>
                      <span className="font-display tracking-[0.06em] text-[#3a2c17]">{action.label}</span>
                      <span className="text-[#7c6a45]"> · {action.description}</span>
                    </span>
                    {action.legal ? (
                      <Badge>dostępna</Badge>
                    ) : (
                      <Badge variant="outline">{action.reason ?? "niedostępna"}</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      )}

      {pendingLevelUp && (
        <LevelUpDialog
          open={subclassDialogOpen}
          onClose={() => setSubclassDialogOpen(false)}
          characterId={pendingLevelUp.characterId}
          level={pendingLevelUp.level}
          className={pendingLevelUp.className}
          catalog={featuresCatalog}
          onDone={() => {
            refreshSpellbook();
            load();
          }}
        />
      )}

      <CharacterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        characterId={drawerCharacterId}
      />

      {merchantOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#2e2113]/60 p-4"
          onClick={() => setMerchantOpen(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-sm border border-[#b99f6b] bg-[#fbf3dd] p-4 shadow-[0_20px_60px_-20px_rgba(20,10,0,0.8)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-lg tracking-[0.08em] text-[#3a2c17]">
                <Coins className="size-4 text-[#a97e1f]" /> Kram
              </h3>
              <Button type="button" variant="ghost" size="sm" onClick={() => setMerchantOpen(false)}>
                ✕
              </Button>
            </div>
            {member?.characterId ? (
              <MerchantPanel characterId={member.characterId} onCharacterChanged={load} />
            ) : (
              <p className="text-sm italic text-[#7c6a45]">
                Przypisz swoją postać do tej kampanii, aby odwiedzić kram.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function JoinCard({
  myCharacters,
  joinCharacterId,
  onCharacterChange,
  onJoin,
}: {
  myCharacters: { id: string; name: string }[];
  joinCharacterId: string;
  onCharacterChange: (id: string) => void;
  onJoin: (e: FormEvent) => void;
}) {
  return (
    <Card className="border-[#b99f6b]">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Dołącz do kampanii</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onJoin} className="flex flex-wrap items-center gap-2">
          <Select value={joinCharacterId} onChange={(e) => onCharacterChange(e.target.value)}>
            <option value="">Wybierz postać…</option>
            {myCharacters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Button
            type="submit"
            disabled={!joinCharacterId}
            aria-label="Dołącz do kampanii"
            className="shrink-0"
          >
            Dołącz
          </Button>
        </form>
        {myCharacters.length === 0 && (
          <p className="mt-2 text-sm text-[#7c6a45]">
            Najpierw potrzebujesz postaci —{" "}
            <Link
              to="/app/characters"
              className="font-display text-[11px] uppercase tracking-[0.1em] text-[#7a4b1d] underline-offset-4 hover:underline"
            >
              utwórz ją
            </Link>
            .
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function PartyRows({ detail, partyChars }: { detail: CampaignDetail; partyChars: PartyChar[] }) {
  if (detail.members.length === 0) {
    return <p className="text-[#7c6a45]">Brak awanturników.</p>;
  }
  return (
    <>
      {detail.members.map((m) => {
        const partyChar = partyChars.find((p) => p.characterId === m.characterId);
        const combatant = detail.state.combat.active
          ? detail.state.combat.combatants.find((c) => c.characterId === m.characterId)
          : undefined;
        const hp = combatant ? combatant.currentHp : partyChar?.currentHp;
        const maxHp = combatant ? combatant.maxHp : partyChar?.maxHp;
        return (
          <div
            key={m.characterId}
            className="flex items-center justify-between gap-2 border-b border-dotted border-[#c8b184] pb-1"
          >
            <span className="min-w-0 truncate">
              <span className="mr-1 text-[10px] text-[#a97e1f]">✦</span>
              {m.characterName ?? m.characterId}
            </span>
            {partyChar ? (
              <span className="flex shrink-0 items-center gap-2">
                <span className="h-1.5 w-14 overflow-hidden rounded-full bg-[#dcc89a]">
                  <span
                    className={`block h-full rounded-full ${hp === 0 ? "bg-[#8f1d1d]" : "bg-[#7a4b1d]"}`}
                    style={{
                      width: `${Math.max(0, Math.min(100, ((hp ?? 0) / Math.max(maxHp ?? 1, 1)) * 100))}%`,
                    }}
                  />
                </span>
                <span
                  className={`font-display text-[10px] tracking-wide ${
                    hp === 0 ? "text-[#8f1d1d]" : "text-[#7c6a45]"
                  }`}
                >
                  {hp}/{maxHp}
                </span>
                <Badge variant="outline">poz. {partyChar.level}</Badge>
              </span>
            ) : (
              <Badge variant="outline">dołączył</Badge>
            )}
          </div>
        );
      })}
    </>
  );
}
