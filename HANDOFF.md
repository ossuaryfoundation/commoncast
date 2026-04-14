# commoncast — Session Handoff

**Written:** 2026-04-14
**Branch:** `main` (pushed to `origin/main`)
**Last commit:** `f351145` — studio slice H6-tick: ticker overlay actually scrolls

Read this before touching anything. Then read [`CLAUDE.md`](CLAUDE.md) and [`README.md`](README.md).

---

## Where we are

The v0 scaffold is long gone. commoncast now has a real, working studio: slot-based Pixi compositor, participants-as-clasp-projection with stage/backstage/mute/kick, a WebAudio mixer with VU meters + speaker rings, scene editor (add/rename/duplicate/delete, persisted), multi-destination broadcast fanout with a destinations drawer, chat with feature-on-stream banners, a toast bus, a `⌘K` command palette with 20+ registered commands and 8 baseline hotkeys, focus-trapped Dialog-backed confirm flow for destructive actions, and an always-on bottom mixer dock with a real horizontally scrolling ticker overlay.

14 commits on `main`, all pushed. Everything is typed, every package test passes, every touched file has been transform-probed through the dev server. **What has NOT been run**: a real browser. The interactive behaviors below (keyboard, clipboard, Pixi canvas, WebRTC, MediaRecorder audio tracks) need manual verification in a live tab.

---

## Absolute rules (CLAUDE.md §1)

- **Never attribute Claude — or any AI — as author or co-author on commits.**
- **No `Co-Authored-By: Claude`, no `Generated with Claude Code` footers, no `@anthropic.com` trailers.** Ever.
- **Do not run `git config`** to change author/committer identity.
- The project is **commoncast**. Not stagebox, not tally. Those legacy names live only in `docs/mockups/` filenames.

---

## First-run playbook

```bash
pnpm install                                     # workspace linkage + pnpm-lock.yaml
pnpm --filter @commoncast/studio-engine test     # 11/11 layout + slot-count tests
pnpm --filter @commoncast/clasp-client test      # 4/4 address-schema tests
pnpm --filter @commoncast/studio-engine typecheck
pnpm --filter @commoncast/clasp-client typecheck
pnpm --filter @commoncast/web dev                # http://localhost:3000
```

Open `http://localhost:3000/studios/demo`. First run:

1. A centered "Enable camera & microphone" card appears over the stage.
2. Click it → browser prompts → grant permission → card disappears, your camera feed lands in slot 1 of the active scene.
3. Press `⌘K` (cmd+k / ctrl+k) → command palette opens.
4. Press `?` → shortcuts dialog lists every registered hotkey.
5. Press `M` to toggle your own mute (avatar desaturates, VU drops).
6. Press `T` to toggle the stage overlay between Edit and Operate modes.
7. Press `F1`–`F5` to recall scenes.
8. Click the Destinations chip in the toolbar → drawer opens with a default "Test receiver" destination.
9. Click `Go Live` (or press `G`) → publishes to the `test` destination. Open `/receive/test?studio=demo` in a second tab to verify the composite plays.
10. Click `Record` (or press `R`) → `.webm` downloads on stop with BOTH video + audio.

**Two-tab broadcast test**:

```
Tab A: /studios/demo                 (host; click Go Live)
Tab B: /receive/test?studio=demo     (receiver; should play the composite)
```

**Two-tab guest flow**:

```
Tab A: /studios/demo                 (host)
Tab B: /join/demo?guest=Alice        (guest; lands in Backstage)
       → Host hovers Alice's backstage row → menu → "Bring on stage"
       → Alice's camera auto-assigns to first empty slot
```

---

## What's shipped (commit ledger, newest first)

Every commit is a self-contained slice. Reading top to bottom gives the architectural progression.

