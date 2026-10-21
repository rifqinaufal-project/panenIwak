import { describe, expect, test } from 'bun:test';
import { draftProductHpps, metrics, productHpps, safeDecimal, weightDifferenceValue } from '../shared/utils/finance';

const item = (kind: 'purchase' | 'expense' | 'sale', weight: string, price: string, fish = 'Nila', size = '8–10') => ({ kind, weight, price, fish, size });

describe('financial calculation safeguards', () => {
  test('empty batches have zero totals and no effective HPP or margin', () => {
    const total = metrics([]);
    expect(total.cost.toString()).toBe('0');
    expect(total.profit.toString()).toBe('0');
    expect(total.hpp).toBeNull();
    expect(total.margin).toBeNull();
    expect(weightDifferenceValue([])).toBeNull();
  });

  test('decimal weights and prices are multiplied without floating-point rounding', () => {
    const total = metrics([item('purchase', '0.1', '0.2'), item('sale', '0.3', '0.4')]);
    expect(total.purchases.toString()).toBe('0.02');
    expect(total.revenue.toString()).toBe('0.12');
    expect(total.profit.toString()).toBe('0.1');
  });

  test('expenses count once, independently of their weight field', () => {
    expect(metrics([item('expense', '999', '125000')]).expense.toString()).toBe('125000');
  });

  test('unsold stock keeps its full cost and a negative running profit', () => {
    const total = metrics([item('purchase', '100', '20000'), item('expense', '0', '200000')]);
    expect(total.cost.toString()).toBe('2200000');
    expect(total.profit.toString()).toBe('-2200000');
    expect(total.hpp).toBeNull();
  });

  test('purchase and effective HPP use their distinct denominators', () => {
    const total = metrics([item('purchase', '100', '20000'), item('expense', '0', '200000'), item('sale', '50', '30000')]);
    expect(total.cost.div(total.bought).toString()).toBe('22000');
    expect(total.hpp?.toString()).toBe('44000');
    expect(total.profit.toString()).toBe('-700000');
    expect(total.difference.toString()).toBe('-50');
  });

  test('weight gain is not added to revenue or profit', () => {
    const items = [item('purchase', '100', '20000'), item('expense', '0', '200000'), item('sale', '110', '30000')];
    const total = metrics(items);
    expect(total.revenue.toString()).toBe('3300000');
    expect(total.profit.toString()).toBe('1100000');
    expect(total.difference.toString()).toBe('10');
    expect(weightDifferenceValue(items)?.toString()).toBe('220000');
    expect(weightDifferenceValue([item('purchase', '100', '20000'), item('sale', '50', '30000')])?.toString()).toBe('-1000000');
  });

  test('matching fish and size purchases are weight-averaged, including case variants', () => {
    const rows = productHpps([item('purchase', '100', '20000'), item('purchase', '50', '23000', 'nila'), item('expense', '0', '150000')]);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.purchasePerKg?.toString()).toBe('21000');
    expect(rows[0]!.expensePerKg.toString()).toBe('1000');
    expect(rows[0]!.hpp?.toString()).toBe('22000');
  });

  test('travel cost is allocated by purchased weight across products and sizes', () => {
    const items = [item('purchase', '100', '20000'), item('purchase', '50', '25000', 'Nila', '4–6'), item('expense', '0', '300000')];
    const rows = productHpps(items);
    expect(rows).toHaveLength(2);
    expect(rows.map(row => row.hpp?.toString())).toEqual(['22000', '27000']);
    const preview = draftProductHpps(items.filter(i => i.kind === 'purchase'), '300000');
    expect(preview.map(row => row.allocation.toString())).toEqual(['200000', '100000']);
  });

  test('unsized sales do not change the per-size product HPP', () => {
    const purchases = [item('purchase', '100', '20000'), item('purchase', '50', '25000', 'Nila', '4–6'), item('expense', '0', '300000')];
    const before = productHpps(purchases).map(row => row.hpp?.toString());
    const after = productHpps([...purchases, item('sale', '120', '30000', 'Nila', '')]).map(row => row.hpp?.toString());
    expect(after).toEqual(before);
  });

  test('combined reports use weighted totals rather than averaging batch HPP', () => {
    const total = metrics([item('purchase', '100', '20000'), item('sale', '100', '30000'), item('purchase', '300', '40000'), item('sale', '100', '50000')]);
    expect(total.cost.div(total.bought).toString()).toBe('35000');
    expect(total.hpp?.toString()).toBe('70000');
  });

  test('zero weights and incomplete drafts never produce Infinity or NaN', () => {
    expect(productHpps([item('purchase', '0', '20000')])[0]!.hpp).toBeNull();
    expect(draftProductHpps([item('purchase', '0', '20000')], '50000')[0]!.hpp).toBeNull();
    expect(draftProductHpps([item('purchase', '100', '')], '50000')[0]!.hpp).toBeNull();
    expect(weightDifferenceValue([item('expense', '0', '50000')])).toBeNull();
  });

  test('invalid transient form inputs are safe, without mutating stored items', () => {
    for (const value of ['', 'nope', '-12', 'NaN', 'Infinity', undefined, null]) expect(safeDecimal(value).toString()).toBe('0');
    const items = [item('purchase', '100', '20000')];
    const original = JSON.stringify(items);
    metrics(items); productHpps(items); draftProductHpps(items, '50000');
    expect(JSON.stringify(items)).toBe(original);
  });
});
