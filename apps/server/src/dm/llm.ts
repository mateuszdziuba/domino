import { DM_TOOLS, type DmContext, type DmReply, type DmToolName } from "./types.js";
import { runDmTool } from "./tools.js";

export type DmProvider = "deepseek" | "groq" | "ollama" | "openrouter";

type ProviderConfig = {
  baseUrl: string;
  apiKeyEnv: string | null;
  defaultModel: string;
};

const PROVIDER_CONFIG: Record<DmProvider, ProviderConfig> = {
  deepseek: {
    baseUrl: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
    apiKeyEnv: "DEEPSEEK_API_KEY",
    defaultModel: "deepseek-v4-flash",
  },
  groq: {
    baseUrl: "https://api.groq.com/openai/v1",
    apiKeyEnv: "GROQ_API_KEY",
    defaultModel: "llama-3.3-70b-versatile",
  },
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1",
    apiKeyEnv: null,
    defaultModel: "qwen3:8b",
  },
  openrouter: {
    baseUrl: "https://openrouter.ai/api/v1",
    apiKeyEnv: "OPENROUTER_API_KEY",
    defaultModel: "deepseek/deepseek-v4-flash:free",
  },
};

export function dmProvider(): DmProvider {
  const provider = (process.env.DM_PROVIDER ?? "deepseek").toLowerCase();
  return provider in PROVIDER_CONFIG ? (provider as DmProvider) : "deepseek";
}

export function providerConfig(): ProviderConfig {
  return PROVIDER_CONFIG[dmProvider()];
}

export function isDmConfigured(): boolean {
  const config = providerConfig();
  if (config.apiKeyEnv === null) return true; // local providers (ollama) need no key
  return Boolean(process.env[config.apiKeyEnv]);
}

const MAX_TOOL_ROUNDS = 8;
const COMPACT_CHARS = 12_000;
const KEEP_RECENT = 8;
const MAX_TOOL_RESULT_CHARS = 4_000;

// In-memory rolling summary per campaign (key: first message id of the
// "recent" window the summary covers). Survives a campaign's lifetime; on
// server restart it is simply recomputed when the threshold is crossed again.
const summaryCache = new Map<string, { summary: string; firstId: string }>();

function contentLength(messages: DmContext["recentMessages"]): number {
  return messages.reduce((sum, m) => sum + m.content.length, 0);
}

async function summarizeHistory(
  baseUrl: string,
  model: string,
  apiKey: string | undefined,
  messages: DmContext["recentMessages"],
): Promise<string> {
  const transcript = messages
    .map((m) => `${m.role === "dm" ? "DM" : m.senderName}: ${m.content}`)
    .join("\n");
  try {
    const response = await callLlm(baseUrl, model, apiKey, [
      {
        role: "system",
        content:
          "You are a campaign chronicler. Summarize the D&D session history below in Polish (plain text, no markup). Keep it compact but complete: location and scene, key NPCs and names, current quest and plot threads, loot and gold gained, injuries/HP state, spells cast, and anything unresolved the players must still decide. Max 600 words.",
      },
      { role: "user", content: transcript.slice(0, 24_000) },
    ]);
    return (response.content ?? "(brak streszczenia)").slice(0, 6_000);
  } catch {
    return "(brak streszczenia — historia starsza niż okno kontekstu)";
  }
}

type ApiMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: {
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }[];
};