| Commit | Slice | Delivers |
|---|---|---|
| `f351145` | **H6-tick** — ticker scroll | Compositor gains per-frame `overlayUpdates: Map<Container, (dt) => void>` registry + `app.ticker` hook. Ticker overlay now dual-text seamless-wrap scrolls at 80 px/sec. Foundation for all future animated overlays (countdown, banner slide-in, transitions, Lottie). |
| `9ffe72a` | **H3a** — mixer dock | `AudioMixerDock` horizontal 96px strip between the 3-col split and the status bar. One column per source + pinned Master column with enlarged VU and "On air" / "Off air" pill. Audio tab removed from ControlsPanel. |
| `ad9672b` | **H2b** — confirm dialogs | `useConfirm` imperative API + `ConfirmMount` singleton Dialog. Kick, delete scene, remove destination all surface a danger-red confirm Dialog before the action. |
| `6218956` | **H2a** — tooling multiplier | `Tooltip`, `Dialog`, `CommandPalette` DS primitives (reka-ui). `useHotkeys` + `useCommands` module-level registries. `⌘K` palette + `?` shortcuts dialog. 8 hotkeys + ~20 commands registered in studio page. TopToolbar tooltip-wrapped. |
| `0a90ba5` | **H1** — first-minute repair | Toast bus (DS `Toast` + `useToasts` singleton + `ToastStack`). Global `:focus-visible` outline baseline. Stage slot overlay → accessible buttons with edit/operate mode (auto-switches on `studio.isLive`, `T` hotkey). Destinations chip rebuilt as one clean button. Copy-invite action. Mute state redesigned (desaturate + pill). Hover-bounce removed. Onboarding camera CTA. Contrast fixes to VUMeter / Input / Toggle. |
| `89af753` | **G** — chat + feature-on-stream | `ChatMessage` type in clasp, `ChatBannerOverlaySpec` in engine (transient banner rendered by compositor). `chat` store (ring-buffered, not persisted). `useStudioChat` subscribes to wildcard + featured address, exposes send/feature/clearFeatured with 8s auto-clear. `ChatPanel` in ControlsPanel Chat tab. Page appends featured chat as an ambient scene overlay. |
| `aee688e` | **E** — destinations fanout | `createBroadcastSender` plain factory (framework-neutral). `useBroadcastFanout` orchestrates N concurrent senders keyed by destination id with live react to store changes. `destinations` Pinia store (persisted, seeds default `test` destination). DS `Drawer` primitive. `DestinationsDrawer` component. Toolbar destinations chip opens the drawer. Multi-destination broadcast works end-to-end. |
| `d68e2ce` | **D** — scene editor | `addScene` / `duplicateScene` / `renameScene` / `removeScene` / `reindexScenes` on the studio store. Scenes tab gets per-row `Menu` with Rename/Duplicate/Delete, double-click rename with inline input, "+ Add scene". Persists via pinia-persist. |
| `7de41a8` | **C** — VU meters + speaker rings | Per-source + master `AnalyserNode`s in `AudioMixer`. `useHostMixer` exposes reactive `levels` + `masterLevel` via rAF loop. VU bars under every fader + master VU in StatusBar. Compositor's `speakingLayer` draws pulsing live-green rings around slots whose bound source is speaking (hysteresis + 250ms hold). |
| `e9bab9d` | **B** — AudioMixer + silent-audio fix | Framework-agnostic `AudioMixer` class in studio-engine (summing WebAudio graph, per-source gain, master, destination). `useHostMixer` composable. Peer connections now carry audio tracks (`getLocalTracks` returns both video + audio). `useBroadcastSender.publish({stream})` instead of `{track}`. Recording and broadcast finally carry audio. New DS `Slider` primitive, `AudioMixerStrip` component. |
| `27f66ac` | **A** — participants as clasp projection | `ParticipantEntry` gains `cameraOff?` + `raisedHand?`. `StudioSession.setParticipant(pid, entry \| null)` for host cross-participant writes. `useStudioParticipants` projects clasp room state into a revived `participants` Pinia store. Host actions: `bringOnStage` / `sendToBackstage` / `setMuted` / `setCameraOff` / `raiseHand` / `kick`. People panel with per-row action `Menu`. Self-hooks for `onOwnMutedChanged` / `onOwnCameraOffChanged` / `onKicked` → local track toggle or `router.push("/")`. |
| `0474e98` | **1** — inventory, slot model, toolbar | Sparse `(SourceId \| null)[]` feeds per scene. `LAYOUT_SLOT_COUNT` + `computeSlots`. Inventory panel replaces the hardcoded fixture. Numbered slot overlay on the stage. Real recorder/sender state in the toolbar. pinia-persist plugin for prefs + brand + scenes. |
| `c2325ea` | **0** — wire broadcast/record/peers | Hoisted `useStudioEngine` into `studios/[id].vue`. A/B: broadcast + record wired via `studio.isLive` / `studio.isRecording` watchers. C: guest P2P via `useStudioPeers` composing `useClaspRoom` + per-peer `usePeerConnection`. D: guest join flow via `/join/[id]?guest=<name>`. |
| `7887019` | bootstrap | Fixed scaffold typecheck blockers (composable return types, `setOverlay` `this`-in-type, Pixi v8 `Assets.load`, dead exports, design-system `theme.css` export, `eslint.config.ts.disabled` rename). `pnpm install` clean. Package tests green. |
| `1e23408` | scaffold | Monorepo skeleton. |

