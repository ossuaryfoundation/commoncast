/**
 * useHotkeys — module-level global keyboard shortcut registry.
 *
 * One window-level keydown listener is installed lazily on first use;
 * every registered hotkey routes through it. The listener matches a
 * normalized key signature (e.g. "cmd+k", "shift+?", "f2") against
 * each hotkey's `keys` field.
 *
 * Form-field protection: by default, hotkeys are suppressed when an
 * `<input>`, `<textarea>`, `<select>`, or contenteditable has focus.
 * A hotkey can opt into firing inside form fields with `global: true`
 * — that's what the command palette uses (`cmd+k` should always work).
 *
 * Per-hotkey `when` gate lets callers disable a shortcut without
 * unregistering it ("Go Live" and "Stop broadcast" can share key `g`
 * because each gates on studio.isLive).
 *
 * CLAUDE.md §3 compliance: zero live media here. Pure closure state
 * and a window listener.
 */
import { onScopeDispose, ref, type Ref } from "vue";

export interface Hotkey {
  id: string;
  keys: string;
  label: string;
  category?: string;
  action: (e: KeyboardEvent) => void | Promise<void>;
  /** Optional gate: if false, the hotkey is ignored this press. */
  when?: () => boolean;
  /**
   * If true, the hotkey fires even when a form field has focus.
   * Default false — use sparingly (only ⌘K should need this).
   */
  global?: boolean;
}

const hotkeys = ref<Map<string, Hotkey>>(new Map());
let listenerInstalled = false;

/** Normalize a KeyboardEvent into a canonical signature like "cmd+shift+k". */
function normalize(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.metaKey || e.ctrlKey) parts.push("cmd");
  if (e.shiftKey) parts.push("shift");
  if (e.altKey) parts.push("alt");
  // Function keys, arrows, etc. come through as "F1", "ArrowDown", etc.
  // Normalize to lowercase for simpler matching.
  let key = e.key.toLowerCase();
  // A shifted "/" on a US keyboard emits "?" as e.key; keep that mapping
  // so callers can register "?" directly without the shift modifier.
  if (key === "?") {
    // Drop shift from the modifiers so "?" alone matches.
    const withoutShift = parts.filter((p) => p !== "shift");
    return withoutShift.length > 0
      ? `${withoutShift.join("+")}+?`
      : "?";
  }
  parts.push(key);
  return parts.join("+");
}

function isFormField(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

function handleKey(e: KeyboardEvent): void {
  const pressed = normalize(e);
  const inForm = isFormField(e.target);
  for (const hk of hotkeys.value.values()) {
    if (hk.keys !== pressed) continue;
    if (inForm && !hk.global) continue;
    if (hk.when && !hk.when()) continue;
    e.preventDefault();
    void hk.action(e);
    return;
  }
}

function ensureListener(): void {
  if (listenerInstalled || typeof window === "undefined") return;
  listenerInstalled = true;
  window.addEventListener("keydown", handleKey);
}

if (typeof import.meta !== "undefined" && import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (typeof window !== "undefined") {
      window.removeEventListener("keydown", handleKey);
    }
    listenerInstalled = false;
    hotkeys.value = new Map();
  });
}

export interface UseHotkeysReturn {
  readonly all: Readonly<Ref<Map<string, Hotkey>>>;
  register(hk: Hotkey): () => void;
  unregister(id: string): void;
}

export function useHotkeys(): UseHotkeysReturn {
  ensureListener();

  const ownIds = new Set<string>();

  function register(hk: Hotkey): () => void {
    const next = new Map(hotkeys.value);
    next.set(hk.id, hk);
    hotkeys.value = next;
    ownIds.add(hk.id);
    return () => unregister(hk.id);
  }

  function unregister(id: string): void {
    if (!hotkeys.value.has(id)) return;
    const next = new Map(hotkeys.value);
    next.delete(id);
    hotkeys.value = next;
    ownIds.delete(id);
  }

  onScopeDispose(() => {
    if (ownIds.size === 0) return;
    const next = new Map(hotkeys.value);
    for (const id of ownIds) next.delete(id);
    hotkeys.value = next;
    ownIds.clear();
  });

  return {
    all: hotkeys,
    register,
    unregister,
  };
}
