<!--
  commoncast / CommandPalette — ⌘K palette primitive.

  Presentational only: consumers pass an array of commands, the
  palette renders a search input + filtered, grouped list. Fuzzy
  match on label + description + keywords + category. Arrow keys
  navigate, Enter runs, Esc closes via the inner Dialog. Mouse
  hover follows the keyboard selection.

  The command palette is the single most important keyboard surface
  in commoncast — every action a registered composable exposes ends
  up here. It's the differentiator against StreamYard, which has no
  equivalent.
-->
<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
} from "reka-ui";

export interface PaletteCommand {
  id: string;
  label: string;
  description?: string;
  category: string;
  keys?: string;
  keywords?: string[];
  when?: () => boolean;
  action: () => void | Promise<void>;
}

const open = defineModel<boolean>("open", { default: false });

const props = defineProps<{
  commands: ReadonlyArray<PaletteCommand>;
}>();

const query = ref("");
const selectedIndex = ref(0);
const inputRef = ref<HTMLInputElement | null>(null);

const available = computed(() =>
  props.commands.filter((c) => !c.when || c.when()),
);

function score(cmd: PaletteCommand, q: string): number {
  if (!q) return 1;
  const hay = `${cmd.label} ${cmd.description ?? ""} ${cmd.category} ${(
    cmd.keywords ?? []
  ).join(" ")}`.toLowerCase();
  const needle = q.toLowerCase();
  // Exact substring wins
  const idx = hay.indexOf(needle);
  if (idx >= 0) {
    // Earlier matches score higher, label-start even more
    const labelIdx = cmd.label.toLowerCase().indexOf(needle);
    if (labelIdx === 0) return 100;
    if (labelIdx > 0) return 50 - labelIdx;
    return 20 - idx;
  }
  // Fuzzy: every needle char appears in order in hay
  let i = 0;
  for (const ch of hay) {
    if (ch === needle[i]) i++;
    if (i === needle.length) return 5;
  }
  return 0;
}

