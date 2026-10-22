<script setup lang="ts">
import { IconArrowLeft, IconPlus } from '@tabler/icons-vue';
import type { UnwrapRef } from 'vue';
import type { Batch, CatalogProduct, Item } from '#shared/types/workspace';
import type { useBatchOperations } from '../../features/batches/useBatchOperations';
import type { useBatchTransactions } from '../../features/batches/useBatchTransactions';
import BatchSummary from './BatchSummary.vue';
import BatchTransactionForm from './BatchTransactionForm.vue';
import BatchTransactionGroups from './BatchTransactionGroups.vue';
defineProps<{
  batch: Batch;
  catalog: CatalogProduct[];
  managing: boolean;
  kind: Item['kind'] | null;
  editing: boolean;
  operations: UnwrapRef<ReturnType<typeof useBatchOperations>>;
  transactions: UnwrapRef<ReturnType<typeof useBatchTransactions>>;
}>();
defineEmits<{
  back: [];
  manage: [];
  finish: [];
  start: [kind: Item['kind']];
  edit: [item: Item];
}>();
</script>
<template>
  <button class="back" @click="$emit('back')">
    <IconArrowLeft :size="17" />{{
      kind
        ? managing
          ? 'Kembali ke edit batch'
          : 'Kembali ke detail batch'
        : managing
          ? 'Kembali ke detail batch'
          : 'Semua batch'
    }}
  </button>
  <BatchSummary
    v-if="!kind && !managing"
    :batch="batch"
    @manage="$emit('manage')"
    @sale="$emit('start', 'sale')"
  />
  <div v-if="managing && !kind" class="page-heading">
    <div>
      <div class="breadcrumb">{{ batch.code }} <span>/</span> Edit batch</div>
      <h1>Edit transaksi batch</h1>
      <p>Pilih pembelian, biaya, atau penjualan yang ingin dikoreksi atau dihapus.</p>
    </div>
    <div class="batch-heading-actions">
      <button class="secondary" :disabled="operations.deleting" @click="$emit('start', 'purchase')">
        <IconPlus :size="16" /> Tambah pembelian
      </button>
      <button class="secondary" :disabled="operations.deleting" @click="$emit('start', 'expense')">
        <IconPlus :size="16" /> Tambah biaya perjalanan
      </button>
      <button class="secondary" :disabled="operations.deleting" @click="operations.remove">
        {{ operations.deleting ? 'Menghapus…' : 'Hapus batch' }}
      </button>
      <button class="secondary" :disabled="operations.deleting" @click="$emit('finish')">
        Selesai
      </button>
    </div>
  </div>
  <BatchTransactionForm
    v-if="kind"
    :model="transactions"
    :batch="batch"
    :catalog="catalog"
    :kind="kind"
    :editing="editing"
    :error="operations.error"
    :busy="operations.saving"
    @back="$emit('back')"
  />
  <BatchTransactionGroups
    v-else
    :batch="batch"
    :managing="managing"
    :busy="operations.saving || transactions.saving"
    @edit="$emit('edit', $event)"
    @remove="transactions.remove"
  />
</template>
