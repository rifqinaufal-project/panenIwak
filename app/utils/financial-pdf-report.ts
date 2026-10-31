import type { PdfReport } from '#shared/types/export';
import type { Batch } from '#shared/types/workspace';
import { batchSummaryMetrics, metrics, metricsForSoldBatches } from '#shared/utils/finance';
import { dateLabel, idr, kg } from './workspace-format';

/** Build from the selected batches, never from unfiltered workspace data or rendered HTML. */
export function financialPdfReport(options: {
  batches: readonly Batch[];
  scope: 'overview' | 'report';
  subtitle: string;
  now?: Date;
}): PdfReport {
  const { batches, scope, subtitle } = options;
  const profit = metricsForSoldBatches(batches);
  const total = scope === 'overview' ? profit : metrics(batches.flatMap((batch) => batch.items));
  const rows = batches.map((batch) => ({ batch, total: batchSummaryMetrics(batch.items) }));
  return {
    title: scope === 'overview' ? 'Ringkasan usaha' : 'Laporan usaha',
    subtitle,
    generatedAt: (options.now ?? new Date()).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }),
    summary: [
      { label: 'Jumlah batch', value: String(batches.length) },
      { label: 'Total pendapatan', value: idr(total.revenue) },
      { label: scope === 'overview' ? 'Biaya terealisasi' : 'Total modal', value: idr(total.cost) },
      { label: scope === 'overview' ? 'Laba operasional berjalan' : 'Laba gabungan', value: idr(profit.profit) },
      { label: 'Margin gabungan', value: profit.margin === null ? '-' : kg(profit.margin) + '%' },
    ],
    notes: [
      'Laba dan margin gabungan hanya menghitung batch yang sudah memiliki transaksi penjualan.',
      scope === 'overview'
        ? 'Biaya terealisasi hanya mencakup batch yang sudah memiliki penjualan. Rincian berikut tetap memuat seluruh batch sesuai filter.'
        : 'Total modal mencakup seluruh batch sesuai filter, termasuk batch yang belum memiliki penjualan.',
      'Laba per batch tetap menggunakan pendapatan dikurangi seluruh biaya batch. Selisih bobot bukan laba tambahan.',
    ],
    tables: batches.length ? [
      {
        title: 'Rekap keuangan per batch',
        head: ['Batch / asal', 'Tanggal', 'Status', 'Pembelian', 'Perjalanan', 'Total biaya', 'Pendapatan', 'Laba batch', 'Margin'],
        numericFrom: 3,
        body: rows.map(({ batch, total }) => [
          `${batch.code}\n${batch.origin}`,
          dateLabel(batch.date),
          batch.closed ? 'Selesai' : 'Aktif',
          idr(total.purchases),
          idr(total.expense),
          idr(total.cost),
          idr(total.revenue),
          idr(total.profit),
          total.margin === null ? '-' : kg(total.margin) + '%',
        ]),
      },
      {
        title: 'Rekap bobot, harga rata-rata, dan HPP',
        head: ['Batch / asal', 'Bobot beli (kg)', 'Bobot jual (kg)', 'Selisih (kg)', 'Selisih (%)', 'HPP umum / kg beli', 'HPP efektif / kg terjual', 'Harga beli rata-rata / kg', 'Harga jual rata-rata / kg'],
        numericFrom: 1,
        body: rows.map(({ batch, total }) => [
          `${batch.code}\n${batch.origin}`,
          kg(total.bought),
          kg(total.sold),
          kg(total.difference),
          total.differencePercent === null ? '-' : kg(total.differencePercent) + '%',
          total.bought.gt(0) ? idr(total.cost.div(total.bought)) : '-',
          total.hpp === null ? '-' : idr(total.hpp),
          total.purchasePerKg === null ? '-' : idr(total.purchasePerKg),
          total.salePerKg === null ? '-' : idr(total.salePerKg),
        ]),
      },
    ] : [],
  };
}
