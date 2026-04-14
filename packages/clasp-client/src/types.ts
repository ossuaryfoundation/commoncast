/**
 * commoncast / clasp-client / types
 */

export interface ClaspClientOptions {
  /** Full WebSocket URL of the clasp relay. Default: wss://relay.clasp.to */
  relayUrl: string;
  /** Human-readable client name; surfaces in clasp telemetry. */
  name?: string;
  /** Enable end-to-end encryption for room traffic. */
  encrypted?: boolean;
}

export type ConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "error";

// Minimal subset of the @clasp-to/sdk client surface we depend on. We keep
// this narrow so upgrading the SDK is painless — if clasp renames/changes a
// method we adapt it here in one place.
export interface LowLevelClaspClient {
  readonly connected: boolean;
  readonly session?: string;
  set(address: string, value: unknown): Promise<void> | void;
  on(
    pattern: string,
    cb: (value: unknown, address: string, meta?: unknown) => void,
  ): () => void;
  emit(address: string, value: unknown): Promise<void> | void;
  stream(address: string, value: unknown): Promise<void> | void;
  close(): Promise<void> | void;
  onConnect?(cb: () => void): void;
  onDisconnect?(cb: (reason?: string) => void): void;
  onError?(cb: (err: Error) => void): void;
  onReconnect?(cb: (attempt: number) => void): void;
}

/** The signaling payload we round-trip through clasp addresses. */
export type SignalPayload =
  | { type: "offer"; sdp: string }
  | { type: "answer"; sdp: string }
  | { type: "ice"; candidate: RTCIceCandidateInit };

/**
 * A single chat message in a studio. Stored at
 * addresses.chatMessage(studioId, msg.id); receivers subscribe to
 * chatMessagesWildcard and project them into whatever chat UI they want.
 */
export interface ChatMessage {
  id: string;
  fromPid: string;
  fromName: string;
  text: string;
  /**
   * Where the message originated. MVP only emits "commoncast" (clasp
   * native); "youtube" / "twitch" come in a later slice that ingests
   * external platform chats.
   */
  platform: "commoncast" | "youtube" | "twitch";
  sentAt: number;
}