---

## Current architecture

```
commoncast/
├── apps/web/                              Nuxt 4 SPA — the studio site
│   ├── app.vue
│   └── app/
│       ├── pages/
│       │   ├── index.vue                  Dashboard (still hardcoded mock)
│       │   ├── studios/[id].vue           Studio wiring hub (~750 lines)
│       │   ├── join/[id].vue              Guest greenroom stub
│       │   ├── receive/[addr].vue         Working WebRTC receiver page
│       │   ├── watch/[id].vue             Hardcoded mock (needs H4)
│       │   └── settings/index.vue         Only relay URL (needs H5)
│       ├── layouts/
│       │   ├── default.vue                Site chrome + ToastStack
│       │   └── studio.vue                 Full-bleed + ToastStack +
│       │                                    CommandPaletteMount +
│       │                                    ShortcutsDialog + ConfirmMount
│       ├── components/
│       │   ├── ToastStack.vue             Singleton toast mount
│       │   ├── CommandPaletteMount.vue    Singleton ⌘K mount
│       │   ├── ShortcutsDialog.vue        ? help dialog
│       │   ├── ConfirmMount.vue           Singleton Confirm mount
│       │   └── studio/
│       │       ├── TopToolbar.vue         Brand + title + Invite + Live/Rec + Destinations chip + Peers chip + LIVE timer
│       │       ├── SourcesPanel.vue       Misnamed: it's the People panel (Local + On Stage + Backstage)
│       │       ├── StudioStage.vue        Pixi canvas + numbered slot overlay + edit/operate mode + onboarding card
│       │       ├── ControlsPanel.vue      Right inspector tabs: Layout / Overlays / Scenes / Brand / Chat
│       │       ├── ChatPanel.vue          Chat tab content
│       │       ├── DestinationsDrawer.vue Drawer content
│       │       ├── AudioMixerStrip.vue    (Legacy, now unused — left in for vertical-layout reuse)
│       │       ├── AudioMixerDock.vue     Always-on bottom strip
│       │       └── StatusBar.vue          Clasp / Broadcast / WebRTC / Rec / Mix VU
│       ├── composables/
│       │   ├── useStudioEngine.ts         Mount Pixi compositor into canvas ref
│       │   ├── useStudioContext.ts        StudioContext injection key + provide/use helpers
│       │   ├── useStudioPeers.ts          WebRTC mesh keyed by pid (room + per-peer PC)
│       │   ├── useStudioParticipants.ts   Clasp room → participants store projection
│       │   ├── useStudioChat.ts           Chat wildcard projection + send/feature/clear
│       │   ├── useClaspRoom.ts            Low-level clasp session wrapper
│       │   ├── usePeerConnection.ts       One RTCPeerConnection + signaling callback
│       │   ├── useBroadcastFanout.ts      Multi-dest orchestrator over createBroadcastSender
│       │   ├── broadcastSender.ts         Plain factory (no Vue) — the guts
│       │   ├── useBroadcastSender.ts      Thin single-instance wrapper around broadcastSender
│       │   ├── useStudioRecorder.ts       MediaRecorder wrapper
│       │   ├── useUserMedia.ts            getUserMedia shallowRef holder
│       │   ├── useMediaDevices.ts         enumerateDevices + devicechange watcher
│       │   ├── useScreenCapture.ts        getDisplayMedia wrapper
│       │   ├── useHostMixer.ts            Vue wrapper around engine AudioMixer + rAF level polling
│       │   ├── useAudioLevels.ts          Stream-level AnalyserNode wrapper (used by local mic VU)
│       │   ├── useStageSelection.ts       slot + mode refs (edit/operate)
│       │   ├── useTimecode.ts             HH:MM:SS string from a start time
│       │   ├── useToasts.ts               Module-level toast bus (singleton)
│       │   ├── useHotkeys.ts              Module-level keydown registry (singleton)
│       │   ├── useCommands.ts             Module-level ⌘K command registry (singleton)
│       │   └── useConfirm.ts              Module-level imperative confirm (singleton)
│       ├── stores/
│       │   ├── studio.ts                  Scenes + slot feeds + brand + isLive/isRecording
│       │   ├── prefs.ts                   Relay URL + default devices (persisted)
│       │   ├── destinations.ts            Destination list + auto flags (persisted)
│       │   ├── participants.ts            Projection of clasp room (NOT persisted)
│       │   └── chat.ts                    Ring-buffered messages + featuredId (NOT persisted)
│       └── plugins/
│           ├── clasp.client.ts            Singleton clasp client provider
│           └── pinia-persist.client.ts    Selector-based localStorage sync for prefs/studio/destinations
├── packages/
│   ├── design-system/                     Pure presentation — no stores/engine/clasp
│   │   └── src/
│   │       ├── tokens/tokens.css          CSS custom props + global :focus-visible outline
│   │       ├── primitives/
│   │       │   ├── Avatar / Badge / Button / ColorSwatch
│   │       │   ├── Input / Kbd / Menu / OnAirBadge / PanelHeader
│   │       │   ├── Select / Slider / StatusDot / Tabs / Toggle
│   │       │   ├── Toast / VUMeter / Drawer
│   │       │   ├── Tooltip / Dialog / CommandPalette   (H2a, reka-ui-backed)
│   │       ├── components/
│   │       │   ├── BroadcastFrame / ChatMessage / LayoutOption
│   │       │   ├── OverlayRow / ParticipantCard / SceneButton
│   │       │   └── StatusBarIndicator
│   │       ├── tailwind.preset.ts
│   │       └── index.ts
│   ├── studio-engine/                     Pixi v8 compositor — no Vue
│   │   └── src/
│   │       ├── compositor.ts              Scene graph, slot rendering, speaker rings, overlay render loop
│   │       ├── layouts/index.ts           computeSlots + LAYOUT_SLOT_COUNT + getSlotCount + computeLayout
│   │       ├── audio/AudioMixer.ts        Summing WebAudio graph + per-source/master AnalyserNodes
│   │       ├── sources/CameraSource.ts    MediaStreamTrack → HTMLVideoElement → Pixi Texture
│   │       ├── types.ts                   Scene / Slot / Source / Overlay discriminated unions
│   │       └── index.ts
│   └── clasp-client/                      Clasp SDK wrapper — no Vue
│       └── src/
│           ├── addresses.ts               Single source of truth for the address schema
│           ├── client.ts                  Lazy dynamic-import around @clasp-to/sdk
│           ├── room.ts                    joinStudio → StudioSession with setParticipant, signaling, presence
│           ├── types.ts                   ClaspClient, ChatMessage, SignalPayload, ParticipantEntry
│           └── index.ts
└── docs/mockups/                          Frozen HTML mockups — do not edit
```

