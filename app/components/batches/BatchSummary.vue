<script setup lang="ts">
import { IconPlus, IconRefresh } from '@tabler/icons-vue';
import type { Batch } from '#shared/types/workspace';
import { metrics, weightDifferenceValue } from '#shared/utils/finance';
import { dateLabel, idr, kg } from '../../utils/workspace-format';
const props = defineProps<{ batch: Batch }>();
defineEmits<{ manage: []; sale: [] }>();
const totals = computed(() => metrics(props.batch.items));
const differenceValue = computed(() => weightDifferenceValue(props.batch.items));
</script>
<template>
  <div class="page-heading">
    <div>
      <div class="breadcrumb">Batch <span>/</span> {{ batch.code }}</div>
      <h1>{{ batch.origin }}</h1>
      <p>
        {{ dateLabel(batch.date) }} <span class="middot">·</span>
        <span class="badge" :class="batch.closed ? 'complete' : 'in-progress'"
          ><i></i>{{ batch.closed ? 'Selesai' : 'Aktif' }}</span
        >
      </p>
    </div>
    <div class="batch-heading-actions">
      <button class="secondary" @click="$emit('manage')">Edit batch</button
      ><button class="primary" @click="$emit('sale')">
        <IconPlus :size="16" /> Tambah penjualan
      </button>
    </div>
  </div>
  <div class="detail-metrics">
    <div>
      <span>Pendapatan</span><strong>{{ idr(totals.revenue) }}</strong>
    </div>
    <div>
      <span>Total biaya</span><strong>{{ idr(totals.cost) }}</strong>
    </div>
    <div>
      <span>Laba berjalan</span><strong>{{ idr(totals.profit) }}</strong>
    </div>
    <div>
      <span>Selisih bobot saat ini</span><strong>{{ kg(totals.difference) }} kg</strong>
      <div class="weight-value">
        <span>Estimasi nilai modal selisih</span
        ><b>{{
          differenceValue === null
            ? 'Belum tersedia'
            : `${differenceValue.isPositive() ? '+' : ''}${idr(differenceValue)}`
        }}</b>
      </div>
    </div>
  </div>
  <section class="batch-hpp-detail">
    <div class="section-heading">
      <div>
        <h2>HPP batch & produk</h2>
        <p>Dihitung langsung dari seluruh pembelian dan biaya yang tercatat.</p>
      </div>
      <span class="local-caption"><IconRefresh :size="14" /> Otomatis diperbarui</span>
    </div>
    <div class="detail-hpp-summary">
      <div>
        <span>HPP umum / kg beli</span
        ><strong>{{ totals.bought.gt(0) ? idr(totals.cost.div(totals.bought)) : '—' }}</strong
        ><small>{{ idr(totals.cost) }} ÷ {{ kg(totals.bought) }} kg dibeli</small>
      </div>
      <div>
        <span>HPP efektif / kg terjual</span
        ><strong>{{ totals.hpp === null ? '—' : idr(totals.hpp) }}</strong
        ><small>{{
          totals.hpp === null
            ? 'Belum ada bobot terjual'
            : `${idr(totals.cost)} ÷ ${kg(totals.sold)} kg terjual`
        }}</small>
      </div>
    </div>
  </section>
</template>
