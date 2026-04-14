/**
 * Pinia / prefs — durable user prefs (persisted to localStorage via
 * plugins/pinia-persist.client.ts).
 */
import { defineStore } from "pinia";

export const usePrefsStore = defineStore("prefs", {
  state: () => ({
    claspRelayUrl: "wss://relay.clasp.to",
    defaultRelayUrl: "wss://relay.clasp.to",
    /** Last-picked camera deviceId, or null if the OS default should be used. */
    defaultCameraId: null as string | null,
    /** Last-picked microphone deviceId, or null for the OS default. */
    defaultMicId: null as string | null,
  }),
  actions: {
    setRelayUrl(url: string) {
      this.claspRelayUrl = url;
    },
    resetRelayUrl() {
      this.claspRelayUrl = this.defaultRelayUrl;
    },
    setDefaultCamera(id: string | null) {
      this.defaultCameraId = id;
    },
    setDefaultMic(id: string | null) {
      this.defaultMicId = id;
    },
  },
});
