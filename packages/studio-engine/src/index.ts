/**
 * @commoncast/studio-engine — public API
 *
 * Framework-agnostic TypeScript. Never imports vue.
 */

export * from "./types.js";
export { computeLayout } from "./layouts/index.js";
export { createCameraSource } from "./sources/CameraSource.js";
export type { CameraSourceHandle } from "./sources/CameraSource.js";
export {
  createCompositor,
  type Compositor,
  type CreateCompositorOptions,
} from "./compositor.js";
