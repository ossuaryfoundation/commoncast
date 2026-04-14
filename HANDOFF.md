# commoncast — Session Handoff

**Written:** 2026-04-14
**Branch:** `main`
**Last commit:** initial scaffold (this one)

Read this before touching anything. Then read [`CLAUDE.md`](CLAUDE.md) and [`README.md`](README.md).

---

## Where we are

v0 scaffold is committed but **has never been `pnpm install`-ed, never run, and never typechecked.** Everything below describes the intended shape, not verified behavior. First task next session is to install, boot, and fix whatever falls out.

The full build plan is at `~/.claude/plans/ancient-tickling-peach.md` (outside the repo). The 12 milestones described there are all "code landed" but only M1/M8/M12 are verification-clean.

Monorepo:

```
apps/web/                 Nuxt 4 SPA, ssr:false — the studio site
packages/design-system/   Vue + Tailwind v4 — tokens & components. No stores/engine/clasp.
packages/studio-engine/   Pixi v8 compositor — no Vue.
packages/clasp-client/    @clasp-to/sdk wrapper — no Vue.
docs/mockups/             HTML mockups as visual reference — frozen, do not edit.
```

Hard boundaries enforced in `eslint.config.ts`. See [`CLAUDE.md`](CLAUDE.md) §3.

---

## Absolute rules (CLAUDE.md §1)

- **Never attribute Claude — or any AI — as author or co-author on commits.**
- **No `Co-Authored-By: Claude`, no `Generated with Claude Code` footers, no `@anthropic.com` trailers.** Ever.
- The project is **commoncast**. Not stagebox, not tally. Those legacy names live only in `docs/mockups/` filenames.

---

## First-run playbook

```bash
pnpm install
# expect: workspace links apps/web → packages/*, clasp-client pulls @clasp-to/sdk
pnpm --filter @commoncast/studio-engine test   # layouts test — should pass
pnpm --filter @commoncast/clasp-client test    # addresses test — should pass
pnpm --filter @commoncast/web dev              # http://localhost:3000
```

Two-tab broadcast test (after the UI button is wired — see §"Not-yet-wired" below):

```
Tab A: /studios/demo      (studio; run publish('test'))
Tab B: /receive/test?studio=demo   (receiver; should play the composite)
```

`NUXT_PUBLIC_CLASP_RELAY_URL` overrides the default `wss://relay.clasp.to`.

---

## Audit — confirmed issues

Priority order (fix top-down before adding features).

### 🔴 Blockers for clean typecheck / build

1. **Composable return types use a pattern that doesn't resolve.**
   `Readonly<ReturnType<typeof shallowRef<X | null>>>` — `shallowRef` is overloaded, so `ReturnType<typeof shallowRef<X>>` does not give you `ShallowRef<X>`. `vue-tsc` will error on five files. Fix: import `ShallowRef`/`Ref` from `vue` and type the fields directly, or drop the explicit return interface entirely and let TS infer.
   Files: `apps/web/app/composables/{useUserMedia,useStudioRecorder,useStudioEngine,useClaspRoom,usePeerConnection}.ts`.

2. **`stores/studio.ts` `setOverlay` uses `keyof typeof this.overlays` in a parameter type.**
   `this` cannot be referenced in type positions inside Pinia options-API action signatures. `studio.ts:120`. Fix:
   ```ts
   type OverlayKey = "logo" | "lowerThird" | "ticker";
   setOverlay(key: OverlayKey, value: boolean) { this.overlays[key] = value; }
   ```

3. **Pixi v8 removed `Texture.fromURL`.**
   `packages/studio-engine/src/compositor.ts:131` — `ImageSource` branch. No UI currently adds an image source, so it's build-time only, but it's still a typecheck break. Fix:
   ```ts
   import { Assets, Sprite } from "pixi.js";
   const texture = await Assets.load(source.url);
   const sprite  = new Sprite(texture);
   ```

4. **Dead "silence the unused import" escapes.**
   - `compositor.ts` has `import { Renderer } ...` and `export type _PixiRenderer = Renderer` — delete both lines; the import isn't used.
   - `useBroadcastSender.ts` has `export type _SignalPayload = SignalPayload` — same.

