/**
 * commoncast / clasp-client / createClaspClient
 *
 * Thin wrapper over @clasp-to/sdk. Purpose:
 *
 *   1. Normalize the init surface (we have one `createClaspClient({ relayUrl })`
 *      call regardless of which clasp SDK version we're on).
 *   2. Provide a `ConnectionState` signal so the Vue layer can display a
 *      status indicator.
 *   3. Keep the rest of commoncast free of direct `@clasp-to/sdk` imports so
 *      the SDK can be swapped/upgraded without touching UI code.
 *
 * We intentionally depend on the SDK dynamically (import()) so this module is
 * safe to import from SSR code paths — the dynamic import won't execute until
 * someone calls `createClaspClient()` from a browser context.
 *
 * Zero Vue. See CLAUDE.md §3.
 */

import type {
  ClaspClientOptions,
  ConnectionState,
  LowLevelClaspClient,
} from "./types.js";

export const DEFAULT_RELAY_URL = "wss://relay.clasp.to";

export interface ClaspClient {
  readonly state: ConnectionState;
  readonly underlying: LowLevelClaspClient | null;
  connect(): Promise<void>;
  set(address: string, value: unknown): Promise<void>;
  emit(address: string, value: unknown): Promise<void>;
  stream(address: string, value: unknown): Promise<void>;
  on(
    pattern: string,
    cb: (value: unknown, address: string) => void,
  ): () => void;
  onStateChange(cb: (state: ConnectionState) => void): () => void;
  close(): Promise<void>;
}

export function createClaspClient(options: ClaspClientOptions): ClaspClient {
  let state: ConnectionState = "idle";
  let underlying: LowLevelClaspClient | null = null;
  const stateListeners = new Set<(s: ConnectionState) => void>();

  function setState(next: ConnectionState) {
    state = next;
    for (const cb of stateListeners) cb(next);
  }

  async function connect(): Promise<void> {
    if (state === "connected" || state === "connecting") return;
    setState("connecting");
    try {
      // Dynamic import so this file is safe to import from SSR contexts —
      // the SDK only runs when someone actually calls connect() from the browser.
      const mod = (await import("@clasp-to/sdk")) as unknown as {
        default: (
          url: string,
          opts?: { name?: string; encrypted?: boolean },
        ) => Promise<LowLevelClaspClient>;
      };
      const initFn = mod.default;
      underlying = await initFn(options.relayUrl, {
        name: options.name ?? "commoncast",
        encrypted: options.encrypted ?? false,
      });
      underlying.onDisconnect?.((reason) => {
        setState("disconnected");
        void reason;
      });
      underlying.onError?.(() => setState("error"));
      underlying.onReconnect?.(() => setState("reconnecting"));
      setState("connected");
    } catch (err) {
      setState("error");
      throw err;
    }
  }

  async function requireUnderlying(): Promise<LowLevelClaspClient> {
    if (!underlying) {
      await connect();
    }
    if (!underlying) throw new Error("clasp client failed to connect");
    return underlying;
  }

  async function set(address: string, value: unknown): Promise<void> {
    const u = await requireUnderlying();
    await u.set(address, value);
  }
  async function emit(address: string, value: unknown): Promise<void> {
    const u = await requireUnderlying();
    await u.emit(address, value);
  }
  async function stream(address: string, value: unknown): Promise<void> {
    const u = await requireUnderlying();
    await u.stream(address, value);
  }
  function on(
    pattern: string,
    cb: (value: unknown, address: string) => void,
  ): () => void {
    if (!underlying) {
      // Queue: lazily subscribe once we've connected. For simplicity we
      // connect eagerly here.
      let unsub: (() => void) | null = null;
      void connect().then(() => {
        if (!underlying) return;
        unsub = underlying.on(pattern, (value, address) =>
          cb(value, address),
        );
      });
      return () => {
        unsub?.();
      };
    }
    return underlying.on(pattern, (value, address) => cb(value, address));
  }

  function onStateChange(cb: (s: ConnectionState) => void): () => void {
    stateListeners.add(cb);
    cb(state);
    return () => {
      stateListeners.delete(cb);
    };
  }

  async function close(): Promise<void> {
    if (!underlying) {
      setState("disconnected");
      return;
    }
    await underlying.close();
    underlying = null;
    setState("disconnected");
  }

  return {
    get state() {
      return state;
    },
    get underlying() {
      return underlying;
    },
    connect,
    set,
    emit,
    stream,
    on,
    onStateChange,
    close,
  };
}
