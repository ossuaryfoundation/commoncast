/**
 * useConfirm — imperative confirmation dialog API.
 *
 * Lets any composable or component ask the user for a yes/no with a
 * single awaited call:
 *
 *   const confirm = useConfirm();
 *   if (!(await confirm.ask({
 *     title: "Remove Alice from the studio?",
 *     description: "They'll be disconnected from the room.",
 *     danger: true,
 *     confirmLabel: "Remove",
 *   }))) return;
 *   await participants.kick(pid);
 *
 * Backed by a module-level singleton: at most one confirm dialog is
 * pending at a time. Asking a second one while one is pending
 * auto-rejects the previous pending promise with `false` (covers
 * rapid double-clicks; the user's most recent intent wins).
 *
 * A single ConfirmMount.vue mounted in layouts/studio.vue watches
 * `pending` and renders the DS Dialog when it's non-null.
 */
import { ref, type Ref } from "vue";

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /**
   * When true, the confirm button is rendered in signal-red as a
   * destructive action. Also shifts initial focus to Cancel instead
   * of Confirm.
   */
  danger?: boolean;
}

export interface PendingConfirm extends ConfirmOptions {
  id: string;
  resolve(answer: boolean): void;
}

const pending = ref<PendingConfirm | null>(null);
let seq = 0;

function rejectCurrent(): void {
  const p = pending.value;
  if (!p) return;
  pending.value = null;
  p.resolve(false);
}

function ask(opts: ConfirmOptions): Promise<boolean> {
  // Clear any stale pending confirm first.
  rejectCurrent();
  return new Promise<boolean>((resolve) => {
    pending.value = {
      id: `confirm-${++seq}`,
      resolve,
      ...opts,
    };
  });
}

function respond(ok: boolean): void {
  const p = pending.value;
  if (!p) return;
  pending.value = null;
  p.resolve(ok);
}

export interface UseConfirmReturn {
  readonly pending: Readonly<Ref<PendingConfirm | null>>;
  ask(opts: ConfirmOptions): Promise<boolean>;
  respond(ok: boolean): void;
}

export function useConfirm(): UseConfirmReturn {
  return { pending, ask, respond };
}
