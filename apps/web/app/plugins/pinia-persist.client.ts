/**
 * pinia-persist.client — hydrate + persist a targeted slice of each store
 * to localStorage.
 *
 * Intentionally narrow: `isLive` / `isRecording` must NEVER be persisted
 * (they describe a runtime session and flipping them on page load would
 * start broadcasting or recording without user consent). Each store in
 * `PERSIST` declares which keys it wants round-tripped.
 */
import { defineNuxtPlugin } from "#app";
import type { PiniaPluginContext } from "pinia";

const STORAGE_PREFIX = "commoncast.v1.";

type Selector = (state: Record<string, unknown>) => Record<string, unknown>;

const PERSIST: Record<string, Selector> = {
  prefs: (s) => ({
    claspRelayUrl: s.claspRelayUrl,
    defaultCameraId: s.defaultCameraId,
    defaultMicId: s.defaultMicId,
  }),
  studio: (s) => ({
    brand: s.brand,
    scenes: s.scenes,
    activeSceneId: s.activeSceneId,
  }),
  destinations: (s) => ({
    all: s.all,
    order: s.order,
    seeded: s.seeded,
  }),
};

function safeParse<T>(raw: string | null): T | null {
  if (raw == null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export default defineNuxtPlugin((nuxt) => {
  const pinia = nuxt.$pinia as PiniaPluginContext["pinia"] | undefined;
  if (!pinia) return;

  pinia.use(({ store }) => {
    const selector = PERSIST[store.$id];
    if (!selector) return;
    const key = STORAGE_PREFIX + store.$id;

    const saved = safeParse<Record<string, unknown>>(localStorage.getItem(key));
    if (saved) {
      try {
        store.$patch(saved as Parameters<typeof store.$patch>[0]);
      } catch {
        // Corrupt or schema-drifted payload — drop it and start clean.
        localStorage.removeItem(key);
      }
    }

    store.$subscribe(
      (_mutation, state) => {
        try {
          localStorage.setItem(key, JSON.stringify(selector(state)));
        } catch {
          // Storage full / disabled / private mode — swallow.
        }
      },
      { detached: true },
    );
  });
});
