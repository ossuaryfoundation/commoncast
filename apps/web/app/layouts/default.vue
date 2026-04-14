<script setup lang="ts">
</script>

<template>
  <div class="flex min-h-full flex-col">
    <header
      class="flex h-11 items-center border-b border-[var(--cc-soot-mid)] bg-[var(--cc-soot)] px-5"
    >
      <NuxtLink to="/" class="flex items-center gap-2 font-ui text-[12px] uppercase tracking-wider text-[var(--cc-chalk)]">
        <span
          class="h-2 w-2 rounded-full bg-[var(--cc-signal)]"
          style="animation: cc-pulse-dot 2s ease infinite"
        />
        commoncast
      </NuxtLink>
      <nav class="ml-auto flex items-center gap-5 font-ui text-[10px] uppercase text-[var(--cc-ink-whisper)]">
        <NuxtLink to="/" class="hover:text-[var(--cc-chalk)]">Dashboard</NuxtLink>
        <NuxtLink to="/settings" class="hover:text-[var(--cc-chalk)]">Settings</NuxtLink>
      </nav>
    </header>
    <main class="flex-1">
      <slot />
    </main>
  </div>
</template>
