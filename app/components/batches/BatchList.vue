<script setup lang="ts">
import { IconSearch, IconTruck } from '@tabler/icons-vue';
import type { Batch } from '#shared/types/workspace';
import { metrics } from '#shared/utils/finance';
import { dateLabel, idr } from '../../utils/workspace-format';

defineProps<{ batches: Batch[] }>();
const search = defineModel<string>('search', { required: true });
defineEmits<{ open: [batch: Batch] }>();
</script>
<template>
  <section class="batch-list">
    <div class="list-toolbar">
      <h2>
        Semua batch <span class="count">{{ batches.length }}</span>
      </h2>
      <label class="search"
        ><IconSearch :size="18" /><input v-model="search" placeholder="Cari batch atau asal…"
      /></label>
    </div>
    <div class="full-table">
      <div class="full-table-head">
        <span>Batch & asal</span><span>Kode batch</span><span>Tanggal</span><span>Pendapatan</span
        ><span>Status</span>
      </div>
      <button
        v-for="batch in batches"
        :key="batch.id"
        class="full-table-row"
        @click="$emit('open', batch)"
      >
        <span class="route-cell"
          ><span class="route-icon"><IconTruck :size="21" /></span
          ><span
            ><strong>{{ batch.origin }}</strong
            ><small>{{ batch.code }}</small></span
          ></span
        >
        <span>{{ batch.code }}</span
        ><span>{{ dateLabel(batch.date) }}</span
        ><strong>{{ idr(metrics(batch.items).revenue) }}</strong>
        <span
          ><span class="badge" :class="batch.closed ? 'complete' : 'in-progress'"
            ><i></i>{{ batch.closed ? 'Selesai' : 'Aktif' }}</span
          ></span
        >
      </button>
    </div>
    <div v-if="!batches.length" class="empty">
      Tidak ada batch ditemukan. Buat batch baru untuk memulai.
    </div>
  </section>
</template>
