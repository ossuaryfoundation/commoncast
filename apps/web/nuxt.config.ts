/**
 * commoncast — Nuxt 4 SPA.
 *
 * ssr: false on purpose. See CLAUDE.md §3: browser-only APIs (clasp client,
 * WebRTC, canvas capture, WebGPU) live here and SSR rendering them is actively
 * harmful (hydration mismatches, MediaStream-on-the-server errors, etc).
 */
import { defineNuxtConfig } from "nuxt/config";
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  ssr: false,
  devtools: { enabled: true },

  modules: ["@pinia/nuxt", "@vueuse/nuxt"],

  css: ["~/assets/app.css"],

  vite: {
    plugins: [tailwindcss()],
  },

  runtimeConfig: {
    public: {
      claspRelayUrl: "wss://relay.clasp.to",
      claspClientName: "commoncast",
    },
  },

  app: {
    head: {
      title: "commoncast",
      meta: [
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { name: "description", content: "Broadcasting for the commons." },
      ],
      link: [
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;900&family=Source+Sans+3:wght@300;400;600;700&family=DM+Mono:wght@400;500&family=Fira+Code:wght@400;500&display=swap",
        },
      ],
    },
  },

  typescript: {
    strict: true,
    typeCheck: false,
  },

  compatibilityDate: "2026-04-13",
});
