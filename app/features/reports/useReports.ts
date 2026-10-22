import { computed, ref, type Ref } from 'vue';
import type { Batch } from '#shared/types/workspace';
import { metrics } from '#shared/utils/finance';
import { downloadCsv } from '../../utils/download-csv';

export function useReports(batches: Ref<Batch[]>, notify: (message: string) => void) {
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
  function download() {
    downloadCsv('panen-iwak-laporan-detail.csv', [
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
          'Berjalan',
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
    ]);
    notify('Laporan detail sesuai filter berhasil diunduh.');
  }
  return { start, end, batchId, expanded, rows, totals, download };
}
