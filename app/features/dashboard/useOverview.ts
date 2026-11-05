import { computed, ref, type Ref } from 'vue';
import type { ExportFormat } from '#shared/types/export';
import type { Batch } from '#shared/types/workspace';
import { metrics, metricsForSoldBatches } from '#shared/utils/finance';
import { today } from '../../utils/workspace-format';
import { financialPdfReport } from '../../utils/financial-pdf-report';
import { useReportDownload } from '../common/useReportDownload';

type Period = 'Semua' | 'Bulan ini' | 'Minggu ini';

export function useOverview(batches: Ref<Batch[]>, notify: (message: string) => void) {
  const exporting = useReportDownload(notify);
  const period = ref('Bulan ini'),
    batchPeriod = ref<Period>('Semua'),
    search = ref('');

  function filterBatches(selectedPeriod: string) {
    return batches.value.filter((batch) => {
      if (
        `${batch.code} ${batch.origin}`.toLowerCase().includes(search.value.toLowerCase()) === false
      )
        return false;
      if (selectedPeriod === 'Semua') return true;

      const now = new Date();
      now.setDate(now.getDate() - 6);
      const start =
        selectedPeriod === 'Minggu ini'
          ? new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
          : today().slice(0, 7) + '-01';
      return (
        batch.date >= start &&
        batch.date <= today()
      );
    });
  }

  const visible = computed(() => filterBatches(period.value));
  const batchVisible = computed(() => filterBatches(batchPeriod.value));
  const totals = computed(() => metricsForSoldBatches(visible.value));
  function download(format: ExportFormat = 'csv') {
    return exporting.download(format, () => ({
      filename: 'panen-iwak-ringkasan',
      pdf: financialPdfReport({
        batches: visible.value,
        scope: 'overview',
        subtitle: `Periode: ${period.value}${search.value ? ` | Pencarian: ${search.value}` : ''}`,
      }),
      csvRows: [
        ['Batch', 'Tanggal', 'Asal', 'Status', 'Pendapatan', 'Biaya', 'Laba'],
        ...visible.value.map((batch) => {
          const total = metrics(batch.items);
          return [
            batch.code,
            batch.date,
            batch.origin,
            batch.closed ? 'Selesai' : 'Aktif',
            total.revenue.toString(),
            total.cost.toString(),
            total.profit.toString(),
          ];
        }),
      ],
    }));
  }
  return {
    period,
    batchPeriod,
    search,
    visible,
    batchVisible,
    totals,
    exporting: exporting.exporting,
    download,
  };
}
