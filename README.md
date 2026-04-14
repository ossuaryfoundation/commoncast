# commoncast

> Broadcasting for the commons.

An open-source, browser-based live production studio: multi-guest P2P audio/video rooms, canvas compositing with branding overlays, scene presets, recording, and one-to-one composited broadcast output — all built on [clasp](https://github.com/lumencanvas/clasp) for signaling/state and WebRTC for media.

## Status

Early scaffold. See [`docs/mockups/`](docs/mockups) for the visual source-of-truth and the build plan for what is being implemented.

## Stack

- **Nuxt 4** SPA (`ssr: false`)
- **Vue 3.5** + TypeScript (strict)
- **Tailwind v4** + Reka UI + Nuxt UI v3
- **Pinia** for durable state, composables for ephemeral media
- **PixiJS v8** (WebGPU / WebGL2) for canvas compositing
- **[@clasp-to/sdk](https://www.npmjs.com/package/@clasp-to/sdk)** for signaling + state
- **Vitest** (browser mode, Playwright provider) + **Playwright** E2E + **Histoire**

## Monorepo layout

```
apps/
  web/                    # Nuxt 4 SPA — the studio site
packages/
  design-system/          # tokens + Vue components. No studio logic, no stores.
  studio-engine/          # PixiJS v8 compositor. No Vue.
  clasp-client/           # @clasp-to/sdk wrapper. No Vue.
docs/
  mockups/                # HTML mockups kept as visual reference — do not edit
```

Hard boundary rules are enforced in ESLint; see [`CLAUDE.md`](CLAUDE.md).

## Develop

```bash
pnpm install
pnpm dev          # runs apps/web
pnpm build        # turbo build graph
pnpm test         # vitest + playwright
pnpm typecheck    # vue-tsc across the workspace
pnpm lint
```

## Configuration

The clasp relay URL is configurable. Default is `wss://relay.clasp.to`. Override per-environment:

```bash
NUXT_PUBLIC_CLASP_RELAY_URL=wss://relay.example.com pnpm dev
```

Or edit the relay URL in the Settings page of the running app.

## Contributing

Read [`CLAUDE.md`](CLAUDE.md). In particular:

- **Never** attribute Claude (or any AI) as an author or co-author on commits.
- Respect the package boundaries (`design-system` ↛ `studio-engine` / `clasp-client` / stores).
- Never put a live `MediaStream` in `reactive()` or Pinia state. Use `shallowRef`.

## License

Apache-2.0. See [`LICENSE`](LICENSE).
