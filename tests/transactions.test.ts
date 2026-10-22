import { describe, expect, test } from 'bun:test';
import type { Batch, Item, PurchaseDraft } from '../shared/types/workspace';
import {
  buildBatch,
  purchasedProducts,
  replaceTransaction,
  validateBatchDraft,
  validateCatalogProduct,
  validateEntry,
  validateSales,
  validSaleReferences,
} from '../shared/utils/transactions';

const purchase: Item = {
  id: 'p1',
  kind: 'purchase',
  fish: 'Nila',
  size: '8–10',
  weight: '100',
  price: '20000',
  date: '2026-10-22',
  description: '',
};
const sale: Item = { ...purchase, id: 's1', kind: 'sale', size: '', weight: '110', price: '30000' };
const product: PurchaseDraft = { ...purchase, key: 1 };
const form = { origin: ' Lamongan ', date: '2026-10-22' };
const batch: Batch = {
  id: 'b1',
  code: 'PI-0018',
  origin: 'Lamongan',
  date: form.date,
  staff: '',
  destination: '',
  closed: false,
  items: [purchase, sale],
};

describe('transaction domain (no Vue, HTTP, router or browser)', () => {
  test('batch validation requires origin, mandatory purchase size and positive amounts', () => {
    expect(validateBatchDraft(form, [product], [])).toBe('');
    expect(validateBatchDraft({ ...form, origin: ' ' }, [product], [])).not.toBe('');
    expect(validateBatchDraft(form, [], [])).not.toBe('');
    for (const invalid of [{ size: '' }, { weight: 'NaN' }, { weight: '-1' }, { price: '0' }]) {
      expect(validateBatchDraft(form, [{ ...product, ...invalid }], [])).not.toBe('');
    }
  });
  test('expenses are optional and their descriptions are not mandatory', () => {
    expect(
      validateBatchDraft(
        form,
        [product],
        [{ id: 'e1', category: 'BBM', description: '', price: '150000' }],
      ),
    ).toBe('');
    expect(
      validateBatchDraft(
        form,
        [product],
        [{ id: 'e1', category: 'BBM', description: '', price: '0' }],
      ),
    ).not.toBe('');
  });
  test('batch construction keeps stable IDs, removes UI keys, and leaves code allocation to the server', () => {
    const draft = {
      id: 'p1',
      key: 1,
      fish: ' Nila ',
      size: ' 8–10 ',
      weight: '100',
      price: '20000',
    };
    const result = buildBatch(
      'b1',
      form,
      [draft],
      [{ id: 'e1', category: 'BBM', description: ' Nota ', price: '150000' }],
    );
    expect(result.code).toBe('');
    expect(result.origin).toBe('Lamongan');
    expect(result.items[0]).toEqual(purchase);
    expect(result.items[1]).toEqual({
      id: 'e1',
      kind: 'expense',
      fish: 'BBM',
      size: '',
      weight: '0',
      price: '150000',
      description: 'Nota',
      date: form.date,
    });
    expect(draft.fish).toBe(' Nila ');
  });
  test('sale options deduplicate fish/size pairs, never fabricate purchases', () => {
    expect(
      purchasedProducts([purchase, purchase, sale, { ...purchase, id: 'p2', size: '4–6' }]),
    ).toEqual([
      { fish: 'Nila', size: '8–10' },
      { fish: 'Nila', size: '4–6' },
    ]);
  });
  test('sales accept mixed sizes and weight gains, but reject nonexistent purchased products', () => {
    const row = { ...sale, key: 1 };
    expect(validateSales(form.date, [row], [purchase])).toBe('');
    expect(validateSales(form.date, [{ ...row, size: '4–6' }], [purchase])).not.toBe('');
    expect(validateSales(form.date, [{ ...row, fish: 'Lele' }], [purchase])).not.toBe('');
    expect(validateSales(form.date, [{ ...row, weight: '0' }], [purchase])).not.toBe('');
    expect(validateSales('', [row], [purchase])).not.toBe('');
    expect(validateSales(form.date, [], [purchase])).not.toBe('');
  });
  test('purchase size is mandatory; expenses do not require fish weight or size', () => {
    expect(validateEntry({ ...purchase, size: '' }, 'purchase')).not.toBe('');
    expect(validateEntry({ ...purchase, fish: 'BBM', size: '', weight: '' }, 'expense')).toBe('');
    expect(validateEntry({ ...purchase, price: '0' }, 'expense')).not.toBe('');
  });
  test('a linked purchase cannot be removed while sales still reference it', () => {
    expect(validSaleReferences(batch.items)).toBe(true);
    expect(validSaleReferences([sale])).toBe(false);
    expect(validSaleReferences([purchase, { ...sale, size: '4–6' }])).toBe(false);
  });
  test('purchase corrections propose linked-sale changes without mutating the original batch', () => {
    const original = JSON.stringify(batch);
    const replacement = { ...purchase, fish: 'Lele', size: 'Besar' };
    const result = replaceTransaction(batch, replacement);
    expect(result.affected.map((item) => item.id)).toEqual(['s1']);
    expect(validSaleReferences(result.document.items)).toBe(false);
    for (const row of result.affected) {
      row.fish = replacement.fish;
      if (row.size) row.size = replacement.size;
    }
    expect(validSaleReferences(result.document.items)).toBe(true);
    expect(result.affected[0]?.size).toBe('');
    expect(JSON.stringify(batch)).toBe(original);
  });
  test('other purchases keep referenced sales valid without requiring corrections', () => {
    const result = replaceTransaction(
      { ...batch, items: [...batch.items, { ...purchase, id: 'p2' }] },
      { ...purchase, fish: 'Lele' },
    );
    expect(result.affected).toEqual([]);
    expect(validSaleReferences(result.document.items)).toBe(true);
  });
  test('product duplicate checking is case insensitive and excludes the edited record', () => {
    const catalog = [{ id: 'prod1', fish: 'Nila', size: '8–10' }];
    expect(validateCatalogProduct({ fish: ' nila ', size: '8–10' }, catalog, null)).not.toBe('');
    expect(validateCatalogProduct({ fish: ' nila ', size: '8–10' }, catalog, 'prod1')).toBe('');
    expect(validateCatalogProduct({ fish: 'Nila', size: '4–6' }, catalog, null)).toBe('');
  });
});