const filtered = computed(() => {
  const q = query.value.trim();
  return available.value
    .map((c) => ({ cmd: c, score: score(c, q) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.cmd)
    .slice(0, 25);
});

const grouped = computed(() => {
  const byCat = new Map<string, PaletteCommand[]>();
  for (const c of filtered.value) {
    let arr = byCat.get(c.category);
    if (!arr) {
      arr = [];
      byCat.set(c.category, arr);
    }
    arr.push(c);
  }
  return Array.from(byCat.entries());
});

watch(open, async (isOpen) => {
  if (isOpen) {
    query.value = "";
    selectedIndex.value = 0;
    await nextTick();
    inputRef.value?.focus();
  }
});

watch(filtered, (next) => {
  if (selectedIndex.value >= next.length) {
    selectedIndex.value = Math.max(0, next.length - 1);
  }
});

function onKeydown(e: KeyboardEvent) {
  if (e.key === "ArrowDown") {
    e.preventDefault();
    selectedIndex.value = Math.min(
      filtered.value.length - 1,
      selectedIndex.value + 1,
    );
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    selectedIndex.value = Math.max(0, selectedIndex.value - 1);
  } else if (e.key === "Enter") {
    e.preventDefault();
    void run(filtered.value[selectedIndex.value]);
  }
}

async function run(cmd: PaletteCommand | undefined) {
  if (!cmd) return;
  open.value = false;
  try {
    await cmd.action();
  } catch (err) {
    // Intentional: the palette primitive stays pure. Error telemetry
    // is the consumer's responsibility (wrap action in a try/toast
    // at registration time).
    // eslint-disable-next-line no-console
    console.error("[commoncast] command action failed", cmd.id, err);
  }
}

function isSelected(cmd: PaletteCommand): boolean {
  return filtered.value[selectedIndex.value]?.id === cmd.id;
}
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-[75] bg-[var(--cc-soot)]/60 backdrop-blur-[1px]" />
      <DialogContent
        class="fixed left-1/2 top-[18vh] z-[76] flex w-[580px] max-w-[92vw] -translate-x-1/2 flex-col border border-[color:var(--cc-border-strong)] bg-[var(--cc-chalk)] shadow-[var(--cc-shadow-lg)] focus:outline-none"
      >
        <DialogTitle class="sr-only">Command palette</DialogTitle>

        <!-- Search row -->
        <div class="flex items-center gap-2 border-b border-[color:var(--cc-border)] bg-[var(--cc-chalk-warm)] px-4 py-3">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden class="text-[var(--cc-ink-muted)]">
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" stroke-width="1.5" />
            <path d="M9.5 9.5 L13 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
          <input
            ref="inputRef"
            v-model="query"
            type="text"
            placeholder="Type a command…"
            class="min-w-0 flex-1 border-0 bg-transparent font-body text-[15px] text-[var(--cc-ink)] placeholder:text-[var(--cc-ink-ghost)] focus:outline-none"
            @keydown="onKeydown"
          />
          <span class="shrink-0 border border-[color:var(--cc-border-strong)] bg-[var(--cc-chalk)] px-1.5 py-[1px] font-ui text-[8.5px] uppercase tracking-[0.12em] text-[var(--cc-ink-muted)]">
            ⌘K
          </span>
        </div>

        <!-- Results -->
        <div class="max-h-[420px] min-h-[120px] overflow-y-auto py-1">
          <div
            v-if="filtered.length === 0"
            class="flex h-[120px] items-center justify-center px-4 text-center font-ui text-[10px] uppercase tracking-[0.12em] text-[var(--cc-ink-ghost)]"
          >
            {{ query ? "No matching commands" : "No commands registered" }}
          </div>
          <template v-for="[category, items] in grouped" :key="category">
            <div
              class="flex items-center gap-2 px-4 pt-3 pb-1 font-ui text-[8.5px] uppercase tracking-[0.14em] text-[var(--cc-ink-ghost)]"
            >
              {{ category }}
              <span class="h-px flex-1 bg-[var(--cc-border)]" />
            </div>
            <button
              v-for="cmd in items"
              :key="cmd.id"
              type="button"
              class="flex w-full items-center justify-between gap-4 px-4 py-2 text-left transition-colors"
              :class="
                isSelected(cmd)
                  ? 'bg-[var(--cc-chalk-warm)] shadow-[inset_3px_0_0_0_var(--cc-signal)]'
                  : 'hover:bg-[var(--cc-chalk-warm)]'
              "
              @click="run(cmd)"
              @mouseenter="selectedIndex = filtered.indexOf(cmd)"
            >
              <span class="flex min-w-0 flex-col">
                <span class="truncate font-body text-[13px] font-semibold text-[var(--cc-ink)]">
                  {{ cmd.label }}
                </span>
                <span
                  v-if="cmd.description"
                  class="truncate font-ui text-[9px] uppercase tracking-[0.1em] text-[var(--cc-ink-muted)]"
                >
                  {{ cmd.description }}
                </span>
              </span>
              <span
                v-if="cmd.keys"
                class="shrink-0 border border-[color:var(--cc-border-strong)] bg-[var(--cc-chalk)] px-1.5 py-[1px] font-ui text-[8px] uppercase tracking-[0.1em] text-[var(--cc-ink-muted)]"
              >
                {{ cmd.keys }}
              </span>
            </button>
          </template>
        </div>

        <!-- Footer hints -->
        <div class="flex items-center gap-4 border-t border-[color:var(--cc-border)] bg-[var(--cc-chalk-warm)] px-4 py-2 font-ui text-[8.5px] uppercase tracking-[0.12em] text-[var(--cc-ink-muted)]">
          <span class="flex items-center gap-1">
            <span class="border border-[color:var(--cc-border-strong)] bg-[var(--cc-chalk)] px-1 leading-none">↑↓</span>
            Navigate
          </span>
          <span class="flex items-center gap-1">
            <span class="border border-[color:var(--cc-border-strong)] bg-[var(--cc-chalk)] px-1 leading-none">↵</span>
            Run
          </span>
          <span class="ml-auto flex items-center gap-1">
            <span class="border border-[color:var(--cc-border-strong)] bg-[var(--cc-chalk)] px-1 leading-none">Esc</span>
            Close
          </span>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
