<script setup lang="ts">
import { IconPlus, IconRefresh } from '@tabler/icons-vue';
import type { Batch } from '#shared/types/workspace';
import { batchSummaryMetrics } from '#shared/utils/finance';
import { dateLabel, idr, kg } from '../../utils/workspace-format';
const props = defineProps<{ batch: Batch }>();
defineEmits<{ manage: []; sale: [] }>();
const totals = computed(() => batchSummaryMetrics(props.batch.items));
const weightNote = computed(() => {
  const total = totals.value;
  if (total.bought.isZero() && total.sold.isZero())
    return 'Belum ada pembelian atau penjualan pada batch ini.';
  if (total.bought.isZero()) return 'Belum ada bobot pembelian untuk membandingkan penjualan.';
  if (total.sold.isZero()) return 'Belum ada penjualan. Selisih belum menunjukkan susut atau kerugian.';
  if (total.difference.isNegative())
    return props.batch.closed
      ? 'Bobot jual di bawah bobot beli. Selisih bobot tidak otomatis menunjukkan kerugian.'
      : 'Bobot jual masih di bawah bobot beli. Penjualan masih berjalan; selisih belum berarti susut atau rugi.';
  return total.difference.isZero()
    ? 'Total bobot beli dan jual seimbang.'
    : 'Bobot terjual melebihi bobot dibeli. Periksa pencatatan untuk memastikan selisihnya.';
});
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
  <div class="section-heading batch-summary-heading">
    <h2>Ringkasan keuangan</h2>
  </div>
  <div class="detail-metrics" role="group" aria-label="Ringkasan keuangan">
    <div>
      <span>Pendapatan</span><strong>{{ idr(totals.revenue) }}</strong>
      <small class="metric-hint">Dari seluruh penjualan tercatat</small>
    </div>
    <div>
      <span>Total biaya</span><strong>{{ idr(totals.cost) }}</strong>
      <small class="metric-hint cost-breakdown">
        <span>Pembelian ikan <b>{{ idr(totals.purchases) }}</b></span>
        <span>Biaya perjalanan <b>{{ idr(totals.expense) }}</b></span>
      </small>
    </div>
    <div>
      <span>Laba berjalan</span>
      <strong :class="totals.profit.isNegative() ? 'red' : 'green'">{{ idr(totals.profit) }}</strong>
      <small class="metric-hint">Pendapatan − seluruh biaya batch</small>
    </div>
    <div>
      <span>Margin laba</span>
      <strong :class="totals.margin === null ? '' : totals.profit.isNegative() ? 'red' : 'green'">
        {{ totals.margin === null ? '—' : kg(totals.margin) + '%' }}
      </strong>
      <small class="metric-hint">
        {{ totals.margin === null ? 'Belum ada pendapatan' : 'Laba ÷ pendapatan × 100%' }}
      </small>
    </div>
  </div>
  <section class="batch-weight-summary" aria-label="Ringkasan bobot">
    <div class="section-heading">
      <div>
        <h2>Ringkasan bobot</h2>
        <p>Total bobot beli dan jual dari transaksi batch ini.</p>
      </div>
    </div>
    <dl class="batch-weight-metrics">
      <div>
        <dt>Total bobot dibeli</dt><dd>{{ kg(totals.bought) }} <small>kg</small></dd>
      </div>
      <div>
        <dt>Total bobot terjual</dt><dd>{{ kg(totals.sold) }} <small>kg</small></dd>
      </div>
      <div>
        <dt>Selisih bobot saat ini</dt>
        <dd>{{ totals.difference.gt(0) ? '+' : '' }}{{ kg(totals.difference) }} <small>kg</small></dd>
        <small>Bobot terjual − bobot dibeli</small>
      </div>
      <div>
        <dt>Persentase selisih</dt>
        <dd>{{ totals.differencePercent === null ? '—' : `${totals.differencePercent.gt(0) ? '+' : ''}${kg(totals.differencePercent)}%` }}</dd>
        <small>Terhadap total bobot dibeli</small>
      </div>
    </dl>
    <p class="batch-summary-note">{{ weightNote }}</p>
    <div v-if="totals.extraWeightSalesValue !== null && totals.salePerKg !== null" class="batch-weight-estimate">
      <div>
        <span>Estimasi nilai penjualan selisih bobot</span>
        <strong>{{ idr(totals.extraWeightSalesValue) }}</strong>
      </div>
      <p>
        {{ kg(totals.difference) }} kg × harga jual rata-rata {{ idr(totals.salePerKg) }}/kg.
        Menggunakan rata-rata seluruh penjualan, bukan harga jual khusus bobot selisih.
      </p>
      <p><b>Sudah termasuk dalam pendapatan. Bukan laba tambahan.</b></p>
    </div>
  </section>
  <section class="batch-hpp-detail">
    <div class="section-heading">
      <div>
        <h2>Harga rata-rata & HPP batch</h2>
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
      <div>
        <span>Harga beli rata-rata / kg</span>
        <strong>{{ totals.purchasePerKg === null ? '—' : idr(totals.purchasePerKg) }}</strong>
        <small>{{ totals.purchasePerKg === null ? 'Belum ada bobot dibeli' : `${idr(totals.purchases)} ÷ ${kg(totals.bought)} kg dibeli; belum termasuk biaya perjalanan` }}</small>
      </div>
      <div>
        <span>Harga jual rata-rata / kg</span>
        <strong>{{ totals.salePerKg === null ? '—' : idr(totals.salePerKg) }}</strong>
        <small>{{ totals.salePerKg === null ? 'Belum ada bobot terjual' : `${idr(totals.revenue)} ÷ ${kg(totals.sold)} kg terjual` }}</small>
      </div>
    </div>
  </section>
