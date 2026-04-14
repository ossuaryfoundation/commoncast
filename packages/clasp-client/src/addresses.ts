/**
 * commoncast / clasp-client / addresses
 *
 * Single source of truth for the clasp address schema. Every other module in
 * the app that touches clasp must build addresses through these helpers —
 * never inline string concatenation — so renaming/evolving the schema is one
 * file change.
 *
 * Extracted from docs/mockups/stagebox-architecture.html and adapted.
 */

export type StudioId = string;
export type ParticipantId = string;
export type SceneId = string;
export type DestinationAddress = string;
export type OverlayId = "logo" | "lower" | "ticker";

const STUDIO_ROOT = "/studio";

export const addresses = {
  // ---- studio root / meta ----
  studioRoot: (id: StudioId) => `${STUDIO_ROOT}/${id}`,
  studioMeta: (id: StudioId) => `${STUDIO_ROOT}/${id}/meta`,

  // ---- participants ----
  participants: (id: StudioId) => `${STUDIO_ROOT}/${id}/participants`,
  participant: (id: StudioId, pid: ParticipantId) =>
    `${STUDIO_ROOT}/${id}/participants/${pid}`,
  participantWildcard: (id: StudioId) =>
    `${STUDIO_ROOT}/${id}/participants/**`,

  // ---- scene ----
  sceneActive: (id: StudioId) => `${STUDIO_ROOT}/${id}/scene/active`,
  scenePreset: (id: StudioId, sceneId: SceneId) =>
    `${STUDIO_ROOT}/${id}/scene/presets/${sceneId}`,
  scenePresetsWildcard: (id: StudioId) =>
    `${STUDIO_ROOT}/${id}/scene/presets/**`,

  // ---- overlays ----
  overlay: (id: StudioId, overlay: OverlayId) =>
    `${STUDIO_ROOT}/${id}/overlays/${overlay}`,
  overlaysWildcard: (id: StudioId) => `${STUDIO_ROOT}/${id}/overlays/**`,

  // ---- brand ----
  brand: (id: StudioId) => `${STUDIO_ROOT}/${id}/brand`,

  // ---- WebRTC signaling ----
  // Symmetric: sender writes to signal/{toPid}/{fromPid}, receiver subscribes
  // to signal/{myPid}/**. This matches the pattern documented in
  // clasp/CHAT.md lines 32-41.
  signal: (id: StudioId, toPid: ParticipantId, fromPid: ParticipantId) =>
    `${STUDIO_ROOT}/${id}/signal/${toPid}/${fromPid}`,
  signalInbox: (id: StudioId, myPid: ParticipantId) =>
    `${STUDIO_ROOT}/${id}/signal/${myPid}/**`,

  // ---- speaking stream (Stream QoS signal) ----
  speaking: (id: StudioId, pid: ParticipantId) =>
    `${STUDIO_ROOT}/${id}/speaking/${pid}`,
  speakingWildcard: (id: StudioId) => `${STUDIO_ROOT}/${id}/speaking/*`,

  // ---- broadcast state ----
  broadcastLive: (id: StudioId) => `${STUDIO_ROOT}/${id}/broadcast/live`,
  broadcastRecording: (id: StudioId) =>
    `${STUDIO_ROOT}/${id}/broadcast/recording`,

  // ---- composited broadcast output to an address ----
  // The studio writes an SDP offer here; the receiver (anything subscribed to
  // this address) writes the answer back at broadcastOutAnswer(), then ICE
  // candidates are exchanged through the same path.
  broadcastOut: (id: StudioId, dest: DestinationAddress) =>
    `${STUDIO_ROOT}/${id}/broadcast/out/${dest}/offer`,
  broadcastOutAnswer: (id: StudioId, dest: DestinationAddress) =>
    `${STUDIO_ROOT}/${id}/broadcast/out/${dest}/answer`,
  broadcastOutIce: (
    id: StudioId,
    dest: DestinationAddress,
    from: "host" | "receiver",
  ) => `${STUDIO_ROOT}/${id}/broadcast/out/${dest}/ice/${from}`,

  // ---- chat ----
  chatMessage: (id: StudioId, msgId: string) =>
    `${STUDIO_ROOT}/${id}/chat/${msgId}`,
  chatMessagesWildcard: (id: StudioId) => `${STUDIO_ROOT}/${id}/chat/*`,
  chatFeatured: (id: StudioId) => `${STUDIO_ROOT}/${id}/chat/featured`,
} as const;
