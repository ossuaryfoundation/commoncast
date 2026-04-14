/**
 * Pinia / prefs — durable user prefs.
 */
import { defineStore } from "pinia";

export const usePrefsStore = defineStore("prefs", {
  state: () => ({
    claspRelayUrl: "wss://relay.clasp.to",
    defaultRelayUrl: "wss://relay.clasp.to",
  }),
  actions: {
    setRelayUrl(url: string) {
      this.claspRelayUrl = url;
    },
    resetRelayUrl() {
      this.claspRelayUrl = this.defaultRelayUrl;
    },
  },
});