**Hard boundaries (CLAUDE.md §3)**:

- `design-system` imports **only** Vue, reka-ui, tailwind utilities. Never studio-engine, clasp-client, stores, or composables.
- `studio-engine` and `clasp-client` never import Vue or any Vue ecosystem package.
- `apps/web` is the only wiring layer.
- Every `MediaStream` / `MediaStreamTrack` / `RTCPeerConnection` / `AudioContext` / `AnalyserNode` / `GainNode` / Pixi `Application` lives in `shallowRef` or plain closure/Map/Set state — **never** in Pinia.
- Every composable that acquires media/GPU/network releases in `onScopeDispose` **and** `import.meta.hot?.dispose(...)` for HMR safety.
- Host-only actions (bringOnStage, mute, kick, featureMessage) are guarded at the composable tier.

---

## Key invariants worth knowing before you touch anything

1. **The toast / hotkey / command / confirm composables are module-level singletons**, not scoped composables. This is deliberate — they need to emit from any lifecycle phase (including inside `onScopeDispose` cleanups). Each one still supports per-caller `register()` returning an unregister fn, and auto-cleans on `onScopeDispose` and HMR dispose. If you refactor any of them into per-scope instances, you'll break cross-composable cleanup.

2. **`useStudioParticipants` is a read projection of the clasp room**, not a source of truth. The clasp room is the authority; the `participants` Pinia store is a derived read model. Writes go through `session.setParticipant(pid, entry)` which writes the whole entry object to the clasp address, which then echoes back through the subscription and into the store.

