<script setup lang="ts">
import { IconChevronDown } from '@tabler/icons-vue';
import type { Batch } from '#shared/types/workspace';
import { metrics } from '#shared/utils/finance';
import { dateLabel, idr, kg } from '../../utils/workspace-format';
const props = defineProps<{ batches: Batch[]; totals: ReturnType<typeof metrics> }>();
const expanded = defineModel<string | null>('expanded', { required: true });
const rows = computed(() =>
  props.batches.map((batch) => ({ batch, totals: metrics(batch.items) })),
);
</script>
<template>
  <div
    class="report-table-scroll"
    tabindex="0"
    aria-label="Tabel laporan, geser untuk melihat semua kolom"
  >
    <table class="report-table">
      <thead>
        <tr>
          <th>Batch / asal</th>
          <th>Pembelian</th>
          <th>Perjalanan</th>
          <th>Total biaya</th>
          <th>HPP umum / kg beli</th>
          <th>HPP efektif / kg terjual</th>
          <th>Pendapatan</th>
          <th>Laba</th>
          <th>Margin</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.batch.id">
          <td>
            <strong>{{ row.batch.code }} · {{ row.batch.origin }}</strong
            ><small>{{ dateLabel(row.batch.date) }} · Perhitungan berjalan</small>
          </td>
          <td>{{ idr(row.totals.purchases) }}</td>
          <td>{{ idr(row.totals.expense) }}</td>
          <td>{{ idr(row.totals.cost) }}</td>
          <td>
            {{ row.totals.bought.isZero() ? '—' : idr(row.totals.cost.div(row.totals.bought)) }}
          </td>
          <td>{{ row.totals.hpp === null ? '—' : idr(row.totals.hpp) }}</td>
          <td>{{ idr(row.totals.revenue) }}</td>
          <td :class="row.totals.profit.isNegative() ? 'red' : 'green'">
            {{ idr(row.totals.profit) }}
          </td>
          <td>{{ row.totals.margin === null ? '—' : kg(row.totals.margin) + '%' }}</td>
          <td>
            <button
              class="text-button"
              @click="expanded = expanded === row.batch.id ? null : row.batch.id"
            >
              {{ expanded === row.batch.id ? 'Tutup rincian' : 'Rincian'
              }}<IconChevronDown :size="14" />
            </button>
          </td>
        </tr>
      </tbody>
      <tfoot v-if="batches.length">
        <tr>
          <td>Total</td>
          <td>{{ idr(totals.purchases) }}</td>
          <td>{{ idr(totals.expense) }}</td>
          <td>{{ idr(totals.cost) }}</td>
          <td>{{ totals.bought.isZero() ? '—' : idr(totals.cost.div(totals.bought)) }}</td>
          <td>{{ totals.hpp === null ? '—' : idr(totals.hpp) }}</td>
          <td>{{ idr(totals.revenue) }}</td>
          <td>{{ idr(totals.profit) }}</td>
          <td>{{ totals.margin === null ? '—' : kg(totals.margin) + '%' }}</td>
          <td></td>
        </tr>
      </tfoot>
    </table>
  </div>
</template>
