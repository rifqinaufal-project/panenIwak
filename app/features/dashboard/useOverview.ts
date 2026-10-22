import { computed, ref, type Ref } from 'vue';
import type { Batch } from '#shared/types/workspace';
import { metrics } from '#shared/utils/finance';
import { today } from '../../utils/workspace-format';
import { downloadCsv } from '../../utils/download-csv';

export function useOverview(batches: Ref<Batch[]>, notify: (message: string) => void) {
  const period = ref('Bulan ini'),
    search = ref('');
  const visible = computed(() =>
    batches.value.filter((batch) => {
      const now = new Date();
      now.setDate(now.getDate() - 6);
      const start =
        period.value === 'Minggu ini'
          ? new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
          : today().slice(0, 7) + '-01';
      return (
        `${batch.code} ${batch.origin}`.toLowerCase().includes(search.value.toLowerCase()) &&
        batch.date >= start &&
        batch.date <= today()
      );
    }),
  );
  const totals = computed(() => metrics(visible.value.flatMap((batch) => batch.items)));
  function download() {
    downloadCsv('panen-iwak-ringkasan.csv', [
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
    ]);
    notify('Ringkasan CSV berhasil diunduh.');
  }
  return { period, search, visible, totals, download };
}