3. **Host-only actions are cooperative, not enforced.** Muting a guest writes `muted: true` to their participant entry. The guest's own client observes the change and calls `audioTrack.enabled = false`. A malicious guest could ignore the signal — real forced mute needs a server-side SFU. Same for `kick` (the host writes null to the guest's presence; the guest's `onKicked` hook redirects them home). This is documented behavior for MVP.

4. **The compositor's output stream is NOT just `canvas.captureStream()`**. Before slice B it was video-only (the silent-audio bug). Since B, recording and broadcast both go through `buildOutputStream()` in `studios/[id].vue` which combines `engine.getOutputStream().getVideoTracks()[0]` with `hostMixer.outputTrack.value` into a fresh `MediaStream`. If you need the output elsewhere, use the same helper.

5. **Audio routing for peers**: the peer connection's `track` event fires twice per peer — once for video, once for audio. The page's `onRemoteTrack` switch routes video to `mountSource` (engine) and audio to `hostMixer.addSource(pid, label, track, { kind: "peer" })`. The mixer key for peer audio is the peer's pid, so `participantsStore` mute-mirror watches can flip `hostMixer.setMuted(pid, …)` directly.

6. **The stage has two modes**: `edit` and `operate`. Edit shows numbered slot chips, empty placeholders, and Clear buttons. Operate hides them (for a clean live canvas). Auto-switches to `operate` when `studio.isLive` flips on, back to `edit` when it flips off. Users can override manually via the stage header toggle or `T` hotkey. The speaking ring layer (slice C) stays on in both modes.

7. **The mixer dock is always on.** It's in the grid row template (`44px / minmax(0,1fr) / auto / 32px`) and was never hidden behind a tab in the current design. If you're looking for the old `Audio` tab in ControlsPanel, it was removed in H2b/H3a.

8. **Scene feeds are sparse slot arrays**, not dense. `Scene.feeds: (SourceId | null)[]` where the length equals `getSlotCount(scene.layout)`. Slot 0 of a `split` layout is the left half, slot 1 is the right half. When you change a scene's layout via `setSceneLayout`, the feeds array is resized and padded with null. Source assignment is direct-manipulated ("click slot, click source") and/or auto-assigned on first mount to the first empty slot of every scene.

9. **Scenes, brand, prefs, and destinations are persisted via a targeted pinia-persist plugin**. The `participants` and `chat` stores are NOT persisted (stale data across sessions would be worse than empty). Adding a new store that needs persistence means adding a selector to `PERSIST` in `plugins/pinia-persist.client.ts`.

10. **Command palette commands live next to their composables**, not in a big central registry file. The studio page registers ~20 static commands for System/Broadcast/Stage/Scenes/People/Chat + dynamically re-registers one "Go to scene X" per scene via a deep watch. `when` gates make two commands share a key (`G` → Go Live when `!isLive`, → Stop broadcast when `isLive`).

11. **The compositor has a per-frame overlay update mechanism** (`overlayUpdates: Map<Container, (dt) => void>` fed by `app.ticker`). Added in H6-tick for the scrolling ticker. Future animated overlays (countdown, slide-in banner, scene transitions, Lottie) plug in here. `overlayUpdates` is cleared + repopulated by every `applyScene` — stale updates against destroyed containers can't leak.

---

## Verification gaps (what has NOT been run)

**I have never opened a real browser in this codebase.** Everything below is verified via typechecks, package tests, and `curl`'d transform probes through the dev server. These are the interactions that need manual verification before shipping:

