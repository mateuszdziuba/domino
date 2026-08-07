import { describe, expect, it } from "vitest";
import { broadcast, subscribe } from "./hub.js";
import type { ServerStreamEvent } from "@domino/shared";

function event(campaignId: string, type: ServerStreamEvent["type"] = "state.updated"): ServerStreamEvent {
  return { type, campaignId, payload: { state: {} } };
}

describe("hub", () => {
  it("delivers a broadcast to a subscriber for its campaign", () => {
    const received: ServerStreamEvent[] = [];
    subscribe("c1", (e) => received.push(e));
    const sent = event("c1");
    broadcast("c1", sent);
    expect(received).toEqual([sent]);
  });

  it("does not deliver to listeners of other campaigns", () => {
    const received: ServerStreamEvent[] = [];
    subscribe("c1", (e) => received.push(e));
    broadcast("c2", event("c2"));
    expect(received).toEqual([]);
  });

  it("stops delivery after unsubscribe and tolerates double unsubscribe", () => {
    const received: ServerStreamEvent[] = [];
    const unsub = subscribe("c1", (e) => received.push(e));
    unsub();
    unsub();
    broadcast("c1", event("c1"));
    expect(received).toEqual([]);
  });

  it("a throwing listener does not break other listeners or the caller", () => {
    const received: ServerStreamEvent[] = [];
    subscribe("c1", () => {
      throw new Error("boom");
    });
    subscribe("c1", (e) => received.push(e));
    expect(() => broadcast("c1", event("c1"))).not.toThrow();
    expect(received).toHaveLength(1);
  });
});