const SYSTEM_PROMPT = `You are the Dungeon Master of a D&D 5.2.1 game (SRD rules).

A "[Streszczenie wcześniejszych wydarzeń kampanii]" marker may appear in the history — treat it as canonical memory of earlier events and do NOT repeat them; continue the story naturally from it.

NARRATE IN POLISH (pl-PL). The players are Polish — all narration, questions, and descriptions must be written in Polish, vividly and naturally. Spell names and mechanical terms may stay in English.

Never use Markdown or any markup: no asterisks (** or *), no backticks, no # headings, no bullet symbols. Write plain text only.

PLAYER AGENCY — ABSOLUTE RULE: You NEVER decide what a player character does. Never move them, never make them speak, never make them buy, leave, attack, or take any action on their behalf. A player describes their own actions ("idę do karczmy" is THEIR decision, not yours). When the players' intent is unclear or they have not decided, STOP and ask them directly what they want to do ("Co robisz?"), or end your narration with an open question. You may narrate the world, NPCs, and consequences of player decisions — never the decisions themselves. If a player's message is ambiguous, ask for clarification instead of assuming.

The rules engine is authoritative: you must never invent or override rules, HP, AC,
initiative, or campaign state. Use the provided tools to read game state and rules
before adjudicating, and to update world state after adjudication. Narrate vividly
in the language the players use, resolve actions through the tools, keep the story
moving, and hand agency back to the players. When combat is active, respect the
initiative order: describe whose turn it is and what they can do.

Only you decide when combat begins. When the story calls for it (the party walks
into an ambush, picks a fight, or danger rears its head), call generate_encounter
with a short description of the threat — the engine picks the monsters from the
SRD catalog, never make them up. Never ask the players to start encounters or
add enemies; they only describe what their characters do.

When combat is active you run the fight through the rules engine: resolve attacks
with attack_combatant (the attacker must be the current combatant — the engine
enforces this), roll death saves with resolve_death_save for combatants at 0 HP,
advance the initiative with advance_turn once a combatant's actions are done, and
end combat with end_combat when it concludes. Never invent dice rolls, damage, or
HP changes — the tools return authoritative results and you narrate those results
dramatically. When a player declares an attack or combat action on their turn,
resolve it with the tools instead of describing a vague outcome. When a player
declares an attack, call attack_combatant with the player's combatant id (which
starts with "char-") as the attacker. When the party is safe and wants to
recover, call take_long_rest so every character regains full HP per the
long-rest rules. When a player declares a spell, resolve it with cast_spell
(character id, exact spell name from the tool list, and the target combatant id
in combat or character id outside combat) instead of inventing the outcome. XP for defeated enemies is awarded automatically when combat ends; use award_xp for quest rewards, never for combat.

NEVER reveal a creature's numeric hit points (current HP or HP totals). Describe the enemy's condition in words instead: e.g. 'ranny', 'ciężko ranny', 'ledwo trzyma się na nogach', 'dopiero co zraniony'. Player characters' own HP may be described normally.

When the players begin a new adventure, PREFER start_adventure with one of the built-in free 5e adventures from the library (the tool lists the titles). Only use create_adventure when the players describe a premise the library does not cover. Never invent or contradict adventure details — the library entry is authoritative once started.

Characters have racial, class, and subclass features defined by the SRD — read them via get_character (the response includes \`features\`) and respect them when adjudicating (e.g. Sneak Attack needs advantage, Second Wind heals, Rage grants resistance). Never invent features that are not on the sheet.

Award experience with award_xp when the party completes quests, milestones, or an adventure — roughly 50–200 XP per milestone (your judgment). Combat XP is automatic; never use award_xp for combat.

Combatants can have SRD conditions (blinded, frightened, poisoned, prone, restrained, paralyzed, petrified, stunned, unconscious, incapacitated). Apply and remove them with apply_condition / remove_condition when effects call for them; the engine derives the mechanical consequences. Never apply a condition that is not in the list.

When the party takes a short rest (about an hour) to recover, use take_short_rest so they can spend Hit Dice to heal; long rests restore full HP, spell slots, and half of their Hit Dice.

When a player sells, trades, or gives away an item during roleplay, remove it from their inventory with remove_inventory_item (exact item name; add gold with the same call when a sale gives coin — typically half the item's price). Announce the removal in your narration.

When the party earns treasure — loot, payment, or rewards — grant it with grant_loot (gold and/or items), and ALWAYS announce the exact additions to the players: name the character who received the items, list each item (name and quantity), state the gold amount, and explicitly say the items were added to the inventory ("X został dodany do ekwipunku"). Spells that apply or remove conditions, heal the party, or revive the fallen are resolved automatically by the engine; narrate their effects.

For unique narrative treasures, artifacts, or quest items that do NOT exist in the SRD catalog, use create_custom_item instead of grant_loot: you set a sensible price in gold (0 gp for priceless plot items, up to 5000 gp for powerful artifacts) and a short description. Custom items are stored scoped to the current campaign only — they never appear in any other campaign and cannot be bought in shops; they are added directly to the named character's inventory. Use them sparingly, only when the item has real narrative meaning.

Monsters with Multiattack may make several attacks on their turn — get_campaign_state shows each combatant's \`attacks\` count; when an enemy's turn comes, resolve up to that many attacks (attack_combatant, chaining as allowed during enemy turns). Also keep the campaign's scene and world progress vivid: update_world_state when the world visibly changes (new locations, resolved plot beats, discoveries).

Characters can suffer exhaustion (6 levels, SRD): set it with set_exhaustion when hazards, starvation, or death-saving situations call for it; long rests reduce it by one level. Higher-level spells (Spirit Guardians, Guardian of Faith, Banishment, Greater Restoration) are resolved automatically by the engine — narrate their effects.

Attacks use the character's equipped weapon (damage dice, properties, and attack bonus come from the sheet — see get_character). When a player declares an attack, resolve it with the weapon they carry; do not invent damage dice.

Concentration: when a caster with an active concentration spell takes damage, the engine rolls the Concentration save automatically — narrate whether the spell holds or shatters. Use stop_concentration when a caster deliberately ends it. Inspiration: grant it with set_inspiration for outstanding roleplay; when a player spends it ('używam inspiracji'), resolve their next attack with useInspiration so the engine applies advantage and clears it.

Characters may take feats or Ability Score Improvements at levels 4, 8, 12, 16 and 19 — players choose them in the development dialog; respect their chosen feats when adjudicating (they appear in the sheet features). Martials with Extra Attack may attack multiple times per turn (chain attack_combatant during their turn).

Resolve player skill checks with skill_check (choose a sensible DC: 10 easy, 15 moderate, 20 hard) and narrate the outcome — never decide success yourself. Players drink healing potions via use_item; narrate the healing.

Use generate_image for key campaign moments — dramatic scenes, discoveries, and the aftermath of battles (one image per moment, keep prompts vivid and short). Use generate_portrait when a character portrait is requested or when a new character joins the party. The images appear in the chat automatically.

During combat, the engine blocks chat messages from players who are not on the current turn — only the active player and the DM can send. Call on each player by name when their turn comes, resolve their declared action, and advance the turn (advance_turn) so the next player can speak; never skip a player silently.

For fights that need spatial clarity, call set_battlefield (e.g. 12×8) to lay out the battlefield, then move combatants with move_combatant x/y coordinates (each cell is 5 ft; melee needs reach, ranged weapons have ranges). Narrate positions as squares.

Cadence rules — follow them strictly:
- Address a player by name ONLY when it is their turn ("Elaro, to twoja tura — co robisz?"). During enemy or NPC turns, never call on players and never ask them for input — narrate what the enemies do instead.
- On a player's turn, resolve their declared action with at most one tool call, narrate the outcome, then hand the turn back to them (remind them of their remaining options if useful).
- During enemy or NPC turns you MAY chain actions in a single reply: resolve the enemy's action (e.g. attack_combatant), call advance_turn, and if the next combatant is also an enemy or NPC, keep resolving and advancing — chain until the turn reaches a player character. Then STOP, narrate the situation, and call on that player by name.
- After starting an encounter, describe the scene and whose turn it is — then stop and wait for the players (unless the first turn belongs to an enemy, in which case you may run the enemy chain described above).
- Read tools (get_campaign_state, get_character, get_available_actions, request_dice_roll) count toward the tool limit too — prefer narrating from the context you already have.`;

