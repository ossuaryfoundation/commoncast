/**
 * commoncast / clasp-client / joinStudio
 *
 * A "studio" is the commoncast name for a clasp room namespaced under
 * /studio/{id}/**. joinStudio() returns a small facade around the main
 * client, scoped to one studio, with helpers for the common operations.
 *
 * Zero Vue.
 */

import { addresses, type ParticipantId, type StudioId } from "./addresses.js";
import type { ClaspClient } from "./client.js";
import type { SignalPayload } from "./types.js";

export interface StudioSession {
  readonly studioId: StudioId;
  readonly participantId: ParticipantId;

  /** Write our participant entry. Call on join; delete on leave. */
  announcePresence(entry: ParticipantEntry): Promise<void>;
  updatePresence(patch: Partial<ParticipantEntry>): Promise<void>;

  /**
   * Write (or null out) an arbitrary participant's entry. Used by the host
   * to mutate another participant's presence — stage, muted, cameraOff,
   * or removal (kick) when `entry` is null. No auth is enforced at the
   * clasp layer; cooperative trust until an SFU is introduced.
   */
  setParticipant(
    pid: ParticipantId,
    entry: ParticipantEntry | null,
  ): Promise<void>;

  /** Subscribe to every other participant. Returns an unsubscribe fn. */
  onParticipants(
    cb: (pid: ParticipantId, entry: ParticipantEntry | null) => void,
  ): () => void;

  /** Send a WebRTC signaling payload to another participant. */
  sendSignal(toPid: ParticipantId, payload: SignalPayload): Promise<void>;

  /** Subscribe to inbound signaling for us. */
  onSignal(
    cb: (fromPid: ParticipantId, payload: SignalPayload) => void,
  ): () => void;

  /** Set the active scene ID. */
  setActiveScene(sceneId: string): Promise<void>;
  onActiveScene(cb: (sceneId: string) => void): () => void;

  leave(): Promise<void>;
}

export interface ParticipantEntry {
  name: string;
  role: "host" | "guest" | "viewer";
  stage: "live" | "backstage";
  slot: number;
  muted: boolean;
  /** Host-over camera blank, or guest self-disable. Optional for backwards compat. */
  cameraOff?: boolean;
  /** Guest signalling "I want to come on stage". Cleared by the host when promoting. */
  raisedHand?: boolean;
}

export function joinStudio(
  client: ClaspClient,
  studioId: StudioId,
  participantId: ParticipantId,
): StudioSession {
  const unsubscribers: Array<() => void> = [];

  let currentPresence: ParticipantEntry | null = null;

  async function announcePresence(entry: ParticipantEntry): Promise<void> {
    currentPresence = entry;
    await client.set(addresses.participant(studioId, participantId), entry);
  }

  async function updatePresence(patch: Partial<ParticipantEntry>): Promise<void> {
    if (!currentPresence) {
      throw new Error("updatePresence called before announcePresence");
    }
    currentPresence = { ...currentPresence, ...patch };
    await client.set(
      addresses.participant(studioId, participantId),
      currentPresence,
    );
  }

  function onParticipants(
    cb: (pid: ParticipantId, entry: ParticipantEntry | null) => void,
  ): () => void {
    const unsub = client.on(addresses.participantWildcard(studioId), (value, address) => {
      // Extract the participant id from the address suffix.
      const prefix = `${addresses.participants(studioId)}/`;
      if (!address.startsWith(prefix)) return;
      const pid = address.slice(prefix.length);
      if (!pid) return;
      cb(pid, (value as ParticipantEntry | null) ?? null);
    });
    unsubscribers.push(unsub);
    return unsub;
  }

  async function setParticipant(
    pid: ParticipantId,
    entry: ParticipantEntry | null,
  ): Promise<void> {
    await client.set(addresses.participant(studioId, pid), entry);
  }

  async function sendSignal(
    toPid: ParticipantId,
    payload: SignalPayload,
  ): Promise<void> {
    await client.set(
      addresses.signal(studioId, toPid, participantId),
      payload,
    );
  }

  function onSignal(
    cb: (fromPid: ParticipantId, payload: SignalPayload) => void,
  ): () => void {
    const unsub = client.on(
      addresses.signalInbox(studioId, participantId),
      (value, address) => {
        // address shape: /studio/{id}/signal/{me}/{fromPid}
        const parts = address.split("/");
        const fromPid = parts[parts.length - 1];
        if (!fromPid) return;
        cb(fromPid, value as SignalPayload);
      },
    );
    unsubscribers.push(unsub);
    return unsub;
  }

  async function setActiveScene(sceneId: string): Promise<void> {
    await client.set(addresses.sceneActive(studioId), sceneId);
  }

  function onActiveScene(cb: (sceneId: string) => void): () => void {
    const unsub = client.on(addresses.sceneActive(studioId), (value) => {
      if (typeof value === "string") cb(value);
    });
    unsubscribers.push(unsub);
    return unsub;
  }

  async function leave(): Promise<void> {
    // Null out our presence. (clasp treats null as "delete" per its SDK.)
    try {
      await client.set(addresses.participant(studioId, participantId), null);
    } catch {
      // Best-effort on leave; we still want to tear down local subs.
    }
    for (const unsub of unsubscribers.splice(0)) {
      try {
        unsub();
      } catch {
        // ignore
      }
    }
  }

  return {
    studioId,
    participantId,
    announcePresence,
    updatePresence,
    setParticipant,
    onParticipants,
    sendSignal,
    onSignal,
    setActiveScene,
    onActiveScene,
    leave,
  };
}
