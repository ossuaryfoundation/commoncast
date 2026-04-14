<!--
  Receiver page. Subscribes to a clasp broadcast-out address, completes the
  WebRTC handshake, and plays the incoming composited track.

  This is the "send composited video out through clasp to an address" target
  from the build plan. Open this page in one tab with ?studio=<id> and the
  studio in another — the studio's broadcast button will deliver its composite
  here.
-->
<script setup lang="ts">
import { onMounted, onUnmounted, ref, shallowRef } from "vue";
import { useRoute } from "vue-router";
import { useNuxtApp } from "#app";
import {
  addresses,
  type ClaspClient,
} from "@commoncast/clasp-client";

const route = useRoute();
const destAddr = String(route.params.addr ?? "demo");
const studioId = String(route.query.studio ?? "default");

const videoEl = ref<HTMLVideoElement | null>(null);
const state = ref<"waiting" | "negotiating" | "live" | "error">("waiting");

let pc: RTCPeerConnection | null = null;
const unsubs = shallowRef<Array<() => void>>([]);

onMounted(async () => {
  const nuxt = useNuxtApp();
  const clasp = nuxt.$clasp as ClaspClient;
  await clasp.connect();

  pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  pc.addEventListener("track", (e) => {
    if (!videoEl.value) return;
    videoEl.value.srcObject = new MediaStream([e.track]);
    videoEl.value.play().catch(() => {});
    state.value = "live";
  });
  pc.addEventListener("icecandidate", (e) => {
    if (e.candidate) {
      void clasp.set(
        addresses.broadcastOutIce(studioId, destAddr, "receiver"),
        { candidate: e.candidate.toJSON() },
      );
    }
  });

  const offerAddr = addresses.broadcastOut(studioId, destAddr);
  const answerAddr = addresses.broadcastOutAnswer(studioId, destAddr);
  const iceHostAddr = addresses.broadcastOutIce(studioId, destAddr, "host");

  const unsubOffer = clasp.on(offerAddr, async (value) => {
    const v = value as { sdp?: string } | null;
    if (!v?.sdp || !pc) return;
    state.value = "negotiating";
    await pc.setRemoteDescription({ type: "offer", sdp: v.sdp });
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    if (answer.sdp) {
      await clasp.set(answerAddr, { sdp: answer.sdp });
    }
  });
  const unsubIce = clasp.on(iceHostAddr, (value) => {
    const v = value as { candidate?: RTCIceCandidateInit } | null;
    if (!v?.candidate || !pc) return;
    void pc.addIceCandidate(v.candidate).catch(() => {});
  });
  unsubs.value = [unsubOffer, unsubIce];
});

onUnmounted(() => {
  unsubs.value.forEach((u) => u());
  pc?.close();
  pc = null;
});
</script>

<template>
  <section class="mx-auto flex min-h-full max-w-[960px] flex-col items-center justify-center p-8">
    <div class="mb-4 flex items-center gap-3 font-ui text-[11px] uppercase tracking-wider text-[var(--cc-ink-muted)]">
      <span>Receiving</span>
      <span class="font-code text-[var(--cc-ink)]">{{ destAddr }}</span>
      <span class="text-[var(--cc-ink-muted)]">from studio</span>
      <span class="font-code text-[var(--cc-ink)]">{{ studioId }}</span>
    </div>
    <div class="aspect-video w-full bg-[var(--cc-soot)]">
      <video ref="videoEl" class="h-full w-full" autoplay muted playsinline />
    </div>
    <div class="mt-4 font-ui text-[10px] uppercase text-[var(--cc-ink-muted)]">
      Status: <span class="text-[var(--cc-ink)]">{{ state }}</span>
    </div>
  </section>
</template>
