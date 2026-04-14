# commoncast — Rules for AI assistants (Claude, etc.)

These rules are binding for any AI assistant working in this repository.

## 1. Never attribute Claude as an author

**Never, under any circumstances, attribute Claude — or any other AI assistant — as the author or co-author of a commit in this repository.**

Specifically:

- **Do not** add `Co-Authored-By: Claude …` trailers to commit messages.
- **Do not** add any `Co-Authored-By: …@anthropic.com` trailer.
- **Do not** add any `Generated with …` / "🤖 Generated with Claude Code" footer, marker, badge, or similar phrasing to commit messages, PR descriptions, or file headers.
- **Do not** set the git `user.name` / `user.email` to Claude, Anthropic, or any AI identifier. Never run `git config` to change author/committer identity. Always commit as the human user whose workstation is running.
- **Do not** amend existing commits to insert such attribution.
- **Do not** add AI attribution to file headers, code comments, README badges, `AUTHORS` files, `package.json` `author` fields, license notices, or any other form of project metadata.

If a commit template, hook, or tool tries to insert such attribution automatically, strip it before committing.

The author of every commit in this repository is the human developer. That is the only correct answer.

## 2. The project is named `commoncast`

The project is **commoncast** (lowercase one word, or "CommonCast" when used as a display name).

- Do **not** reintroduce the legacy names `stagebox` or `tally` anywhere in code, filenames, packages, class names, UI strings, docs, or commits. Those names appear only in `docs/mockups/` because those files are historical mockups kept as visual reference.
- Package names live under the `@commoncast/*` npm scope.
- The tagline is "Broadcasting for the commons."

## 3. Architectural guardrails

These rules exist because the project is a Vue/Nuxt monorepo with a strict separation between UI, engine, and transport. Breaking them causes cascading refactors.

- `packages/design-system` **must not** import from `packages/studio-engine`, `packages/clasp-client`, or any Pinia store / composable. It is pure presentational Vue — props in, events out.
- `packages/studio-engine` and `packages/clasp-client` **must not** import `vue` or `@vue/*`. They are framework-agnostic TypeScript.
- `apps/web` is the only place that wires stores, composables, engine, and clasp-client together.
- Never put a live `MediaStream`, `MediaStreamTrack`, or `RTCPeerConnection` inside a `reactive()` or deeply-reactive Pinia state. Use `shallowRef` (or plain module state inside a composable) and expose derived primitives (`isMuted`, `isConnected`, `bitrateKbps`, …) as the reactive surface.
- Every composable that acquires media, GPU, or network resources must release them in `onScopeDispose` **and** in `import.meta.hot?.dispose(...)` for HMR safety.
- Nuxt stays `ssr: false`. Do not enable SSR. Browser-only APIs (clasp client, WebRTC, canvas capture, WebGPU) must stay in `.client.ts` files or inside `onMounted` guards.

## 4. Mockups are reference, not source

The files in `docs/mockups/` are HTML mockups kept as visual source-of-truth for the design system and studio layout. **Do not edit them.** If the visual design changes, update the real Vue components and, if useful, update the mockup to match — but treat them as frozen references by default.

## 5. When in doubt, ask

If a rule here conflicts with a user instruction in the conversation, follow the user instruction in the conversation — but **rule 1 (no Claude authorship on commits) is absolute and is never overridden**.