export async function llmNarrate(
  context: DmContext,
  userMessage: string,
): Promise<DmReply> {
  const { campaignCharacters } = await import("./tools.js");
  const config = providerConfig();
  const apiKey = config.apiKeyEnv ? process.env[config.apiKeyEnv] : undefined;
  if (config.apiKeyEnv && !apiKey) {
    throw new Error(`${config.apiKeyEnv} is not set for provider ${dmProvider()}`);
  }
  const model = process.env.DM_MODEL ?? config.defaultModel;

  const roster = campaignCharacters(context.campaignId)
    .map((c) => `- ${c.name} (id: ${c.id}, ${c.race} ${c.className} poz. ${c.level}, HP ${c.currentHp}/${c.maxHp})`)
    .join("\n");
  const partyBlock = roster
    ? `\n\nDRUŻYNA — użyj tych ID do get_character:\n${roster}`
    : "";
  const recent = context.recentMessages.slice(-20);
  let historyMessages: ApiMessage[] = [];
  let activeSummary = "";

  // Builds (or reuses from cache) a campaign summary covering the given
  // messages and stores it in the per-campaign cache keyed by the first id
  // of the "recent" window it was produced for.
  async function getSummaryFor(older: DmContext["recentMessages"], firstId: string): Promise<string> {
    const cached = summaryCache.get(context.campaignId);
    if (cached && cached.firstId === firstId) return cached.summary;
    const summary = await summarizeHistory(config.baseUrl, model, apiKey, older);
    summaryCache.set(context.campaignId, { summary, firstId });
    return summary;
  }

  const longHistory = contentLength(recent) > COMPACT_CHARS;
  if (longHistory && recent.length > KEEP_RECENT) {
    const older = recent.slice(0, -KEEP_RECENT);
    const newer = recent.slice(-KEEP_RECENT);
    activeSummary = await getSummaryFor(older, newer[0]?.id ?? "");
    historyMessages = [
      {
        role: "user",
        content: `[Streszczenie wcześniejszych wydarzeń kampanii — traktuj jako kanon, nie powtarzaj tych wydarzeń w narracji]:\n${activeSummary}`,
      },
      ...newer.map((m): ApiMessage => ({
        role: m.role === "dm" ? "assistant" : "user",
        content: `${m.senderName}: ${m.content}`,
      })),
    ];
  } else {
    historyMessages = recent.map((m): ApiMessage => ({
      role: m.role === "dm" ? "assistant" : "user",
      content: `${m.senderName}: ${m.content}`,
    }));
  }

  const messages: ApiMessage[] = [
    { role: "system", content: SYSTEM_PROMPT + partyBlock },
    ...historyMessages,
    { role: "user", content: userMessage },
  ];

  async function callWithRetry(currentMessages: ApiMessage[]) {
    try {
      return await callLlm(config.baseUrl, model, apiKey, currentMessages);
    } catch (err) {
      console.error("[dm] LLM call failed, retrying with compacted context:", String(err).slice(0, 200));
      // Keep an accurate overview: summarize the whole available history
      // (minus the last 6 messages, which stay verbatim) instead of just
      // trimming the window blindly.
      const keepVerbatim = recent.slice(-6);
      const older = recent.slice(0, -6);
      let summary = activeSummary;
      if (!summary && older.length > 0) {
        summary = await getSummaryFor(older, keepVerbatim[0]?.id ?? "");
      }
      const slim: ApiMessage[] = [
        { role: "system", content: SYSTEM_PROMPT + partyBlock },
        ...(summary
          ? [
              {
                role: "user" as const,
                content: `[Streszczenie wcześniejszych wydarzeń kampanii — traktuj jako kanon]:\n${summary}`,
              },
            ]
          : []),
        ...keepVerbatim.map((m): ApiMessage => ({
          role: m.role === "dm" ? "assistant" : "user",
          content: `${m.senderName}: ${m.content}`.slice(0, 2_000),
        })),
        { role: "user", content: userMessage.slice(0, 2_000) },
      ];
      return await callLlm(config.baseUrl, model, apiKey, slim);
    }
  }

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await callWithRetry(messages);
    const toolCalls = response.tool_calls ?? [];

    if (toolCalls.length === 0) {
      const narration = stripMarkdown(response.content ?? "(no response)");
      return { narration, toolCalls: mapToolCalls(toolCalls) };
    }

    messages.push({
      role: "assistant",
      content: response.content ?? "",
      tool_calls: toolCalls,
    });

    for (const call of toolCalls) {
      let args: unknown;
      try {
        args = JSON.parse(call.function.arguments || "{}");
      } catch {
        args = {};
      }
      const result = await runDmTool(
        context.campaignId,
        "dm",
        call.function.name as DmToolName,
        args,
      );
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result).slice(0, MAX_TOOL_RESULT_CHARS),
      });
    }
  }

  // Tool loop exhausted: give the model one last chance WITHOUT tools and with
  // a clean, small context (no tool-call noise, no huge history) so the
  // session never ends on a silent failure.
  const fallbackMessages: ApiMessage[] = [
    { role: "system", content: SYSTEM_PROMPT + partyBlock },
    ...historyMessages.slice(-4).map((m) => ({
      role: m.role,
      content: m.content.slice(0, 2_000),
    })),
    { role: "user", content: userMessage.slice(0, 2_000) },
  ];
  try {
    const response = await callLlm(config.baseUrl, model, apiKey, fallbackMessages, false);
    if (response.content) {
      return {
        narration: stripMarkdown(response.content),
        toolCalls: [],
      };
    }
  } catch {
    // fall through to the canned reply
  }
  return {
    narration:
      "(DM) The story bends under the weight of too many machinations — the tools have been consulted, but the scene is still unfolding. Try asking again.",
  };
}

async function callLlm(
  baseUrl: string,
  model: string,
  apiKey: string | undefined,
  messages: ApiMessage[],
  withTools = true,
): Promise<{
  content: string | null;
  tool_calls: NonNullable<ApiMessage["tool_calls"]>;
}> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages,
      ...(withTools
        ? {
            tools: DM_TOOLS.map((t) => ({
              type: "function",
              function: {
                name: t.name,
                description: t.description,
                parameters: {
                  type: "object",
                  properties: t.parameters,
                },
              },
            })),
          }
        : {}),
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`LLM API error ${response.status}: ${body.slice(0, 500)}`);
  }

  const json = (await response.json()) as {
    choices?: { message?: ApiMessage }[];
  };
  const message = json.choices?.[0]?.message;
  return {
    content: message?.content ?? null,
    tool_calls: message?.tool_calls ?? [],
  };
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .trim();
}

function mapToolCalls(toolCalls: NonNullable<ApiMessage["tool_calls"]>) {
  return toolCalls.map((t) => ({
    name: t.function.name as DmToolName,
    arguments: JSON.parse(t.function.arguments || "{}") as Record<string, unknown>,
  }));
}
