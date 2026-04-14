/**
 * useStageSelection — which slot of the stage is currently selected,
 * plus the stage's display mode (edit vs operate).
 *
 * - `slot`: the index of the currently-selected slot for source binding,
 *   or null. Used by the Inventory panel to route "click a source"
 *   → "assign to that slot".
 * - `mode`: "edit" (default) shows slot chips, empty placeholders, and
 *   clear buttons; "operate" hides them so the live program canvas
 *   isn't cluttered during a broadcast. The studio page auto-switches
 *   to "operate" when studio.isLive flips on and back to "edit" when
 *   it flips off; users can also toggle manually via the stage header.
 */
import { ref, readonly, type Ref, type DeepReadonly } from "vue";

export type StageMode = "edit" | "operate";

export interface UseStageSelectionReturn {
  readonly slot: DeepReadonly<Ref<number | null>>;
  readonly mode: DeepReadonly<Ref<StageMode>>;
  selectSlot(index: number | null): void;
  toggleSlot(index: number): void;
  clear(): void;
  setMode(next: StageMode): void;
  toggleMode(): void;
}

export function useStageSelection(): UseStageSelectionReturn {
  const slot = ref<number | null>(null);
  const mode = ref<StageMode>("edit");

  function selectSlot(index: number | null): void {
    slot.value = index;
  }
  function toggleSlot(index: number): void {
    slot.value = slot.value === index ? null : index;
  }
  function clear(): void {
    slot.value = null;
  }
  function setMode(next: StageMode): void {
    mode.value = next;
    if (next === "operate") slot.value = null;
  }
  function toggleMode(): void {
    setMode(mode.value === "edit" ? "operate" : "edit");
  }

  return {
    slot: readonly(slot),
    mode: readonly(mode),
    selectSlot,
    toggleSlot,
    clear,
    setMode,
    toggleMode,
  };
}
