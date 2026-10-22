<script setup lang="ts">
import { IconArrowUpRight, IconReceipt, IconSearch } from '@tabler/icons-vue';
import type { ActivityLog, Batch } from '#shared/types/workspace';
import { logTime } from '../../utils/workspace-format';
import AuditChanges from '../AuditChanges.vue';

const props = defineProps<{ logs: ActivityLog[]; batches: Batch[] }>();
defineEmits<{ open: [batch: Batch] }>();
const search = ref('');
const filtered = computed(() =>
  props.logs.filter((log) =>
    `${log.username} ${log.action} ${log.detail}`
      .toLowerCase()
      .includes(search.value.toLowerCase()),
  ),
);
const batchById = computed(() => new Map(props.batches.map((batch) => [batch.id, batch])));
</script>
<template>
  <section class="activity-page">
    <div class="list-toolbar">
      <h2>
        Riwayat aktivitas <span class="count">{{ filtered.length }}</span>
      </h2>
      <label class="search"
        ><IconSearch :size="18" /><input
          v-model="search"
          placeholder="Cari aktivitas atau batch…"
          aria-label="Cari log aktivitas"
      /></label>
    </div>
    <p class="log-notice">
      Menampilkan maksimal 500 aktivitas terbaru yang dapat Anda akses. Username pelaku diverifikasi
      server. Riwayat lokal lama tidak diklaim sebagai aktivitas akun.
    </p>
    <div v-for="log in filtered" :key="log.id" class="activity-row">
      <span class="route-icon"><IconReceipt :size="19" /></span>
      <div class="activity-content">
        <strong>{{ log.action }}</strong>
        <p>{{ log.detail }}</p>
        <small>@{{ log.username }} · {{ logTime(log.timestamp) }}</small
        ><AuditChanges
          v-if="log.oldValues != null || log.newValues != null"
          :before="log.oldValues"
          :after="log.newValues"
        />
      </div>
      <button
        v-if="log.batchId && batchById.has(log.batchId)"
        class="text-button"
        @click="$emit('open', batchById.get(log.batchId)!)"
      >
        Buka batch <IconArrowUpRight :size="15" />
      </button>
    </div>
    <div v-if="!filtered.length" class="empty">
      <IconReceipt :size="30" />
      <h2>{{ search ? 'Tidak ada aktivitas yang cocok' : 'Belum ada aktivitas tercatat' }}</h2>
      <p>Buat batch, tambahkan transaksi, atau simpan produk untuk mulai mencatat aktivitas.</p>
    </div>
  </section>
</template>
