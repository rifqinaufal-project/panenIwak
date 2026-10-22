<script setup lang="ts">
import { IconCalendar, IconChevronDown, IconDownload, IconPlus } from '@tabler/icons-vue';
import type Decimal from 'decimal.js';
import type { WorkspacePage } from '#shared/utils/workspace-routes';
import { idr } from '../../utils/workspace-format';

const props = defineProps<{
  page: WorkspacePage;
  revenue: Decimal;
  batchCount: number;
  productForm: boolean;
  editingProduct: boolean;
}>();
const period = defineModel<string>('period', { required: true });
defineEmits<{ download: []; newBatch: []; newProduct: [] }>();
const title = computed(
  () =>
    ({
      Dashboard: idr(props.revenue),
      Batch: 'Perjalanan & batch',
      Laporan: 'Laporan usaha',
      Produk: props.productForm
        ? props.editingProduct
          ? 'Edit produk ikan'
          : 'Tambah ikan baru'
        : 'Produk ikan',
      Log: 'Log aktivitas',
      Pengguna: 'Tim Panen Iwak',
    })[props.page],
);
const description = computed(
  () =>
    ({
      Dashboard: `Total pendapatan · ${period.value.toLowerCase()} · ${props.batchCount} batch`,
      Batch: 'Kelola perjalanan dari pembelian hingga penjualan terakhir.',
      Laporan: 'Lihat hasil perjalanan dan unduh ringkasan usaha Anda.',
      Produk: 'Kelola nama ikan dan size untuk mempermudah pencatatan pembelian.',
      Log: 'Riwayat perubahan dan pengguna yang melakukan tindakan.',
      Pengguna: 'Orang-orang di balik setiap perjalanan.',
    })[props.page],
);
</script>

<template>
  <div class="page-heading" :class="{ 'dashboard-heading': page === 'Dashboard' }">
    <div>
      <div class="breadcrumb">Panen Iwak <span>/</span> {{ page }}</div>
      <h1>{{ title }}</h1>
      <p>{{ description }}</p>
    </div>
    <div class="heading-actions">
      <label v-if="page === 'Dashboard' || page === 'Batch'" class="period">
        <IconCalendar :size="17" /><select v-model="period" aria-label="Periode laporan">
          <option>Bulan ini</option>
          <option>Minggu ini</option></select
        ><IconChevronDown :size="14" />
      </label>
      <button
        v-if="page === 'Dashboard' || page === 'Laporan'"
        class="icon-button export"
        aria-label="Unduh laporan CSV"
        @click="$emit('download')"
      >
        <IconDownload :size="19" />
      </button>
      <button
        v-if="!['Pengguna', 'Produk', 'Log'].includes(page)"
        class="primary"
        @click="$emit('newBatch')"
      >
        <IconPlus :size="18" /> Batch baru
      </button>
      <button v-if="page === 'Produk' && !productForm" class="primary" @click="$emit('newProduct')">
        <IconPlus :size="18" /> Tambah ikan baru
      </button>
    </div>
  </div>
</template>