</template>

<style scoped>
.batch-summary-heading { margin-bottom: 14px; }
.detail-metrics > div { min-width: 0; }
.detail-metrics strong, .batch-weight-metrics dd, .batch-weight-estimate strong,
.detail-hpp-summary strong { font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.detail-metrics .metric-hint { color: #616c7d; font-size: 11px; line-height: 1.7; }
.cost-breakdown { display: flex; flex-direction: column; gap: 4px; }
.cost-breakdown > span { display: flex; flex-wrap: wrap; column-gap: 8px; justify-content: space-between; }
.cost-breakdown b { font-weight: 500; }
.batch-weight-summary { padding: 22px; margin-bottom: 28px; border-radius: 20px; background: var(--panel); }
.batch-weight-metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 20px; margin: 24px 0 18px; }
.batch-weight-metrics > div { min-width: 0; }
.batch-weight-metrics dt { color: #616c7d; font-size: 12px; margin-bottom: 12px; }
.batch-weight-metrics dd { margin: 0 0 8px; font-size: 27px; font-weight: 600; letter-spacing: -.6px; }
.batch-weight-metrics dd small { font-size: 14px; font-weight: 400; letter-spacing: 0; }
.batch-weight-metrics > div > small { color: #616c7d; font-size: 11px; line-height: 1.6; }
.batch-summary-note { color: #616c7d; font-size: 12px; line-height: 1.7; margin: 0; }
.batch-weight-estimate { border-top: 1px solid var(--line); margin-top: 18px; padding-top: 18px; }
.batch-weight-estimate > div { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; font-size: 13px; }
.batch-weight-estimate strong { font-size: 18px; }
.batch-weight-estimate p { color: #616c7d; font-size: 11px; line-height: 1.7; margin: 8px 0 0; }
.detail-hpp-summary span, .detail-hpp-summary small { color: #616c7d; line-height: 1.7; }
@media (max-width: 1023px) {
  .detail-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .batch-weight-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); row-gap: 24px; }
}
@media (max-width: 767px) {
  .batch-weight-summary { padding: 18px 16px; border-radius: 18px; }
  .batch-weight-metrics { gap: 22px 14px; }
  .batch-weight-metrics dd { font-size: 24px; }
}
@media (max-width: 359px) {
  .detail-metrics, .batch-weight-metrics { grid-template-columns: minmax(0, 1fr); }
}
</style>
