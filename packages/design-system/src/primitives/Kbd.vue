<!--
  commoncast / Kbd — keyboard-hint pill. Shows a shortcut key next to an
  action. Visual language: DM Mono, tiny, tight tracking, single-border
  rectangle. Never interactive — use a Button for that.
-->
<template>
  <span
    class="inline-flex min-w-[14px] items-center justify-center border border-[color:var(--cc-border-strong)] bg-[var(--cc-chalk-warm)] px-[4px] py-px font-ui text-[8.5px] uppercase tracking-[0.1em] leading-none text-[var(--cc-ink-muted)]"
  >
    <slot />
  </span>
</template>
