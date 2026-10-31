import { describe, expect, test } from 'bun:test';
import { batchSummaryMetrics, type FinancialItem } from '../shared/utils/finance';

const item = (kind: FinancialItem['kind'], weight: string, price: string): FinancialItem => ({ kind, weight, price });

describe('batch summary metrics', () => {
  test('separates purchase averages from HPP and weights all purchase and sale lines', () => {
    const total = batchSummaryMetrics([
      item('purchase', '100', '20000'),
      item('purchase', '50', '23000'),
      item('expense', '0', '150000'),
      item('sale', '100', '30000'),
      item('sale', '65', '33000'),
    ]);
    expect(total.bought.toString()).toBe('150');
    expect(total.sold.toString()).toBe('165');
    expect(total.difference.toString()).toBe('15');
    expect(total.differencePercent?.toString()).toBe('10');
    expect(total.purchasePerKg?.toString()).toBe('21000');
    expect(total.cost.div(total.bought).toString()).toBe('22000');
    expect(total.salePerKg?.toFixed(2)).toBe('31181.82');
    expect(total.extraWeightSalesValue?.toFixed(2)).toBe('467727.27');
    expect(total.profit.toString()).toBe('1845000');
  });

  test('the 48 kg sales estimate is not added to actual batch profit', () => {
    const total = batchSummaryMetrics([
      item('purchase', '1330', '30000'),
      item('expense', '0', '1113000'),
      item('sale', '1370', '30500'),
      item('sale', '8', '39000'),
    ]);
    expect(total.revenue.toString()).toBe('42097000');
    expect(total.cost.toString()).toBe('41013000');
    expect(total.difference.toString()).toBe('48');
    expect(total.extraWeightSalesValue?.toFixed(2)).toBe('1466368.65');
    expect(total.profit.toString()).toBe('1084000');
    expect(total.margin?.toFixed(2)).toBe('2.58');
  });

  test('negative and balanced differences are not estimated as extra sales', () => {
    for (const sold of ['50', '100']) {
      const total = batchSummaryMetrics([item('purchase', '100', '20000'), item('sale', sold, '30000')]);
      expect(total.differencePercent?.toString()).toBe(sold === '50' ? '-50' : '0');
      expect(total.extraWeightSalesValue).toBeNull();
    }
  });

  test('unsold batches retain actual costs without inventing sale prices or sales values', () => {
    const total = batchSummaryMetrics([item('purchase', '100', '20000'), item('expense', '0', '200000')]);
    expect(total.salePerKg).toBeNull();
    expect(total.extraWeightSalesValue).toBeNull();
    expect(total.differencePercent?.toString()).toBe('-100');
    expect(total.hpp).toBeNull();
    expect(total.margin).toBeNull();
    expect(total.profit.toString()).toBe('-2200000');
  });

  test('empty, expense-only and zero-weight batches have no undefined ratios', () => {
    for (const items of [[], [item('expense', '0', '150000')], [item('purchase', '0', '20000'), item('sale', '0', '30000')]]) {
      const total = batchSummaryMetrics(items);
      expect(total.purchasePerKg).toBeNull();
      expect(total.salePerKg).toBeNull();
      expect(total.differencePercent).toBeNull();
      expect(total.extraWeightSalesValue).toBeNull();
      expect(total.margin).toBeNull();
    }
  });

  test('sales without a purchase cannot establish a meaningful extra-weight valuation', () => {
    const total = batchSummaryMetrics([item('sale', '50', '30000')]);
    expect(total.salePerKg?.toString()).toBe('30000');
    expect(total.purchasePerKg).toBeNull();
    expect(total.differencePercent).toBeNull();
    expect(total.extraWeightSalesValue).toBeNull();
  });
});
