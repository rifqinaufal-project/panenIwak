import { describe, expect, test } from 'bun:test';
import type { Batch, Item } from '../shared/types/workspace';
import { financialPdfReport } from '../app/utils/financial-pdf-report';
import { createPdf } from '../app/utils/download-pdf';
import { useReportDownload } from '../app/features/common/useReportDownload';

const item = (kind: Item['kind'], weight: string, price: string): Item => ({
  id: kind, kind, weight, price, fish: 'Nila', size: '8–10', description: '', date: '2026-10-22',
});
const unsold: Batch = {
  id: 'unsold', code: 'PI-001', origin: 'Lamongan', destination: '', staff: '',
  date: '2026-10-21', closed: false,
  items: [item('purchase', '100', '20000'), item('expense', '0', '200000')],
};
const sold: Batch = {
  ...unsold, id: 'sold', code: 'PI-002', date: '2026-10-22', closed: true,
  items: [item('purchase', '50', '22000'), item('expense', '0', '100000'), item('sale', '50', '30000')],
};
const options = { batches: [unsold, sold], subtitle: 'Tanggal: 2026-10-21 s/d 2026-10-22', now: new Date('2026-10-22T12:00:00Z') };

describe('financial PDF data', () => {
  test('report preserves all capital but excludes unsold batches from combined profit and margin', () => {
    const report = financialPdfReport({ ...options, scope: 'report' });
    expect(report.summary.map((item) => item.value)).toEqual(['2', 'Rp1.500.000', 'Rp3.400.000', 'Rp300.000', '20%']);
    expect(report.tables[0]!.body.map((row) => row[2])).toEqual(['Aktif', 'Selesai']);
    expect(report.tables[0]!.body[0]![7]).toBe('-Rp2.200.000');
    expect(report.tables[1]!.body[0]![6]).toBe('-');
    expect(report.notes.join(' ')).toContain('belum memiliki penjualan');
    expect(report.subtitle).toBe(options.subtitle);
  });

  test('dashboard PDF uses the same realized totals as the dashboard', () => {
    const report = financialPdfReport({ ...options, scope: 'overview' });
    expect(report.summary.map((item) => item.value)).toEqual(['2', 'Rp1.500.000', 'Rp1.200.000', 'Rp300.000', '20%']);
    expect(report.tables[0]!.body).toHaveLength(2);
    expect(report.summary[2]!.label).toBe('Biaya terealisasi');
  });

  test('empty and unsold-only selections do not invent margin or effective HPP', () => {
    const empty = financialPdfReport({ ...options, batches: [], scope: 'report' });
    expect(empty.summary.map((item) => item.value)).toEqual(['0', 'Rp0', 'Rp0', 'Rp0', '-']);
    expect(empty.tables).toEqual([]);
    const pending = financialPdfReport({ ...options, batches: [unsold], scope: 'report' });
    expect(pending.summary[3]!.value).toBe('Rp0');
    expect(pending.summary[4]!.value).toBe('-');
    expect(pending.tables[1]!.body[0]![6]).toBe('-');
  });

  test('renderer produces a real landscape PDF with multiple pages for long reports', async () => {
    const batches = Array.from({ length: 100 }, (_, index) => ({
      ...sold, id: `b${index}`, code: `PI-${index}`, origin: 'Lamongan - rute perjalanan dengan nama panjang',
    }));
    const doc = await createPdf(financialPdfReport({ ...options, batches, scope: 'report' }));
    expect(doc.getNumberOfPages()).toBeGreaterThan(2);
    expect(doc.internal.pageSize.getWidth()).toBeGreaterThan(doc.internal.pageSize.getHeight());
    expect(doc.output().startsWith('%PDF-')).toBe(true);
    expect(doc.output()).toContain('/Title (Laporan usaha)');
    const empty = await createPdf(financialPdfReport({ ...options, batches: [], scope: 'report' }));
    expect(empty.getNumberOfPages()).toBe(1);
  });
});

describe('report export state and retry', () => {
  const file = () => ({
    filename: 'laporan', csvRows: [['Batch'], ['PI-002']],
    pdf: financialPdfReport({ ...options, scope: 'report' }),
  });

  test('blocks duplicate exports while pending and restores buttons after success', async () => {
    const events: string[] = [];
    let release!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    const calls: string[] = [];
    const controller = useReportDownload((message) => events.push(message), {
      csv(filename) { calls.push(filename); },
      async pdf(filename) { calls.push(filename); await held; },
    });
    const pending = controller.download('pdf', file);
    expect(controller.exporting.value).toBe('pdf');
    await controller.download('csv', file);
    expect(calls).toEqual(['laporan.pdf']);
    release();
    await pending;
    expect(controller.exporting.value).toBeNull();
    expect(events).toEqual(['Laporan PDF sesuai filter berhasil diunduh.']);
    await controller.download('csv', file);
    expect(calls).toEqual(['laporan.pdf', 'laporan.csv']);
  });

  test('failed generation or saving is reported and can be retried', async () => {
    const events: string[] = [];
    let fail = true;
    const controller = useReportDownload((message) => events.push(message), {
      csv() {},
      async pdf() { if (fail) throw new Error('Simulated failure'); },
    });
    await controller.download('pdf', file);
    expect(controller.exporting.value).toBeNull();
    expect(events[0]).toContain('Gagal menyiapkan laporan PDF');
    fail = false;
    await controller.download('pdf', file);
    expect(events[1]).toContain('berhasil diunduh');
    await controller.download('pdf', () => { throw new Error('Build failure'); });
    expect(controller.exporting.value).toBeNull();
    expect(events[2]).toContain('Gagal menyiapkan');
  });
});
