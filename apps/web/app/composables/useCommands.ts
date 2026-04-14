/**
 * useCommands — module-level command registry that backs the
 * ⌘K palette.
 *
 * Commands are the discoverable-action layer of commoncast. Every
 * composable that owns a meaningful action (participants, destinations,
 * chat, scene editor, recorder, broadcast fanout) can register one or
 * more commands here; the palette renders them all and the user can
 * fuzzy-search across every action in the studio without memorizing
 * a hotkey.
 *
 * Commands and hotkeys are related but not equivalent:
 *   - A command may have no keyboard shortcut (discoverable via palette)
 *   - A hotkey may not have a palette entry (low-level direct action)
 *   - Commands registered with `keys` also get their shortcut rendered
 *     in the palette and in tooltips
 *
 * Keep the shape of `Command` in sync with `PaletteCommand` from the
 * design system. This file re-exports that type for convenience so
 * callers don't have to cross package boundaries.
 */
import { onScopeDispose, ref, type Ref } from "vue";
import type { PaletteCommand } from "@commoncast/design-system";

export type Command = PaletteCommand;

const commands = ref<Command[]>([]);

function replaceAll(next: Command[]): void {
  commands.value = next;
}

export interface UseCommandsReturn {
  readonly commands: Readonly<Ref<Command[]>>;
  register(cmd: Command | Command[]): () => void;
  unregister(id: string | string[]): void;
}

export function useCommands(): UseCommandsReturn {
  const ownIds = new Set<string>();

  function register(cmdOrList: Command | Command[]): () => void {
    const incoming = Array.isArray(cmdOrList) ? cmdOrList : [cmdOrList];
    const incomingIds = new Set(incoming.map((c) => c.id));
    // Replace any command with the same id; preserve order for new ones.
    const kept = commands.value.filter((c) => !incomingIds.has(c.id));
    replaceAll([...kept, ...incoming]);
    for (const c of incoming) ownIds.add(c.id);
    return () => {
      unregister(incoming.map((c) => c.id));
    };
  }

  function unregister(idOrList: string | string[]): void {
    const ids = Array.isArray(idOrList) ? idOrList : [idOrList];
    const idSet = new Set(ids);
    replaceAll(commands.value.filter((c) => !idSet.has(c.id)));
    for (const id of ids) ownIds.delete(id);
  }

  onScopeDispose(() => {
    if (ownIds.size === 0) return;
    const idSet = new Set(ownIds);
    replaceAll(commands.value.filter((c) => !idSet.has(c.id)));
    ownIds.clear();
  });

  return {
    commands,
    register,
    unregister,
  };
}

if (typeof import.meta !== "undefined" && import.meta.hot) {
  import.meta.hot.dispose(() => {
    commands.value = [];
  });
}
