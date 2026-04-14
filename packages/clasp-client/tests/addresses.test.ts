import { describe, it, expect } from "vitest";
import { addresses } from "../src/addresses.js";

describe("addresses", () => {
  it("builds participant paths under /studio/{id}/participants/{pid}", () => {
    expect(addresses.participant("workshop", "moheeb")).toBe(
      "/studio/workshop/participants/moheeb",
    );
  });

  it("signal paths are symmetric: writer sets signal/{to}/{from}, reader subscribes to signal/{me}/**", () => {
    expect(addresses.signal("s", "alice", "bob")).toBe(
      "/studio/s/signal/alice/bob",
    );
    expect(addresses.signalInbox("s", "alice")).toBe("/studio/s/signal/alice/**");
  });

  it("broadcastOut distinguishes offer, answer, and per-side ICE", () => {
    expect(addresses.broadcastOut("s", "demo")).toBe(
      "/studio/s/broadcast/out/demo/offer",
    );
    expect(addresses.broadcastOutAnswer("s", "demo")).toBe(
      "/studio/s/broadcast/out/demo/answer",
    );
    expect(addresses.broadcastOutIce("s", "demo", "host")).toBe(
      "/studio/s/broadcast/out/demo/ice/host",
    );
    expect(addresses.broadcastOutIce("s", "demo", "receiver")).toBe(
      "/studio/s/broadcast/out/demo/ice/receiver",
    );
  });

  it("overlay ids map to distinct paths", () => {
    expect(addresses.overlay("s", "logo")).toBe("/studio/s/overlays/logo");
    expect(addresses.overlay("s", "lower")).toBe("/studio/s/overlays/lower");
    expect(addresses.overlay("s", "ticker")).toBe("/studio/s/overlays/ticker");
  });
});
