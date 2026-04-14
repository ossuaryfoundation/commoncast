/**
 * commoncast / plugins / clasp.client
 *
 * Creates a singleton clasp client for this tab. `.client.ts` suffix keeps this
 * file out of any server bundle (belt-and-braces, since ssr is off).
 *
 * The client is LAZY — we don't actually open the WebSocket until the first
 * call that needs it (e.g. from useClaspRoom). That keeps the landing page
 * free of a relay connection.
 */
import { defineNuxtPlugin, useRuntimeConfig } from "#app";
import { createClaspClient, type ClaspClient } from "@commoncast/clasp-client";

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const client: ClaspClient = createClaspClient({
    relayUrl: config.public.claspRelayUrl,
    name: config.public.claspClientName,
    encrypted: false,
  });

  return {
    provide: { clasp: client },
  };
});