5. **`@commoncast/design-system` `exports` field is strict but `apps/web/app/assets/app.css` imports `@commoncast/design-system/src/theme.css`**, which is not a declared export. Vite may or may not resolve it depending on version. Fix one of:
   ```json
   "./theme.css": "./src/theme.css"
   ```
   and update the CSS import to `@commoncast/design-system/theme.css`.

6. **ESLint devDeps missing from root `package.json`.**
   `eslint.config.ts` imports `@eslint/js`, `typescript-eslint`, `eslint-plugin-vue`, `eslint-plugin-import-x`, and `defineConfig` from `"eslint/config"`. None are in `devDependencies`. `pnpm lint` will fail. Fix: add them, or rename `eslint.config.ts` → `eslint.config.ts.disabled` and ship lint in a follow-up PR. Also confirm `defineConfig` is exported by your installed ESLint version (it's new).

### 🟡 Cosmetic / developer-ergonomics

7. **`useTimecode` returns `{ value: Ref<string> }`** which forces `{{ tc.value.value }}` in templates (see `TopToolbar.vue`). Rename the field to `display` or `formatted` and expose it plainly.

8. **`Input.vue`** uses `<script setup lang="ts" generic="T extends string | number">` but wires a raw `<input>` — the generic adds no safety and may warn under `vue-tsc`. Consider dropping the generic.

9. **Redundant explicit store imports** in `TopToolbar`/`SourcesPanel`/`ControlsPanel`/`StatusBar`/`StudioStage` — `@pinia/nuxt` auto-imports `useStudioStore` etc. from `app/stores/`. Harmless but noise.

---

## Not-yet-wired (code exists, UI/flow doesn't call it)

These are the four pieces of the MVP that are ready as composables but have no UI trigger. Next session, wire them in this order — each is a small change:

### A. Broadcast publish button (~20 lines)

`useBroadcastSender` exists; the receiver page `/receive/[addr]` works. Wire a "Broadcast" action in `TopToolbar.vue` or as a new brand-tab control:

```ts
import { useBroadcastSender } from "~/composables/useBroadcastSender";
const sender = useBroadcastSender();
// On click:
const track = engine.getOutputTrack(); // from useStudioEngine in StudioStage
if (track) await sender.publish({ studioId: studio.studioId, destAddr: "test", track });
```

The `track` lives inside `StudioStage`'s engine instance — either hoist `useStudioEngine` up into the page and pass it down, or use `provide/inject` from `StudioStage` to the toolbar. Recommend hoisting to `studios/[id].vue`.

### B. Record button → MediaRecorder → download (~30 lines)

`useStudioRecorder` exists. `TopToolbar`'s Record button currently only toggles `studio.isRecording`. Wire:

```ts
const recorder = useStudioRecorder();
watch(() => studio.isRecording, async (on) => {
  const stream = engine.getOutputStream();
  if (on && stream) recorder.start(stream);
  else if (!on) {
    const blob = await recorder.stop();
    if (blob) downloadBlob(blob, `commoncast-${Date.now()}.webm`);
  }
});
```

Same "where does `engine` live" question — hoist to `studios/[id].vue`.

### C. Guest P2P via clasp signaling (~50 lines)

`useClaspRoom` + `usePeerConnection` exist. In `studios/[id].vue`:

```ts
const room = useClaspRoom(studioId, myPid);
await room.join({ name, role: "host", stage: "live", slot: 0, muted: false });
// For each remote participant, create a pc:
const pc = usePeerConnection({
  onSignalOut: (payload) => room.sendSignal(remotePid, payload),
  onRemoteTrack: (track) => engine.addSource({ kind: "camera", id: asSourceId(remotePid), name: remotePid, track }),
});
room.onSignal((from, payload) => pc.handleSignal(payload));  // naive: one pc per remote needed
// Local media:
pc.addLocalTrack(localTrack, localStream);
await pc.createOffer();
```

The current `useClaspRoom.onSignal` returns a single subscription; the realistic design is one `RTCPeerConnection` per remote peer, keyed by `fromPid`. Either extend `useClaspRoom` to own a `Map<pid, pc>`, or lift that concern into a new `useStudioPeers` composable that composes `room` + `pc` per peer.

### D. Guest join flow on `/join/[id]`

Right now it navigates to `/studios/[id]` with a query string. Real flow: gather name + devices, call `useClaspRoom.join(..., role: "guest")`, and either render the studio in guest mode (same page, different UI chrome) or redirect post-join.

---

## Verified / safe

- **Design system tokens + primitives**: full token set from mockups, ten primitives + seven studio components, all props-in/events-out, no store imports. Ready for Histoire stories.
- **Layouts math** (`packages/studio-engine/src/layouts/index.ts`): six layouts as pure functions, all under test, all rects stay within canvas bounds.
- **Clasp address schema** (`packages/clasp-client/src/addresses.ts`): single source of truth, under test.
- **Pinia stores** (minus the one type bug in §2): `studio`, `participants`, `prefs` with sane defaults from the mockups.
- **Nuxt plugin** `plugins/clasp.client.ts` provides `$clasp` lazily (dynamic `import("@clasp-to/sdk")` — safe to reference from SSR-pathways even though `ssr:false`).

---

## Known unknowns

- **`@clasp-to/sdk` exact surface.** The adapter in `packages/clasp-client/src/client.ts` is built from CLASP-QuickRef.md and the SDK's TypeScript source I read during research — it *should* match `clasp@4.5.0`. If the real SDK differs (method renames, different default export shape, async init semantics), **every divergence lands in that one file** — the rest of commoncast never imports `@clasp-to/sdk` directly. That isolation is intentional.

- **Pixi v8 WebGPU fallback paths.** `compositor.ts` passes `preference: "webgpu"` to `Application.init`. Pixi's auto-fallback to WebGL2 is documented but untested here.

- **`canvas.captureStream(30)` performance at 1080p60.** Plan targets 30fps; if you push 60 you may hit main-thread issues before any Pixi budget is consumed — profile before optimising.

- **HMR + Pixi GPU context leaks.** `useStudioEngine` wires `import.meta.hot?.dispose` → `engine.destroy()`. Watch for "too many WebGL contexts" warnings on long HMR sessions — if they appear, it means dispose isn't being called somewhere.

---

## File map for quick navigation

| If you need to change… | edit this first |
|---|---|
| A visual token | `packages/design-system/src/tokens/tokens.css` + `.ts` (keep in sync) |
| A UI primitive's variants | `packages/design-system/src/primitives/*.vue` |
| The clasp address schema | `packages/clasp-client/src/addresses.ts` (one file, all consumers go through it) |
| SDP/ICE signaling | `packages/clasp-client/src/room.ts` + `apps/web/app/composables/usePeerConnection.ts` |
| How scenes render | `packages/studio-engine/src/compositor.ts` |
| Scene data / F1–F5 shortcuts | `apps/web/app/stores/studio.ts` + `apps/web/app/pages/studios/[id].vue` |
| Relay URL / configurable infra | `apps/web/nuxt.config.ts` (`runtimeConfig.public.claspRelayUrl`) + `apps/web/app/stores/prefs.ts` + `apps/web/app/pages/settings/index.vue` |
| Broadcast output flow | `apps/web/app/composables/useBroadcastSender.ts` → `apps/web/app/pages/receive/[addr].vue` |

---

## Suggested next-session order

1. `pnpm install` + fix whatever breaks (expect issues §1–6).
2. `pnpm --filter @commoncast/web dev` → open `/studios/demo`, grant camera, verify the Pixi canvas renders your camera with overlays.
3. Hoist `useStudioEngine` into `studios/[id].vue` and `provide` it; then wire (A) Broadcast button and (B) Record button from §"Not-yet-wired".
4. Two-tab broadcast test: A publishes, B at `/receive/test?studio=demo` plays.
5. Implement §C one-pc-per-peer properly in a new `useStudioPeers` composable; two-tab guest/host test.
6. Histoire stories for the design system (M2 leftover).
7. Playwright E2E with `--use-fake-device-for-media-stream`.
