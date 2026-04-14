/**
 * useStageSelection — which slot of the stage is currently selected.
 *
 * Tiny composable on purpose. The studio page instantiates one and provides
 * it to children via injection so the StudioStage (which renders the numbered
 * slot overlay) and the Inventory panel (which resolves clicks into
 * assignments) share the same selection state.
 */
import { ref, readonly, type Ref, type DeepReadonly } from "vue";

export interface UseStageSelectionReturn {
  readonly slot: DeepReadonly<Ref<number | null>>;
  selectSlot(index: number | null): void;
  toggleSlot(index: number): void;
  clear(): void;
}

export function useStageSelection(): UseStageSelectionReturn {
  const slot = ref<number | null>(null);

  function selectSlot(index: number | null): void {
    slot.value = index;
  }
  function toggleSlot(index: number): void {
    slot.value = slot.value === index ? null : index;
  }
  function clear(): void {
    slot.value = null;
  }

  return { slot: readonly(slot), selectSlot, toggleSlot, clear };
}
