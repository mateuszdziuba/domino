import type { CampaignState, ChatMessage, GameEventType, ServerStreamEvent } from "@domino/shared";

export type CampaignStreamHandlers = {
  onConnected: () => void;
  onState: (state: CampaignState) => void;
  onChatMessage: (message: ChatMessage) => void;
  onEvent: (type: GameEventType) => void;
  onOffline: () => void;
};

export function subscribeCampaign(
  campaignId: string,
  handlers: CampaignStreamHandlers,
): () => void {
  const source = new EventSource(`/api/campaigns/${campaignId}/stream`);

  source.addEventListener("connected", () => handlers.onConnected());

  source.addEventListener("state.updated", (event) => {
    try {
      const data = JSON.parse((event as MessageEvent).data) as ServerStreamEvent;
      const payload = data.payload as { state: CampaignState };
      handlers.onState(payload.state);
    } catch {
      // ignore malformed stream data
    }
  });

  source.addEventListener("chat.message", (event) => {
    try {
      const data = JSON.parse((event as MessageEvent).data) as ServerStreamEvent;
      const payload = data.payload as { message: ChatMessage };
      handlers.onChatMessage(payload.message);
    } catch {
      // ignore malformed stream data
    }
  });

  source.addEventListener("character.joined", () => handlers.onEvent("character.joined"));

  source.addEventListener("error", () => handlers.onOffline());

  return () => source.close();
}