1. `⌘K` / `cmd+k` / `ctrl+k` opens the command palette globally (including from inside a form field).
2. Arrow keys + Enter run a palette command; Esc closes.
3. Per-kind hotkeys (`M` self-mute, `G` go live, `R` record, `T` stage mode, `F1`-`F5` scenes, `?` shortcuts dialog) all fire outside form fields and are suppressed inside.
4. Tab key traverses every custom control with a visible 2px signal-red focus outline.
5. Deny camera/mic permission → toast appears with Retry action and a pinned onboarding card is still over the stage.
6. Recording a broadcast produces a `.webm` with BOTH audio AND video (the silent-audio fix from slice B).
7. Two-tab host + guest: guest lands in Backstage; host's People panel shows Alice with a Bring-on-stage action; clicking it auto-assigns Alice's camera to the first empty slot.
8. Multi-destination broadcast: add a second destination in the drawer, click Go Live, open `/receive/test?studio=demo` AND `/receive/demo2?studio=demo` → both play. Toggle `demo2` auto off → its sender closes, `test` stays live.
9. Mute visibility: muting a participant desaturates their avatar, flips their subtitle to signal-red "Muted", replaces the slot badge with a "MUTED" pill.
10. Host-over mute: host mutes Alice → Alice's VU drops to 0 in the mixer → Alice's `audioTrack.enabled` flips to false on her client.
11. Ticker scrolls smoothly at ~80 px/sec with no visible jump at the wrap.
12. Speaker rings appear around slots whose bound source is speaking with hysteresis (0.05 on / 0.025 off / 250ms hold) and no strobe at the threshold.
13. Delete scene / kick participant / remove destination all surface a danger-red confirm Dialog; focus lands on Cancel by default; Esc cancels.
14. Destinations, brand, scenes all survive a page reload (pinia-persist).
15. Operate mode auto-engages when `studio.isLive` flips on; slot chips/Clear buttons vanish on the canvas.

Items 1-15 are the happy-path Q/A checklist.

---

## Known gaps / not done

**Feature gaps** (in my recommended slice order for future sessions):

