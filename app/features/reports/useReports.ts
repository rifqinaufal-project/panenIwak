import { computed, ref, type Ref } from 'vue';
import type { ExportFormat } from '#shared/types/export';
import type { Batch } from '#shared/types/workspace';
import { metrics, metricsForSoldBatches } from '#shared/utils/finance';
import { financialPdfReport } from '../../utils/financial-pdf-report';
import { useReportDownload } from '../common/useReportDownload';

export function useReports(batches: Ref<Batch[]>, notify: (message: string) => void) {
  const exporting = useReportDownload(notify);
  const start = ref(''),
    end = ref(''),
    batchId = ref(''),
    expanded = ref<string | null>(null);
  const rows = computed(() =>
    batches.value.filter(
      (batch) =>
        (!start.value || batch.date >= start.value) &&
        (!end.value || batch.date <= end.value) &&
        (!batchId.value || batch.id === batchId.value),
    ),
  );
  const totals = computed(() => metrics(rows.value.flatMap((batch) => batch.items)));
  const profitTotals = computed(() => metricsForSoldBatches(rows.value));
  function download(format: ExportFormat = 'csv') {
    if (start.value && end.value && start.value > end.value) {
      notify('Tanggal akhir harus sama atau setelah tanggal awal.');
      return;
    }
    return exporting.download(format, () => ({
      filename: 'panen-iwak-laporan-detail',
      pdf: financialPdfReport({
        batches: rows.value,
        scope: 'report',
        subtitle: `Tanggal: ${start.value || 'Awal pencatatan'} s/d ${end.value || 'Terbaru'} | Batch: ${batchId.value ? rows.value[0]?.code ?? batchId.value : 'Semua batch'}`,
      }),
      csvRows: [
        [
          'Batch',
          'Tanggal',
          'Asal',
          'Status',
          'Pembelian',
          'Biaya perjalanan',
          'Total biaya',
          'Pendapatan',
          'Laba',
          'Margin (%)',
          'Bobot beli (kg)',
          'Bobot jual (kg)',
          'Selisih (kg)',
          'HPP umum/kg beli',
          'HPP efektif/kg terjual',
        ],
        ...rows.value.map((batch) => {
          const total = metrics(batch.items);
          return [
            batch.code,
            batch.date,
            batch.origin,
            batch.closed ? 'Selesai' : 'Aktif',
            total.purchases.toString(),
            total.expense.toString(),
            total.cost.toString(),
            total.revenue.toString(),
            total.profit.toString(),
            total.margin?.toFixed(2) ?? '',
            total.bought.toString(),
            total.sold.toString(),
            total.difference.toString(),
            total.bought.isZero() ? '' : total.cost.div(total.bought).toFixed(2),
            total.hpp?.toFixed(2) ?? '',
          ];
        }),
      ],
    }));
  }
  return { start, end, batchId, expanded, rows, totals, profitTotals, exporting: exporting.exporting, download };
}
