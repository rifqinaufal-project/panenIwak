<script setup lang="ts">
import { IconDownload } from '@tabler/icons-vue';
import type { ExportFormat } from '#shared/types/export';

withDefaults(defineProps<{ label?: string; exporting: ExportFormat | null }>(), {
  label: 'Unduh laporan',
});
defineEmits<{ download: [format: ExportFormat] }>();
</script>

<template>
  <div class="export-actions" role="group" :aria-label="label" :aria-busy="exporting !== null">
    <button
      v-for="format in (['csv', 'pdf'] as const)"
      :key="format"
      type="button"
      class="secondary"
      :aria-label="`${label} ${format.toUpperCase()}`"
      :disabled="exporting !== null"
      @click="$emit('download', format)"
    >
      <IconDownload :size="16" /> {{ format.toUpperCase() }}
    </button>
    <span v-if="exporting" class="export-status" role="status">
      Menyiapkan {{ exporting.toUpperCase() }}…
    </span>
  </div>
</template>

<style scoped>
.export-actions { display: inline-flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.export-actions button { min-height: 44px; padding-inline: 14px; gap: 7px; white-space: nowrap; }
.export-status { color: #616c7d; font-size: 11px; line-height: 1.6; }
</style>
