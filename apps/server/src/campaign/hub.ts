import type { ServerStreamEvent } from "@domino/shared";

type Listener = (event: ServerStreamEvent) => void;

const listeners = new Map<string, Set<Listener>>();

export function subscribe(campaignId: string, listener: Listener): () => void {
  const set = listeners.get(campaignId) ?? new Set<Listener>();
  set.add(listener);
  listeners.set(campaignId, set);
  let unsubscribed = false;
  return () => {
    if (unsubscribed) return;
    unsubscribed = true;
    set.delete(listener);
    if (set.size === 0) listeners.delete(campaignId);
  };
}

export function broadcast(campaignId: string, event: ServerStreamEvent): void {
  const set = listeners.get(campaignId);
  if (!set) return;
  for (const listener of [...set]) {
    try {
      listener(event);
    } catch {
      // keep serving remaining listeners
    }
  }
}
