<script setup lang="ts">
import { IconFish } from '@tabler/icons-vue';
defineProps<{ username: string }>();
</script>
<template>
  <footer>
    <span
      ><IconFish :size="16" /> Panen Iwak <span class="footer-dot">·</span> Lebih rapi, lebih
      pasti.</span
    >
    <span>@{{ username }} <span class="footer-dot">·</span> Data tersimpan di server</span>
  </footer>
</template>
