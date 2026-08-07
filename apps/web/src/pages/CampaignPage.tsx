import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { Send, Users } from "lucide-react";
import {
  campaignApi,
  characterApi,
  type CampaignDetail,
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
import { CombatPanel } from "../components/CombatPanel";
import { subscribeCampaign } from "../lib/stream";

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
      },
      onState: (state) => {
        setDetail((prev) => (prev ? { ...prev, state } : prev));
        campaignApi
          .dmSuggestion(id)
          .then(({ suggestion }) => setSuggestion(suggestion))
          .catch(() => {});
      },
      onChatMessage: (message) =>
        setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message])),
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

  const member = detail?.members.find((m) => m.userId === user?.id);

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
                    {m.characterId}
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
