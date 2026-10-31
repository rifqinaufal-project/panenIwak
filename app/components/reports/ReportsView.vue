<script setup lang="ts">
import type { UnwrapRef } from 'vue';
import type { Batch } from '#shared/types/workspace';
import type { useReports } from '../../features/reports/useReports';
import { idr, kg } from '../../utils/workspace-format';
import ReportDetail from './ReportDetail.vue';
import ReportTable from './ReportTable.vue';
import ExportActions from '../ExportActions.vue';
defineProps<{ model: UnwrapRef<ReturnType<typeof useReports>>; batches: Batch[] }>();
defineEmits<{ open: [batch: Batch] }>();
</script>
<template>
  <section class="reports-page">
    <div class="report-filters form-grid">
      <label>Dari tanggal<input v-model="model.start" type="date" /></label
      ><label
        >Sampai tanggal<input v-model="model.end" type="date" :min="model.start || undefined"
      /></label>
      <label
        >Batch<select v-model="model.batchId">
          <option value="">Semua batch</option>
          <option v-for="batch in batches" :key="batch.id" :value="batch.id">
            {{ batch.code }} · {{ batch.origin }}
          </option>
        </select></label
      >
    </div>
    <p v-if="model.start && model.end && model.start > model.end" class="form-error" role="alert">
      Tanggal akhir harus sama atau setelah tanggal awal.
    </p>
    <div class="report-summary">
      <div>
        <span>Batch dalam laporan</span><strong>{{ model.rows.length }}</strong
        ><small>Dihitung dari transaksi saat ini</small>
      </div>
      <div>
        <span>Total pendapatan</span><strong>{{ idr(model.totals.revenue) }}</strong
        ><small>{{ kg(model.totals.sold) }} kg terjual</small>
      </div>
      <div>
        <span>Total modal</span><strong>{{ idr(model.totals.cost) }}</strong
        ><small>Pembelian + biaya perjalanan</small>
      </div>
      <div>
        <span>Laba gabungan</span><strong>{{ idr(model.profitTotals.profit) }}</strong
        ><small>Hanya batch yang sudah memiliki penjualan</small>
      </div>
    </div>
    <section class="report-results" aria-label="Rekap keuangan per batch">
      <div class="section-heading report-heading">
        <div>
          <h2>Rekap keuangan per batch</h2>
          <p>Pilih rincian untuk melihat seluruh transaksi dan perhitungan bobot.</p>
        </div>
        <ExportActions label="Ekspor detail" :exporting="model.exporting" @download="model.download" />
      </div>
      <ReportTable
        v-model:expanded="model.expanded"
        :batches="model.rows"
        :totals="model.totals"
        :profit-totals="model.profitTotals"
      />
      <div v-if="!model.rows.length" class="empty">
        Tidak ada batch yang sesuai dengan filter laporan.
      </div>
    </section>
    <template v-for="batch in model.rows" :key="batch.id"
      ><ReportDetail
        v-if="model.expanded === batch.id"
        :batch="batch"
        @open="$emit('open', $event)"
    /></template>
    <p class="report-disclaimer">
      Semua nilai diperbarui berdasarkan transaksi tersimpan di server. HPP efektif memakai bobot
      terjual. Laba gabungan dan margin total hanya menghitung batch yang sudah memiliki penjualan;
      total modal tetap mencakup seluruh batch sesuai filter. Selisih positif merupakan tonjolan
      bobot, bukan pendapatan tambahan.
    </p>
  </section>
</template>

<style scoped>
.report-heading { flex-wrap: wrap; align-items: flex-start; }
</style>