- **H3b — IA overhaul continuation**: SourcesPanel file is still named that (header reads "People") and mixes local devices + people + backstage in one column. Plan is to split into a dedicated `PeoplePanel`, promote devices to their own section, and rename `ControlsPanel` → `Inspector` with context-sensitive content (scene / slot / peer / destination inspectors) replacing the fixed tab set. Also: responsive collapse strategy for `<1280px`.
- **H4 — Broadcast trust**: `/watch/[id]` is still a hardcoded mock (needs real WebRTC receiver + chat sidebar + studio metadata). `/join/[id]` doesn't run a real device check (no self-preview, device selectors don't drive getUserMedia yet). No scene transitions in the engine (cut only; crossfade deferred). No cross-client speaking bus (host-local only). No undo ring buffer for destructive edit-mode actions. Destinations have no edit UI — remove + re-add only.
- **H5 — Content + settings**: No media library / video clip source / image source UI. No per-guest local recording (StreamYard's separate-track trick). Dashboard is hardcoded `{workshop, podcast, standup}` with fake stats. Settings page only exposes the relay URL.
- **H6 — Creative overlay depth**: H6-tick landed the per-frame update mechanism and real ticker scroll. Remaining: lower-third enter/exit animations, chat banner slide-in, countdown / now-playing / breaking-news overlay types, template packs, programmable overlays via clasp addresses, scene transition effects (crossfade/wipe/dip-to-black), Lottie/SVG.
- **Participant list in the palette**: dynamic per-peer commands ("Bring Alice on stage", "Mute Alice", etc.) aren't registered yet. Only the People panel context menu exposes these.
- **External chat adapters**: YouTube / Twitch / LinkedIn chat ingestion are Tier 2; clasp-room-only chat works today.
- **Design system standardization pass**: type-size literals (`text-[8.5px]` / `text-[9.5px]` / ~10 variants) and tracking values (~6 variants) haven't been snapped to tokens. Motion durations are mostly consistent but still have the occasional literal. See the deep UI/UX audit in the conversation history.

**Not done, not planned** (out of scope until someone needs them):

- Dark mode
- Mobile layout (<820px)
- i18n
- Server-side compositor / SFU (commoncast is deliberately a host-browser mixer)
- RTMP egress (deferred — needs FFmpeg/LVQR sidecar)
- Cloud recording
- Analytics
- Multi-workspace / team accounts

---

## Suggested next-session order

1. **H4** — real `/watch/[id]` receiver with chat sidebar + studio metadata. Moderate size, high demo value. Can piggyback on the existing `/receive/[addr]` WebRTC receive flow.
2. **H3b** — IA overhaul continuation: split `SourcesPanel` → `PeoplePanel` + local section, rename `ControlsPanel` → `Inspector`, responsive collapse. Bigger slice but the existing components mostly recompose.
3. **H6 continued** — lower-third enter/exit animation, chat banner slide-in, countdown overlay, crossfade scene transition. Each a small slice.
4. **H5** — media library, per-guest local recording, real dashboard, settings expansion.
5. **Design system polish pass** — type scale, tracking, motion standardization; Menu arrow-key nav upgrade via reka-ui `DropdownMenu`; right-click `ContextMenu` primitive.

---

## File map for quick navigation

| If you need to change… | edit this first |
|---|---|
| A design token | `packages/design-system/src/tokens/tokens.css` (+ `.ts` mirror for canvas renderer) |
| A UI primitive's variants | `packages/design-system/src/primitives/*.vue` |
| The clasp address schema | `packages/clasp-client/src/addresses.ts` (single source of truth) |
| Clasp participant entry shape | `packages/clasp-client/src/room.ts` (`ParticipantEntry`) |
| SDP/ICE signaling | `packages/clasp-client/src/room.ts` (`sendSignal` / `onSignal`) |
| How scenes render | `packages/studio-engine/src/compositor.ts` |
| Layout math / slot counts | `packages/studio-engine/src/layouts/index.ts` |
| Audio mixer graph | `packages/studio-engine/src/audio/AudioMixer.ts` |
| An overlay kind's visuals | `packages/studio-engine/src/compositor.ts` (`createOverlayNode` switch + per-kind builder) |
| An animated overlay's per-frame update | same file, return `{ container, update }` from the builder |
| Scene data / actions | `apps/web/app/stores/studio.ts` |
| Scene keyboard shortcuts | `apps/web/app/pages/studios/[id].vue` (`registerHotkey` block) |
| Command palette commands | `apps/web/app/pages/studios/[id].vue` (`staticCommands` array + scene watcher) |
| Relay URL / configurable infra | `apps/web/nuxt.config.ts` (`runtimeConfig.public.claspRelayUrl`) + `stores/prefs.ts` + `pages/settings/index.vue` |
| Broadcast output flow | `apps/web/app/composables/broadcastSender.ts` → `useBroadcastFanout.ts` → `pages/receive/[addr].vue` |
| Destinations | `apps/web/app/stores/destinations.ts` + `components/studio/DestinationsDrawer.vue` |
| Participants projection | `apps/web/app/composables/useStudioParticipants.ts` + `stores/participants.ts` |
| People panel UI | `apps/web/app/components/studio/SourcesPanel.vue` (misnamed — header reads "People") |
| Always-on mixer | `apps/web/app/components/studio/AudioMixerDock.vue` |
| Chat store / composable | `apps/web/app/stores/chat.ts` + `apps/web/app/composables/useStudioChat.ts` |
| Featured chat overlay | `apps/web/app/pages/studios/[id].vue` `renderScene()` — the `chatStore.featured` branch of the overlays array |
| Toasts | `apps/web/app/composables/useToasts.ts` + `components/ToastStack.vue` |
| Hotkeys | `apps/web/app/composables/useHotkeys.ts` (listener) + studio page `registerHotkey` calls |
| Commands / palette | `apps/web/app/composables/useCommands.ts` + `components/CommandPaletteMount.vue` |
| Confirm dialogs | `apps/web/app/composables/useConfirm.ts` + `components/ConfirmMount.vue` |
| Persistence selector | `apps/web/app/plugins/pinia-persist.client.ts` (`PERSIST` map) |

---

## Open questions for the next session

1. **Drag-to-slot or click-to-select only?** Click-to-select is shipped and works. Drag is more discoverable but is 2× more work (pointer events, preview rendering, touch, a11y). Recommend: keep click-to-select as the canonical path, add drag in H3b if there's time.
2. **Bottom mixer dock height**: currently a fixed 96px. Collapsing it to 28px (summary bar) on narrow viewports is in the H3b plan but not implemented. Decide whether to do it before or after the responsive pass.
3. **`/watch/[id]` destination resolution**: should the watch page read the studio's destinations store and pick the first `auto: true` destination? Or use a fixed `watch` destination name? Current plan favors the fixed name for simplicity.
4. **Per-guest local recording** (StreamYard's separate-track trick): Tier 2 but the biggest podcast-workflow differentiator. Plan has it in H5; could be pulled forward into H4 if someone wants it sooner.
5. **Type-scale standardization**: ~10 `text-[Npx]` literals across the codebase. Lint-ban-then-snap pass is tedious (~30 file touches) but locks the system. Schedule: end of H3b or a dedicated interstitial slice.

---

Everything is committed and pushed to `origin/main` at `f351145`. Last session: ~6 slices (H1 → H6-tick) landed. Dev server runs cleanly; `pnpm --filter @commoncast/web dev` will spin it up. Real-browser verification is the biggest outstanding risk — walk through the 15-step happy-path checklist before the next slice lands.
