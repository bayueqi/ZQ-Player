<template>
  <Provider v-if="!isDesktopLyric">
    <router-view />
  </Provider>
  <router-view v-else />
  <Analytics />
</template>

<script setup lang="ts">
import { Analytics } from "@vercel/analytics/vue";

const isDesktopLyric = location.hash.includes("desktop-lyric");
</script>
