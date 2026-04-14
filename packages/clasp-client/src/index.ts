/**
 * @commoncast/clasp-client — public API
 *
 * Framework-agnostic TypeScript. Never imports vue.
 */

export {
  createClaspClient,
  DEFAULT_RELAY_URL,
  type ClaspClient,
} from "./client.js";
export { joinStudio, type StudioSession, type ParticipantEntry } from "./room.js";
export { addresses } from "./addresses.js";
export type {
  StudioId,
  ParticipantId,
  SceneId as ClaspSceneId,
  DestinationAddress,
  OverlayId,
} from "./addresses.js";
export type {
  ClaspClientOptions,
  ConnectionState,
  SignalPayload,
  ChatMessage,
} from "./types.js";
