<script setup lang="ts">
import { IconDownload } from '@tabler/icons-vue';
import type { UnwrapRef } from 'vue';
import type { Batch } from '#shared/types/workspace';
import type { useReports } from '../../features/reports/useReports';
import { idr, kg } from '../../utils/workspace-format';
import ReportDetail from './ReportDetail.vue';
import ReportTable from './ReportTable.vue';
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
        <span>Laba gabungan</span><strong>{{ idr(model.totals.profit) }}</strong
        ><small>Diperbarui setiap ada transaksi</small>
      </div>
    </div>
    <section class="report-results" aria-label="Rekap keuangan per batch">
      <div class="section-heading report-heading">
        <div>
          <h2>Rekap keuangan per batch</h2>
          <p>Pilih rincian untuk melihat seluruh transaksi dan perhitungan bobot.</p>
        </div>
        <button class="secondary" @click="model.download">
          <IconDownload :size="17" /> Ekspor detail CSV
        </button>
      </div>
      <ReportTable v-model:expanded="model.expanded" :batches="model.rows" :totals="model.totals" />
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
      terjual. Selisih positif merupakan tonjolan bobot, bukan pendapatan tambahan.
    </p>
  </section>
</template>
