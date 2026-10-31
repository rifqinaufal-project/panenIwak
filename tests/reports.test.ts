import { describe, expect, test } from 'bun:test';
import { ref } from 'vue';
import type { Batch, Item } from '../shared/types/workspace';
import { useReports } from '../app/features/reports/useReports';

const item = (kind: Item['kind'], weight: string, price: string): Item => ({
  id: kind,
  kind,
  weight,
  price,
  fish: 'Nila',
  size: '',
  description: '',
  date: '2026-10-22',
});

function fixture() {
  const unsold: Batch = {
    id: 'unsold',
    code: 'PI-001',
    origin: 'Lamongan',
    destination: '',
    staff: '',
    date: '2026-10-21',
    closed: false,
    items: [item('purchase', '100', '20000'), item('expense', '0', '200000')],
  };
  const sold: Batch = {
    ...unsold,
    id: 'sold',
    code: 'PI-002',
    date: '2026-10-22',
    items: [
      item('purchase', '50', '22000'),
      item('expense', '0', '100000'),
      item('sale', '50', '30000'),
    ],
  };
  const batches = ref([unsold, sold]);
  return { batches, report: useReports(batches, () => {}) };
}

describe('combined report profit', () => {
  test('ignores unsold batches for profit and margin but preserves full capital and rows', () => {
    const { report } = fixture();
    expect(report.rows.value).toHaveLength(2);
    expect(report.totals.value.cost.toString()).toBe('3400000');
    expect(report.profitTotals.value.profit.toString()).toBe('300000');
    expect(report.profitTotals.value.margin?.toString()).toBe('20');
  });

  test('respects batch and date filters, including empty and unsold-only selections', () => {
    const { report } = fixture();
    report.batchId.value = 'unsold';
    expect(report.totals.value.cost.toString()).toBe('2200000');
    expect(report.profitTotals.value.profit.toString()).toBe('0');
    expect(report.profitTotals.value.margin).toBeNull();
    report.batchId.value = '';
    report.start.value = '2026-10-22';
    expect(report.rows.value.map((batch) => batch.id)).toEqual(['sold']);
    expect(report.profitTotals.value.profit.toString()).toBe('300000');
    report.end.value = '2026-10-21';
    expect(report.rows.value).toHaveLength(0);
    expect(report.profitTotals.value.profit.toString()).toBe('0');
    expect(report.profitTotals.value.margin).toBeNull();
  });

  test('includes full batch costs after a first sale and excludes them when the sale is removed', () => {
    const { batches, report } = fixture();
    batches.value[0]!.items.push(item('sale', '50', '30000'));
    expect(report.profitTotals.value.profit.toString()).toBe('-400000');
    batches.value[0]!.items = batches.value[0]!.items.filter((item) => item.kind !== 'sale');
    expect(report.profitTotals.value.profit.toString()).toBe('300000');
  });

  test('invalid date ranges cannot start a CSV or PDF export', async () => {
    const messages: string[] = [];
    const report = useReports(ref<Batch[]>([]), (message) => messages.push(message));
    report.start.value = '2026-10-23';
    report.end.value = '2026-10-22';
    await report.download('pdf');
    await report.download('csv');
    expect(report.exporting.value).toBeNull();
    expect(messages).toEqual([
      'Tanggal akhir harus sama atau setelah tanggal awal.',
      'Tanggal akhir harus sama atau setelah tanggal awal.',
    ]);
  });
});
