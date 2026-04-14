/**
 * useToasts — module-level toast bus.
 *
 * Singleton: every caller sees the same queue, so composables can
 * `useToasts()` from any scope (including inside onScopeDispose
 * cleanups) without tripping the Vue current-instance check. The state
 * lives in a plain module-level ref. The UI layer (ToastStack.vue)
 * reads `items` reactively and renders one DS Toast per entry.
 *
 * API:
 *   toasts.info({ title, description?, action?, timeout? })
 *   toasts.success(...)
 *   toasts.warn(...)
 *   toasts.error(...)
 *   toasts.dismiss(id)
 *   toasts.clear()
 *
 * Defaults per kind:
 *   info     4000 ms
 *   success  4000 ms
 *   warn     6000 ms
 *   error    8000 ms   (errors sit longer; user probably needs to read them)
 *
 * Passing `timeout: 0` pins a toast indefinitely — use sparingly.
 *
 * If the queue exceeds MAX_VISIBLE, the oldest is quietly dropped.
 */
import { ref, type Ref } from "vue";
import type { ToastKind } from "@commoncast/design-system";

export interface ToastAction {
  label: string;
  onClick: () => void | Promise<void>;
}

export interface ToastItem {
  id: string;
  kind: ToastKind;
  title: string;
  description?: string;
  action?: ToastAction;
  timeout: number;
}

export type ToastOptions = {
  title: string;
  description?: string;
  action?: ToastAction;
  /** Auto-dismiss delay in ms. 0 = pinned. Undefined = per-kind default. */
  timeout?: number;
};

const MAX_VISIBLE = 5;
const DEFAULT_TIMEOUT: Record<ToastKind, number> = {
  info: 4000,
  success: 4000,
  warn: 6000,
  error: 8000,
};

const items = ref<ToastItem[]>([]);
const timers = new Map<string, ReturnType<typeof setTimeout>>();
let seq = 0;

function push(kind: ToastKind, opts: ToastOptions): string {
  const id = `t-${++seq}`;
  const timeout = opts.timeout ?? DEFAULT_TIMEOUT[kind];
  const item: ToastItem = {
    id,
    kind,
    title: opts.title,
    description: opts.description,
    action: opts.action,
    timeout,
  };
  let next = [...items.value, item];
  if (next.length > MAX_VISIBLE) {
    const dropped = next.slice(0, next.length - MAX_VISIBLE);
    for (const d of dropped) {
      const t = timers.get(d.id);
      if (t) clearTimeout(t);
      timers.delete(d.id);
    }
    next = next.slice(-MAX_VISIBLE);
  }
  items.value = next;
  if (timeout > 0) {
    const t = setTimeout(() => dismiss(id), timeout);
    timers.set(id, t);
  }
  return id;
}

function dismiss(id: string): void {
  const t = timers.get(id);
  if (t) clearTimeout(t);
  timers.delete(id);
  items.value = items.value.filter((i) => i.id !== id);
}

function clear(): void {
  for (const t of timers.values()) clearTimeout(t);
  timers.clear();
  items.value = [];
}

export interface UseToastsReturn {
  readonly items: Readonly<Ref<ToastItem[]>>;
  info(opts: ToastOptions): string;
  success(opts: ToastOptions): string;
  warn(opts: ToastOptions): string;
  error(opts: ToastOptions): string;
  dismiss(id: string): void;
  clear(): void;
}

export function useToasts(): UseToastsReturn {
  return {
    items,
    info: (opts) => push("info", opts),
    success: (opts) => push("success", opts),
    warn: (opts) => push("warn", opts),
    error: (opts) => push("error", opts),
    dismiss,
    clear,
  };
}
