<!--
  ShortcutsDialog — `?` keyboard help.

  Reads the global hotkey registry, groups by category, renders each
  as a row with its label + pretty keys. Toggled open via a registered
  hotkey (`?`) that fires outside form fields. Lives in layouts/studio.vue
  alongside CommandPaletteMount.
-->
<script setup lang="ts">
import { computed, ref } from "vue";
import { Dialog } from "@commoncast/design-system";
import { useHotkeys, type Hotkey } from "~/composables/useHotkeys";

const open = ref(false);
const { all, register } = useHotkeys();

register({
  id: "system.shortcuts.open",
  keys: "?",
  label: "Show keyboard shortcuts",
  category: "System",
  action: () => {
    open.value = true;
  },
});

interface Group {
  category: string;
  items: Hotkey[];
}

const grouped = computed<Group[]>(() => {
  const byCat = new Map<string, Hotkey[]>();
  for (const hk of all.value.values()) {
    const cat = hk.category ?? "Other";
    let list = byCat.get(cat);
    if (!list) {
      list = [];
      byCat.set(cat, list);
    }
    list.push(hk);
  }
  const order = ["System", "Broadcast", "Stage", "Scenes", "People", "Chat", "Other"];
  return order
    .map((category) => ({
      category,
      items: (byCat.get(category) ?? []).sort((a, b) => a.label.localeCompare(b.label)),
    }))
    .filter((g) => g.items.length > 0);
});

function prettyKeys(keys: string): string {
  return keys
    .split("+")
    .map((k) => {
      if (k === "cmd") return "⌘";
      if (k === "shift") return "⇧";
      if (k === "alt") return "⌥";
      if (/^f\d+$/.test(k)) return k.toUpperCase();
      return k.toUpperCase();
    })
    .join(" ");
}
</script>

<template>
  <Dialog
    v-model:open="open"
    title="Keyboard shortcuts"
    description="Every registered shortcut for this studio"
    width="520px"
  >
    <div class="flex flex-col gap-5">
      <section v-for="group in grouped" :key="group.category" class="flex flex-col gap-2">
        <h3
          class="flex items-center gap-2 font-ui text-[9px] uppercase tracking-[0.14em] text-[var(--cc-ink-muted)]"
        >
          {{ group.category }}
          <span class="h-px flex-1 bg-[var(--cc-border)]" />
        </h3>
        <div
          v-for="hk in group.items"
          :key="hk.id"
          class="flex items-center justify-between gap-4 py-1"
        >
          <span class="font-body text-[13px] text-[var(--cc-ink)]">{{ hk.label }}</span>
          <span
            class="shrink-0 border border-[color:var(--cc-border-strong)] bg-[var(--cc-chalk-warm)] px-1.5 py-[1px] font-ui text-[9px] uppercase tracking-[0.1em] text-[var(--cc-ink-muted)]"
          >
            {{ prettyKeys(hk.keys) }}
          </span>
        </div>
      </section>
    </div>
  </Dialog>
</template>
