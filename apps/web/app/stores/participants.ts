/**
 * Pinia / participants — the JSON-safe presence list.
 *
 * Never holds MediaStreams. See CLAUDE.md §3.
 */
import { defineStore } from "pinia";

export interface StudioParticipant {
  id: string;
  name: string;
  initials: string;
  color: string;
  stage: "live" | "backstage" | "media";
  host?: boolean;
  speaking?: boolean;
  meta?: string;
}

export const useParticipantsStore = defineStore("participants", {
  state: () => ({
    items: [
      {
        id: "moheeb",
        name: "Moheeb",
        initials: "MZ",
        color: "#3B82CE",
        stage: "live",
        host: true,
      },
      {
        id: "ada",
        name: "Ada",
        initials: "AD",
        color: "#22A559",
        stage: "live",
      },
      {
        id: "grace",
        name: "Grace",
        initials: "GH",
        color: "#D4940A",
        stage: "live",
      },
      {
        id: "linus",
        name: "Linus",
        initials: "LT",
        color: "#9333EA",
        stage: "live",
      },
      {
        id: "katie",
        name: "Katie",
        initials: "KB",
        color: "#F59E0B",
        stage: "backstage",
      },
      {
        id: "intro-reel",
        name: "Intro Reel",
        initials: "IR",
        color: "#3B82CE",
        stage: "media",
        meta: "00:42",
      },
    ] as StudioParticipant[],
  }),
  getters: {
    onStage: (s) => s.items.filter((p) => p.stage === "live"),
    backstage: (s) => s.items.filter((p) => p.stage === "backstage"),
    media: (s) => s.items.filter((p) => p.stage === "media"),
  },
});
